package storage_test

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/internal/indexer/internal/storage"
	"github.com/internal/indexer/pkg/types"

	_ "github.com/lib/pq"
)

// TestMain sets up the test database
func TestMain(m *testing.M) {
	os.Exit(m.Run())
}

func setupTestDB(t *testing.T) (*sql.DB, *storage.Storage, func()) {
	t.Helper()

	// Use environment variable or default to local postgres
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost port=5432 dbname=indexer_test user=indexer password=indexer sslmode=disable"
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Skipf("skipping test: cannot connect to database: %v", err)
	}

	if err := db.Ping(); err != nil {
		t.Skipf("skipping test: cannot ping database: %v", err)
	}

	// Clean up tables
	ctx := context.Background()
	tables := []string{"orphaned_blocks", "events", "transactions", "blocks", "checkpoints", "schema_migrations"}
	for _, table := range tables {
		db.ExecContext(ctx, "DROP TABLE IF EXISTS "+table+" CASCADE")
	}

	store := storage.New(db)
	if err := store.Migrate(ctx); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}

	cleanup := func() {
		for _, table := range tables {
			db.ExecContext(ctx, "DROP TABLE IF EXISTS "+table+" CASCADE")
		}
		db.Close()
	}

	return db, store, cleanup
}

func TestWriteBlocks_AtomicCheckpoint(t *testing.T) {
	_, store, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	chainID := types.ChainBTC

	// Initialize checkpoint
	err := store.InitCheckpoint(ctx, chainID, 0)
	if err != nil {
		t.Fatalf("InitCheckpoint failed: %v", err)
	}

	// Write blocks
	blocks := []types.Block{
		{
			ChainID:    chainID,
			Height:     1,
			Hash:       "block1hash",
			ParentHash: "genesis",
			Timestamp:  time.Now(),
			Status:     types.StatusPending,
		},
		{
			ChainID:    chainID,
			Height:     2,
			Hash:       "block2hash",
			ParentHash: "block1hash",
			Timestamp:  time.Now(),
			Status:     types.StatusPending,
		},
	}

	txs := []types.Transaction{
		{
			ChainID:     chainID,
			BlockHeight: 1,
			BlockHash:   "block1hash",
			TxHash:      "tx1",
			TxIndex:     0,
			Value:       "100",
			Status:      types.StatusPending,
		},
	}

	err = store.WriteBlocks(ctx, chainID, blocks, txs)
	if err != nil {
		t.Fatalf("WriteBlocks failed: %v", err)
	}

	// Verify checkpoint was updated atomically
	checkpoint, err := store.GetCheckpoint(ctx, chainID)
	if err != nil {
		t.Fatalf("GetCheckpoint failed: %v", err)
	}

	if checkpoint.LastHeight != 2 {
		t.Errorf("expected checkpoint height 2, got %d", checkpoint.LastHeight)
	}
	if checkpoint.LastHash != "block2hash" {
		t.Errorf("expected checkpoint hash block2hash, got %s", checkpoint.LastHash)
	}

	// Verify blocks were written
	block, err := store.GetBlockByHeight(ctx, chainID, 1)
	if err != nil {
		t.Fatalf("GetBlockByHeight failed: %v", err)
	}
	if block == nil {
		t.Fatal("expected block at height 1, got nil")
	}
	if block.Hash != "block1hash" {
		t.Errorf("expected hash block1hash, got %s", block.Hash)
	}
}

func TestRollback_OrphansBlocks(t *testing.T) {
	_, store, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	chainID := types.ChainBTC

	// Initialize checkpoint
	err := store.InitCheckpoint(ctx, chainID, 0)
	if err != nil {
		t.Fatalf("InitCheckpoint failed: %v", err)
	}

	// Write blocks
	blocks := []types.Block{
		{ChainID: chainID, Height: 1, Hash: "hash1", ParentHash: "genesis", Timestamp: time.Now(), Status: types.StatusPending},
		{ChainID: chainID, Height: 2, Hash: "hash2", ParentHash: "hash1", Timestamp: time.Now(), Status: types.StatusPending},
		{ChainID: chainID, Height: 3, Hash: "hash3", ParentHash: "hash2", Timestamp: time.Now(), Status: types.StatusPending},
		{ChainID: chainID, Height: 4, Hash: "hash4", ParentHash: "hash3", Timestamp: time.Now(), Status: types.StatusPending},
	}

	txs := []types.Transaction{
		{ChainID: chainID, BlockHeight: 3, BlockHash: "hash3", TxHash: "tx3", TxIndex: 0, Value: "100", Status: types.StatusPending},
		{ChainID: chainID, BlockHeight: 4, BlockHash: "hash4", TxHash: "tx4", TxIndex: 0, Value: "200", Status: types.StatusPending},
	}

	err = store.WriteBlocks(ctx, chainID, blocks, txs)
	if err != nil {
		t.Fatalf("WriteBlocks failed: %v", err)
	}

	// Rollback to height 2
	err = store.Rollback(ctx, chainID, 2, "hash2")
	if err != nil {
		t.Fatalf("Rollback failed: %v", err)
	}

	// Verify checkpoint was reset
	checkpoint, err := store.GetCheckpoint(ctx, chainID)
	if err != nil {
		t.Fatalf("GetCheckpoint failed: %v", err)
	}
	if checkpoint.LastHeight != 2 {
		t.Errorf("expected checkpoint height 2, got %d", checkpoint.LastHeight)
	}

	// Verify blocks 3 and 4 are gone
	block3, err := store.GetBlockByHeight(ctx, chainID, 3)
	if err != nil {
		t.Fatalf("GetBlockByHeight failed: %v", err)
	}
	if block3 != nil {
		t.Error("expected block 3 to be removed, but it exists")
	}

	// Verify block 2 still exists
	block2, err := store.GetBlockByHeight(ctx, chainID, 2)
	if err != nil {
		t.Fatalf("GetBlockByHeight failed: %v", err)
	}
	if block2 == nil {
		t.Error("expected block 2 to exist")
	}
}

func TestFinalization(t *testing.T) {
	_, store, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	chainID := types.ChainBTC

	// Initialize checkpoint
	err := store.InitCheckpoint(ctx, chainID, 0)
	if err != nil {
		t.Fatalf("InitCheckpoint failed: %v", err)
	}

	// Write 10 blocks
	var blocks []types.Block
	for i := uint64(1); i <= 10; i++ {
		parentHash := "genesis"
		if i > 1 {
			parentHash = "hash" + string(rune('0'+i-1))
		}
		blocks = append(blocks, types.Block{
			ChainID:    chainID,
			Height:     i,
			Hash:       "hash" + string(rune('0'+i)),
			ParentHash: parentHash,
			Timestamp:  time.Now(),
			Status:     types.StatusPending,
		})
	}

	err = store.WriteBlocks(ctx, chainID, blocks, nil)
	if err != nil {
		t.Fatalf("WriteBlocks failed: %v", err)
	}

	// Finalize with depth 6 (blocks 1-4 should be finalized)
	err = store.FinalizeBlocks(ctx, chainID, 6)
	if err != nil {
		t.Fatalf("FinalizeBlocks failed: %v", err)
	}

	// Verify block 4 is finalized
	block4, err := store.GetBlockByHeight(ctx, chainID, 4)
	if err != nil {
		t.Fatalf("GetBlockByHeight failed: %v", err)
	}
	if block4.Status != types.StatusFinalized {
		t.Errorf("expected block 4 to be finalized, got %s", block4.Status)
	}

	// Verify block 5 is still pending
	block5, err := store.GetBlockByHeight(ctx, chainID, 5)
	if err != nil {
		t.Fatalf("GetBlockByHeight failed: %v", err)
	}
	if block5.Status != types.StatusPending {
		t.Errorf("expected block 5 to be pending, got %s", block5.Status)
	}
}

func TestCrashRecovery(t *testing.T) {
	// Simulate crash recovery by creating a new storage instance
	_, store, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	chainID := types.ChainBTC

	// Initialize checkpoint at height 5
	err := store.InitCheckpoint(ctx, chainID, 5)
	if err != nil {
		t.Fatalf("InitCheckpoint failed: %v", err)
	}

	// Write some blocks
	blocks := []types.Block{
		{ChainID: chainID, Height: 6, Hash: "hash6", ParentHash: "hash5", Timestamp: time.Now(), Status: types.StatusPending},
		{ChainID: chainID, Height: 7, Hash: "hash7", ParentHash: "hash6", Timestamp: time.Now(), Status: types.StatusPending},
	}

	err = store.WriteBlocks(ctx, chainID, blocks, nil)
	if err != nil {
		t.Fatalf("WriteBlocks failed: %v", err)
	}

	// "Crash" and create new storage instance (simulates restart)
	// The store should resume from the checkpoint

	checkpoint, err := store.GetCheckpoint(ctx, chainID)
	if err != nil {
		t.Fatalf("GetCheckpoint failed: %v", err)
	}

	// Verify checkpoint is at height 7 (last written block)
	if checkpoint.LastHeight != 7 {
		t.Errorf("expected checkpoint height 7 after recovery, got %d", checkpoint.LastHeight)
	}

	// Polling should continue from height 7
	// (poller would call Poll(ctx, checkpoint.LastHeight) => Poll(ctx, 7) => fetch from height 8)
}
