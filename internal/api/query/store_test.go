package query

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/internal/indexer/pkg/types"
)

func TestGetLatestBlock(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}
	defer db.Close()

	store := &PostgresStore{db: db}

	chainID := types.ChainBTC
	now := time.Now()

	rows := sqlmock.NewRows([]string{"chain_id", "height", "hash", "parent_hash", "timestamp", "status", "raw_data"}).
		AddRow("btc", 100, "hash123", "hash122", now, "finalized", []byte("{}"))

	mock.ExpectQuery("^SELECT (.+) FROM blocks WHERE chain_id = \\$1 ORDER BY height DESC LIMIT 1$").
		WithArgs(chainID).
		WillReturnRows(rows)

	ctx := context.Background()
	block, err := store.GetLatestBlock(ctx, chainID)

	if err != nil {
		t.Errorf("error was not expected while updating stats: %s", err)
	}

	if block == nil {
		t.Errorf("expected block, got nil")
	}

	if block.Height != 100 {
		t.Errorf("expected height 100, got %d", block.Height)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestGetTransactionsByBlock(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}
	defer db.Close()

	store := &PostgresStore{db: db}

	chainID := types.ChainETH
	blockID := "100" // Height

	rows := sqlmock.NewRows([]string{
		"chain_id", "block_height", "block_hash", "tx_hash", "from_addr", "to_addr",
		"value", "fee", "gas_used", "status", "raw_data", "tx_index",
	}).AddRow(
		"eth", 100, "hash100", "tx1", "from1", "to1", "1000", "21000", 21000, "finalized", []byte("{}"), 0,
	)

	// Expect query for height
	mock.ExpectQuery("^SELECT (.+) FROM transactions WHERE chain_id = \\$1 AND block_height = \\$2 ORDER BY tx_index ASC LIMIT \\$3$").
		WithArgs(chainID, blockID, 25).
		WillReturnRows(rows)

	ctx := context.Background()
	txs, _, err := store.GetTransactionsByBlock(ctx, chainID, blockID, "", 25)

	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}
	if len(txs) != 1 {
		t.Errorf("expected 1 tx, got %d", len(txs))
	}
	if txs[0].TxHash != "tx1" {
		t.Errorf("expected tx1, got %s", txs[0].TxHash)
	}
}

func TestGetNetworkStats(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}
	defer db.Close()

	store := &PostgresStore{db: db}
	chainID := types.ChainBTC

	// 1. Max height
	mock.ExpectQuery("SELECT COALESCE\\(MAX\\(height\\), 0\\) FROM blocks").
		WithArgs(chainID).
		WillReturnRows(sqlmock.NewRows([]string{"max"}).AddRow(1000))

	// 2. Latest time (for lag)
	now := time.Now()
	mock.ExpectQuery("SELECT timestamp FROM blocks").
		WithArgs(chainID, 1000).
		WillReturnRows(sqlmock.NewRows([]string{"timestamp"}).AddRow(now))

	// 3. Blocks last minute
	mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM blocks").
		WithArgs(chainID, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))

	// 4. Txs last minute
	mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM transactions").
		WithArgs(chainID, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(50))

	// 5. Avg block time
	t1 := now
	t2 := now.Add(-10 * time.Minute)
	mock.ExpectQuery("SELECT timestamp FROM blocks").WithArgs(chainID, 1000).WillReturnRows(sqlmock.NewRows([]string{"timestamp"}).AddRow(t1))
	mock.ExpectQuery("SELECT timestamp FROM blocks").WithArgs(chainID, 900).WillReturnRows(sqlmock.NewRows([]string{"timestamp"}).AddRow(t2))

	ctx := context.Background()
	stats, err := store.GetNetworkStats(ctx, chainID)
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	if stats.LatestHeight != 1000 {
		t.Errorf("expected height 1000, got %d", stats.LatestHeight)
	}
	if stats.BlocksLastMinute != 5 {
		t.Errorf("expected 5 blocks, got %d", stats.BlocksLastMinute)
	}
}
