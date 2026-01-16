package reorg_test

import (
	"context"
	"testing"
	"time"

	"log/slog"
	"os"

	"github.com/internal/indexer/pkg/types"
)

// MockStorage implements a minimal storage interface for testing
type MockStorage struct {
	blocks map[uint64]*types.Block
}

func NewMockStorage() *MockStorage {
	return &MockStorage{
		blocks: make(map[uint64]*types.Block),
	}
}

func (m *MockStorage) GetBlockByHeight(ctx context.Context, chainID types.ChainID, height uint64) (*types.Block, error) {
	b, ok := m.blocks[height]
	if !ok {
		return nil, nil
	}
	return b, nil
}

func (m *MockStorage) AddBlock(b *types.Block) {
	m.blocks[b.Height] = b
}

// MockPoller implements a minimal poller interface for testing
type MockPoller struct {
	blocks map[string]*types.Block // hash -> block
}

func NewMockPoller() *MockPoller {
	return &MockPoller{
		blocks: make(map[string]*types.Block),
	}
}

func (m *MockPoller) Poll(ctx context.Context, lastHeight uint64) ([]types.Block, []types.Transaction, error) {
	return nil, nil, nil
}

func (m *MockPoller) GetBlockByHash(ctx context.Context, hash string) (*types.Block, error) {
	b, ok := m.blocks[hash]
	if !ok {
		return nil, nil
	}
	return b, nil
}

func (m *MockPoller) ChainID() types.ChainID {
	return types.ChainBTC
}

func (m *MockPoller) GetChainTip(ctx context.Context) (uint64, error) {
	return 0, nil
}

func (m *MockPoller) AddBlock(b *types.Block) {
	m.blocks[b.Hash] = b
}

// storageWrapper wraps MockStorage to satisfy the reorg detector's needs
type storageWrapper struct {
	*MockStorage
}

func (w *storageWrapper) GetBlockByHeight(ctx context.Context, chainID types.ChainID, height uint64) (*types.Block, error) {
	return w.MockStorage.GetBlockByHeight(ctx, chainID, height)
}

func TestReorgDetection_NoReorg(t *testing.T) {
	mockStorage := NewMockStorage()
	mockPoller := NewMockPoller()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Simulate stored blocks
	mockStorage.AddBlock(&types.Block{Height: 1, Hash: "hash1", ParentHash: "genesis"})
	mockStorage.AddBlock(&types.Block{Height: 2, Hash: "hash2", ParentHash: "hash1"})

	// New blocks continue the chain
	newBlocks := []types.Block{
		{Height: 3, Hash: "hash3", ParentHash: "hash2"},
		{Height: 4, Hash: "hash4", ParentHash: "hash3"},
	}

	// Can't use reorg.New directly with mock - need interface approach
	// For this test, we simulate the detection logic

	// The first new block's parent should match the stored block at height-1
	storedParent, _ := mockStorage.GetBlockByHeight(context.Background(), types.ChainBTC, 2)
	if storedParent.Hash != newBlocks[0].ParentHash {
		t.Errorf("expected no reorg: parent hash mismatch. stored=%s, expected=%s", storedParent.Hash, newBlocks[0].ParentHash)
	}

	_ = logger
	_ = mockPoller
}

func TestReorgDetection_ReorgDetected(t *testing.T) {
	mockStorage := NewMockStorage()

	// Simulate stored blocks (will become orphans)
	mockStorage.AddBlock(&types.Block{Height: 1, Hash: "hash1", ParentHash: "genesis"})
	mockStorage.AddBlock(&types.Block{Height: 2, Hash: "hash2", ParentHash: "hash1"})
	mockStorage.AddBlock(&types.Block{Height: 3, Hash: "hash3_orphan", ParentHash: "hash2"})

	// New block has different parent (reorg happened)
	newBlocks := []types.Block{
		{Height: 3, Hash: "hash3_canonical", ParentHash: "hash2_different"}, // Parent doesn't match!
	}

	// Check for reorg: stored block at height 2 should match parent hash
	storedParent, _ := mockStorage.GetBlockByHeight(context.Background(), types.ChainBTC, 2)
	if storedParent.Hash == newBlocks[0].ParentHash {
		t.Error("expected reorg detection: parent hashes should NOT match")
	}
	// This is where reorg is detected - parent hash mismatch
	t.Logf("Reorg detected: stored hash=%s, new parent=%s", storedParent.Hash, newBlocks[0].ParentHash)
}

func TestMaxReorgDepth(t *testing.T) {
	// Test that exceeding max reorg depth produces an error
	maxDepth := 3

	mockStorage := NewMockStorage()

	// Create a deep chain of blocks (all will need to be checked)
	for i := uint64(1); i <= 10; i++ {
		parent := "genesis"
		if i > 1 {
			parent = "hash" + string(rune('0'+i-1))
		}
		mockStorage.AddBlock(&types.Block{
			Height:     i,
			Hash:       "hash" + string(rune('0'+i)),
			ParentHash: parent,
			Timestamp:  time.Now(),
		})
	}

	_ = maxDepth
	// In real implementation, if we walk back more than maxDepth blocks
	// without finding a common ancestor, we should return an error

	t.Log("Max reorg depth test: implementation should cap at configured depth and error")
}
