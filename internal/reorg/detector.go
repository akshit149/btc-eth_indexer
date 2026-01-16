package reorg

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/internal/indexer/internal/poller"
	"github.com/internal/indexer/internal/storage"
	"github.com/internal/indexer/pkg/types"
)

// Detector handles chain reorganization detection
type Detector struct {
	storage  *storage.Storage
	maxDepth int
	logger   *slog.Logger
}

// ReorgResult contains the result of reorg detection
type ReorgResult struct {
	Detected       bool
	RollbackHeight uint64
	RollbackHash   string
	Depth          int
}

// New creates a new reorg detector
func New(storage *storage.Storage, maxDepth int, logger *slog.Logger) *Detector {
	return &Detector{
		storage:  storage,
		maxDepth: maxDepth,
		logger:   logger,
	}
}

// Detect checks if a reorg has occurred by comparing parent hashes
// Returns the height to rollback to if reorg detected, or 0 if no reorg
func (d *Detector) Detect(
	ctx context.Context,
	chainID types.ChainID,
	chainPoller poller.ChainPoller,
	newBlocks []types.Block,
) (*ReorgResult, error) {
	if len(newBlocks) == 0 {
		return &ReorgResult{Detected: false}, nil
	}

	firstNewBlock := newBlocks[0]

	// If this is the first block we're indexing, no reorg possible
	if firstNewBlock.Height == 0 {
		return &ReorgResult{Detected: false}, nil
	}

	// Get the stored block at height-1 (should be parent)
	storedParent, err := d.storage.GetBlockByHeight(ctx, chainID, firstNewBlock.Height-1)
	if err != nil {
		return nil, fmt.Errorf("getting stored parent block: %w", err)
	}

	// If no stored parent, we're starting fresh
	if storedParent == nil {
		return &ReorgResult{Detected: false}, nil
	}

	// Check if parent hashes match
	if storedParent.Hash == firstNewBlock.ParentHash {
		return &ReorgResult{Detected: false}, nil
	}

	// Reorg detected - walk back to find common ancestor
	d.logger.Warn("reorg detected",
		"chain", chainID,
		"stored_hash", storedParent.Hash,
		"expected_parent", firstNewBlock.ParentHash,
		"height", firstNewBlock.Height-1,
	)

	return d.findForkPoint(ctx, chainID, chainPoller, storedParent.Height)
}

func (d *Detector) findForkPoint(
	ctx context.Context,
	chainID types.ChainID,
	chainPoller poller.ChainPoller,
	startHeight uint64,
) (*ReorgResult, error) {
	depth := 0

	for height := startHeight; height > 0 && depth < d.maxDepth; height-- {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		depth++

		// Get stored block at this height
		storedBlock, err := d.storage.GetBlockByHeight(ctx, chainID, height)
		if err != nil {
			return nil, fmt.Errorf("getting stored block at %d: %w", height, err)
		}
		if storedBlock == nil {
			// No stored block, this is our starting point
			return &ReorgResult{
				Detected:       true,
				RollbackHeight: height,
				RollbackHash:   "",
				Depth:          depth,
			}, nil
		}

		// Get block from chain at same height
		chainBlock, err := chainPoller.GetBlockByHash(ctx, storedBlock.Hash)
		if err != nil {
			// Block not found on chain - it's orphaned, continue walking back
			d.logger.Debug("block not found on chain",
				"chain", chainID,
				"height", height,
				"hash", storedBlock.Hash,
			)
			continue
		}

		// Check if the chain still has this block (meaning it's in canonical chain)
		if chainBlock != nil && chainBlock.Hash == storedBlock.Hash {
			// Found common ancestor
			d.logger.Info("found fork point",
				"chain", chainID,
				"height", height,
				"hash", storedBlock.Hash,
				"depth", depth,
			)
			return &ReorgResult{
				Detected:       true,
				RollbackHeight: height,
				RollbackHash:   storedBlock.Hash,
				Depth:          depth,
			}, nil
		}
	}

	// Exceeded max depth - this is a P1 situation
	d.logger.Error("CRITICAL: reorg depth exceeded maximum",
		"chain", chainID,
		"max_depth", d.maxDepth,
		"start_height", startHeight,
	)

	return &ReorgResult{
		Detected:       true,
		RollbackHeight: startHeight - uint64(d.maxDepth),
		RollbackHash:   "",
		Depth:          d.maxDepth,
	}, fmt.Errorf("reorg depth %d exceeds maximum %d - manual intervention required", depth, d.maxDepth)
}
