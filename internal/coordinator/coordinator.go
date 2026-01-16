package coordinator

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/internal/indexer/internal/config"
	"github.com/internal/indexer/internal/poller"
	"github.com/internal/indexer/internal/reorg"
	"github.com/internal/indexer/internal/storage"
	"github.com/internal/indexer/pkg/types"
)

// MetricsSnapshot is a point-in-time copy of metrics (no mutex, safe to copy)
type MetricsSnapshot struct {
	LastIndexedHeight  uint64
	LastIndexedAt      time.Time
	LastPollDuration   time.Duration
	TotalBlocksIndexed uint64
	TotalPollErrors    uint64
	TotalReorgs        uint64
	LastReorgDepth     int
}

// Coordinator orchestrates the indexing loop for a chain
type Coordinator struct {
	chainID       types.ChainID
	chainConfig   config.ChainConfig
	poller        poller.ChainPoller
	storage       *storage.Storage
	reorgDetector *reorg.Detector
	logger        *slog.Logger

	// Backpressure: semaphore to limit concurrent DB writes
	writeSem chan struct{}

	// Metrics (protected by metricsMu)
	metricsMu          sync.RWMutex
	lastIndexedHeight  uint64
	lastIndexedAt      time.Time
	lastPollDuration   time.Duration
	totalBlocksIndexed uint64
	totalPollErrors    uint64
	totalReorgs        uint64
	lastReorgDepth     int

	// Shutdown
	stopCh   chan struct{}
	stopOnce sync.Once
}

// New creates a new coordinator for a chain
func New(
	chainID types.ChainID,
	chainConfig config.ChainConfig,
	chainPoller poller.ChainPoller,
	store *storage.Storage,
	detector *reorg.Detector,
	logger *slog.Logger,
) *Coordinator {
	return &Coordinator{
		chainID:       chainID,
		chainConfig:   chainConfig,
		poller:        chainPoller,
		storage:       store,
		reorgDetector: detector,
		logger:        logger.With("chain", string(chainID)),
		writeSem:      make(chan struct{}, 1), // Single writer
		stopCh:        make(chan struct{}),
	}
}

// GetMetrics returns a snapshot of current metrics (thread-safe)
func (c *Coordinator) GetMetrics() MetricsSnapshot {
	c.metricsMu.RLock()
	defer c.metricsMu.RUnlock()
	return MetricsSnapshot{
		LastIndexedHeight:  c.lastIndexedHeight,
		LastIndexedAt:      c.lastIndexedAt,
		LastPollDuration:   c.lastPollDuration,
		TotalBlocksIndexed: c.totalBlocksIndexed,
		TotalPollErrors:    c.totalPollErrors,
		TotalReorgs:        c.totalReorgs,
		LastReorgDepth:     c.lastReorgDepth,
	}
}

// Run starts the indexing loop (blocking)
func (c *Coordinator) Run(ctx context.Context) error {
	c.logger.Info("starting coordinator",
		"poll_interval", c.chainConfig.PollInterval,
		"batch_size", c.chainConfig.BatchSize,
		"confirmation_depth", c.chainConfig.ConfirmationDepth,
	)

	// Initialize checkpoint if needed
	if err := c.storage.InitCheckpoint(ctx, c.chainID, c.chainConfig.StartHeight); err != nil {
		return fmt.Errorf("initializing checkpoint: %w", err)
	}

	ticker := time.NewTicker(c.chainConfig.PollInterval)
	defer ticker.Stop()

	// Run first poll immediately
	if err := c.poll(ctx); err != nil {
		c.logger.Error("poll failed", "error", err)
	}

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("coordinator stopping due to context cancellation")
			return ctx.Err()
		case <-c.stopCh:
			c.logger.Info("coordinator stopping due to stop signal")
			return nil
		case <-ticker.C:
			if err := c.poll(ctx); err != nil {
				c.logger.Error("poll failed", "error", err)
				c.metricsMu.Lock()
				c.totalPollErrors++
				c.metricsMu.Unlock()
			}
		}
	}
}

// Stop signals the coordinator to stop
func (c *Coordinator) Stop() {
	c.stopOnce.Do(func() {
		close(c.stopCh)
	})
}

func (c *Coordinator) poll(ctx context.Context) error {
	startTime := time.Now()

	// Get current checkpoint
	checkpoint, err := c.storage.GetCheckpoint(ctx, c.chainID)
	if err != nil {
		return fmt.Errorf("getting checkpoint: %w", err)
	}

	var lastHeight uint64
	if checkpoint != nil {
		lastHeight = checkpoint.LastHeight
	} else {
		lastHeight = c.chainConfig.StartHeight
	}

	// Poll for new blocks (and optionally events)
	var blocks []types.Block
	var txs []types.Transaction
	var events []types.Event

	// Check if poller supports events (type assertion pattern)
	if eventPoller, ok := c.poller.(poller.EventCapablePoller); ok {
		var err error
		blocks, txs, events, err = eventPoller.PollWithEvents(ctx, lastHeight)
		if err != nil {
			return fmt.Errorf("polling blocks with events: %w", err)
		}
	} else {
		var err error
		blocks, txs, err = c.poller.Poll(ctx, lastHeight)
		if err != nil {
			return fmt.Errorf("polling blocks: %w", err)
		}
	}

	if len(blocks) == 0 {
		c.logger.Debug("no new blocks")
		return nil
	}

	c.logger.Debug("fetched blocks",
		"count", len(blocks),
		"from", blocks[0].Height,
		"to", blocks[len(blocks)-1].Height,
		"events", len(events),
	)

	// Check for reorg
	reorgResult, err := c.reorgDetector.Detect(ctx, c.chainID, c.poller, blocks)
	if err != nil {
		// Check if it's a critical reorg depth error
		c.logger.Error("reorg detection error", "error", err)
		return fmt.Errorf("reorg detection: %w", err)
	}

	if reorgResult.Detected {
		c.logger.Warn("handling reorg",
			"rollback_height", reorgResult.RollbackHeight,
			"depth", reorgResult.Depth,
		)

		c.metricsMu.Lock()
		c.totalReorgs++
		c.lastReorgDepth = reorgResult.Depth
		c.metricsMu.Unlock()

		// Acquire write semaphore for rollback
		select {
		case c.writeSem <- struct{}{}:
			defer func() { <-c.writeSem }()
		case <-ctx.Done():
			return ctx.Err()
		}

		if err := c.storage.Rollback(ctx, c.chainID, reorgResult.RollbackHeight, reorgResult.RollbackHash); err != nil {
			return fmt.Errorf("rolling back: %w", err)
		}

		// Re-poll from rollback point (will happen on next tick)
		return nil
	}

	// Acquire write semaphore
	select {
	case c.writeSem <- struct{}{}:
		defer func() { <-c.writeSem }()
	case <-ctx.Done():
		return ctx.Err()
	}

	// Write blocks atomically with checkpoint
	if len(events) > 0 {
		if err := c.storage.WriteBlocksWithEvents(ctx, c.chainID, blocks, txs, events); err != nil {
			return fmt.Errorf("writing blocks with events: %w", err)
		}
	} else {
		if err := c.storage.WriteBlocks(ctx, c.chainID, blocks, txs); err != nil {
			return fmt.Errorf("writing blocks: %w", err)
		}
	}

	// Finalize old blocks
	if err := c.storage.FinalizeBlocks(ctx, c.chainID, c.chainConfig.ConfirmationDepth); err != nil {
		c.logger.Warn("finalization failed", "error", err)
		// Non-fatal, continue
	}

	// Update metrics
	lastBlock := blocks[len(blocks)-1]
	pollDuration := time.Since(startTime)

	c.metricsMu.Lock()
	c.lastIndexedHeight = lastBlock.Height
	c.lastIndexedAt = time.Now()
	c.lastPollDuration = pollDuration
	c.totalBlocksIndexed += uint64(len(blocks))
	c.metricsMu.Unlock()

	c.logger.Info("indexed blocks",
		"count", len(blocks),
		"latest_height", lastBlock.Height,
		"txs", len(txs),
		"duration", pollDuration,
	)

	return nil
}
