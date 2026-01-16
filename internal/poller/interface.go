package poller

import (
	"context"

	"github.com/internal/indexer/pkg/types"
)

// ChainPoller defines the interface for fetching blocks from a chain
type ChainPoller interface {
	// Poll fetches blocks from lastHeight+1 to chain tip (up to batch limit)
	// Returns blocks in ascending order by height
	Poll(ctx context.Context, lastHeight uint64) ([]types.Block, []types.Transaction, error)

	// GetBlockByHash fetches a specific block by hash (for reorg verification)
	GetBlockByHash(ctx context.Context, hash string) (*types.Block, error)

	// ChainID returns the chain identifier
	ChainID() types.ChainID

	// GetChainTip returns the current chain height
	GetChainTip(ctx context.Context) (uint64, error)
}

// EventCapablePoller is an interface for pollers that can fetch events
type EventCapablePoller interface {
	PollWithEvents(ctx context.Context, lastHeight uint64) ([]types.Block, []types.Transaction, []types.Event, []types.Contract, []types.Token, []types.TokenTransfer, error)
}
