package storage

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/internal/indexer/pkg/types"
	"github.com/lib/pq"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Storage handles all database operations for the indexer
type Storage struct {
	db *sql.DB
}

// New creates a new Storage instance
func New(db *sql.DB) *Storage {
	return &Storage{db: db}
}

// Migrate runs all pending migrations
func (s *Storage) Migrate(ctx context.Context) error {
	// Acquire advisory lock to prevent concurrent migrations
	const lockID = 7777777
	if _, err := s.db.ExecContext(ctx, `SELECT pg_advisory_lock($1)`, lockID); err != nil {
		return fmt.Errorf("acquiring migration lock: %w", err)
	}
	defer s.db.ExecContext(ctx, `SELECT pg_advisory_unlock($1)`, lockID)

	// Create migrations table if not exists
	_, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("creating migrations table: %w", err)
	}

	// Get current version
	var currentVersion int
	err = s.db.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(version), 0) FROM schema_migrations
	`).Scan(&currentVersion)
	if err != nil {
		return fmt.Errorf("getting current migration version: %w", err)
	}

	// Read and apply migrations
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("reading migrations directory: %w", err)
	}

	// Sort migrations to ensure deterministic order
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		// Parse version from filename (e.g., 001_initial_schema.up.sql)
		var version int
		var direction string
		n, _ := fmt.Sscanf(entry.Name(), "%03d_%s", &version, &direction)
		if n < 1 {
			continue
		}

		// Only apply "up" migrations that haven't been applied
		if version <= currentVersion {
			continue
		}

		// Skip down migrations - only process .up.sql files
		if !strings.HasSuffix(entry.Name(), ".up.sql") {
			continue
		}

		content, err := migrationsFS.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return fmt.Errorf("reading migration %s: %w", entry.Name(), err)
		}

		tx, err := s.db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("beginning transaction for migration %d: %w", version, err)
		}

		if _, err := tx.ExecContext(ctx, string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("applying migration %d: %w", version, err)
		}

		if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`, version); err != nil {
			tx.Rollback()
			return fmt.Errorf("recording migration %d: %w", version, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("committing migration %d: %w", version, err)
		}

		// Update current version locally
		currentVersion = version
	}

	return nil
}

// GetCheckpoint returns the last indexed checkpoint for a chain
func (s *Storage) GetCheckpoint(ctx context.Context, chainID types.ChainID) (*types.Checkpoint, error) {
	var cp types.Checkpoint
	err := s.db.QueryRowContext(ctx, `
		SELECT chain_id, last_height, last_hash, updated_at
		FROM checkpoints
		WHERE chain_id = $1
	`, string(chainID)).Scan(&cp.ChainID, &cp.LastHeight, &cp.LastHash, &cp.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("querying checkpoint: %w", err)
	}

	return &cp, nil
}

// toNullableNumeric converts empty strings to SQL NULL
func toNullableNumeric(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// WriteBlocks atomically writes blocks, transactions, and updates checkpoint
func (s *Storage) WriteBlocks(ctx context.Context, chainID types.ChainID, blocks []types.Block, txs []types.Transaction) error {
	if len(blocks) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert blocks
	blockStmt, err := tx.PrepareContext(ctx, pq.CopyIn(
		"blocks",
		"chain_id", "height", "hash", "parent_hash", "timestamp", "status", "raw_data",
	))
	if err != nil {
		return fmt.Errorf("preparing block insert: %w", err)
	}

	for _, b := range blocks {
		_, err := blockStmt.ExecContext(ctx,
			string(b.ChainID), b.Height, b.Hash, b.ParentHash, b.Timestamp, string(b.Status), string(b.RawData),
		)
		if err != nil {
			blockStmt.Close()
			return fmt.Errorf("inserting block %d: %w", b.Height, err)
		}
	}

	if _, err := blockStmt.ExecContext(ctx); err != nil {
		blockStmt.Close()
		return fmt.Errorf("flushing block inserts: %w", err)
	}
	blockStmt.Close()

	// Insert transactions
	if len(txs) > 0 {
		txStmt, err := tx.PrepareContext(ctx, pq.CopyIn(
			"transactions",
			"chain_id", "block_height", "block_hash", "tx_hash", "tx_index",
			"from_addr", "to_addr", "value", "fee", "gas_used", "status", "raw_data",
		))
		if err != nil {
			return fmt.Errorf("preparing tx insert: %w", err)
		}

		for _, t := range txs {
			var fromAddr, toAddr interface{}
			if t.FromAddr != "" {
				fromAddr = t.FromAddr
			}
			if t.ToAddr != "" {
				toAddr = t.ToAddr
			}

			_, err := txStmt.ExecContext(ctx,
				string(t.ChainID), t.BlockHeight, t.BlockHash, t.TxHash, t.TxIndex,
				fromAddr, toAddr, toNullableNumeric(t.Value), toNullableNumeric(t.Fee), t.GasUsed, string(t.Status), string(t.RawData),
			)
			if err != nil {
				txStmt.Close()
				return fmt.Errorf("inserting tx %s: %w", t.TxHash, err)
			}
		}

		if _, err := txStmt.ExecContext(ctx); err != nil {
			txStmt.Close()
			return fmt.Errorf("flushing tx inserts: %w", err)
		}
		txStmt.Close()
	}

	// Update or insert checkpoint
	lastBlock := blocks[len(blocks)-1]
	_, err = tx.ExecContext(ctx, `
		INSERT INTO checkpoints (chain_id, last_height, last_hash, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (chain_id) DO UPDATE SET
			last_height = EXCLUDED.last_height,
			last_hash = EXCLUDED.last_hash,
			updated_at = EXCLUDED.updated_at
	`, string(chainID), lastBlock.Height, lastBlock.Hash, time.Now())
	if err != nil {
		return fmt.Errorf("updating checkpoint: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}

	return nil
}

// WriteBlocksWithEvents atomically writes blocks, transactions, events, and updates checkpoint
func (s *Storage) WriteBlocksWithEvents(ctx context.Context, chainID types.ChainID, blocks []types.Block, txs []types.Transaction, events []types.Event) error {
	if len(blocks) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert blocks
	blockStmt, err := tx.PrepareContext(ctx, pq.CopyIn(
		"blocks",
		"chain_id", "height", "hash", "parent_hash", "timestamp", "status", "raw_data",
	))
	if err != nil {
		return fmt.Errorf("preparing block insert: %w", err)
	}

	for _, b := range blocks {
		_, err := blockStmt.ExecContext(ctx,
			string(b.ChainID), b.Height, b.Hash, b.ParentHash, b.Timestamp, string(b.Status), string(b.RawData),
		)
		if err != nil {
			blockStmt.Close()
			return fmt.Errorf("inserting block %d: %w", b.Height, err)
		}
	}

	if _, err := blockStmt.ExecContext(ctx); err != nil {
		blockStmt.Close()
		return fmt.Errorf("flushing block inserts: %w", err)
	}
	blockStmt.Close()

	// Insert transactions
	if len(txs) > 0 {
		txStmt, err := tx.PrepareContext(ctx, pq.CopyIn(
			"transactions",
			"chain_id", "block_height", "block_hash", "tx_hash", "tx_index",
			"from_addr", "to_addr", "value", "fee", "gas_used", "status", "raw_data",
		))
		if err != nil {
			return fmt.Errorf("preparing tx insert: %w", err)
		}

		for _, t := range txs {
			var fromAddr, toAddr interface{}
			if t.FromAddr != "" {
				fromAddr = t.FromAddr
			}
			if t.ToAddr != "" {
				toAddr = t.ToAddr
			}

			_, err := txStmt.ExecContext(ctx,
				string(t.ChainID), t.BlockHeight, t.BlockHash, t.TxHash, t.TxIndex,
				fromAddr, toAddr, toNullableNumeric(t.Value), toNullableNumeric(t.Fee), t.GasUsed, string(t.Status), string(t.RawData),
			)
			if err != nil {
				txStmt.Close()
				return fmt.Errorf("inserting tx %s: %w", t.TxHash, err)
			}
		}

		if _, err := txStmt.ExecContext(ctx); err != nil {
			txStmt.Close()
			return fmt.Errorf("flushing tx inserts: %w", err)
		}
		txStmt.Close()
	}

	// Insert events
	if len(events) > 0 {
		eventStmt, err := tx.PrepareContext(ctx, pq.CopyIn(
			"events",
			"chain_id", "block_height", "block_hash", "tx_hash", "log_index",
			"contract_addr", "event_name", "topic0", "topics", "data", "raw_data",
			"status", "decode_failed",
		))
		if err != nil {
			return fmt.Errorf("preparing event insert: %w", err)
		}

		for _, e := range events {
			topicsJSON, err := json.Marshal(e.Topics)
			if err != nil {
				eventStmt.Close()
				return fmt.Errorf("marshaling topics: %w", err)
			}

			_, err = eventStmt.ExecContext(ctx,
				string(e.ChainID), e.BlockHeight, e.BlockHash, e.TxHash, e.LogIndex,
				e.ContractAddr, e.EventName, e.Topic0, topicsJSON, string(e.Data), string(e.RawData),
				string(e.Status), e.DecodeFailed,
			)
			if err != nil {
				eventStmt.Close()
				return fmt.Errorf("inserting event: %w", err)
			}
		}

		if _, err := eventStmt.ExecContext(ctx); err != nil {
			eventStmt.Close()
			return fmt.Errorf("flushing event inserts: %w", err)
		}
		eventStmt.Close()
	}

	// Update or insert checkpoint
	lastBlock := blocks[len(blocks)-1]
	_, err = tx.ExecContext(ctx, `
		INSERT INTO checkpoints (chain_id, last_height, last_hash, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (chain_id) DO UPDATE SET
			last_height = EXCLUDED.last_height,
			last_hash = EXCLUDED.last_hash,
			updated_at = EXCLUDED.updated_at
	`, string(chainID), lastBlock.Height, lastBlock.Hash, time.Now())
	if err != nil {
		return fmt.Errorf("updating checkpoint: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}

	return nil
}

// GetBlockByHeight returns a block by chain and height
func (s *Storage) GetBlockByHeight(ctx context.Context, chainID types.ChainID, height uint64) (*types.Block, error) {
	var b types.Block
	var rawData []byte

	err := s.db.QueryRowContext(ctx, `
		SELECT chain_id, height, hash, parent_hash, timestamp, status, raw_data
		FROM blocks
		WHERE chain_id = $1 AND height = $2 AND status != 'orphaned'
		ORDER BY created_at DESC
		LIMIT 1
	`, string(chainID), height).Scan(
		&b.ChainID, &b.Height, &b.Hash, &b.ParentHash, &b.Timestamp, &b.Status, &rawData,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("querying block: %w", err)
	}

	b.RawData = rawData
	return &b, nil
}

// Rollback marks blocks and transactions as orphaned and resets checkpoint
func (s *Storage) Rollback(ctx context.Context, chainID types.ChainID, toHeight uint64, toHash string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning rollback transaction: %w", err)
	}
	defer tx.Rollback()

	// Archive orphaned blocks
	_, err = tx.ExecContext(ctx, `
		INSERT INTO orphaned_blocks (chain_id, height, hash, parent_hash, original_data)
		SELECT chain_id, height, hash, parent_hash, raw_data
		FROM blocks
		WHERE chain_id = $1 AND height > $2 AND status != 'orphaned'
	`, string(chainID), toHeight)
	if err != nil {
		return fmt.Errorf("archiving orphaned blocks: %w", err)
	}

	// Mark transactions as orphaned
	_, err = tx.ExecContext(ctx, `
		UPDATE transactions SET status = 'orphaned'
		WHERE chain_id = $1 AND block_height > $2 AND status != 'orphaned'
	`, string(chainID), toHeight)
	if err != nil {
		return fmt.Errorf("marking transactions as orphaned: %w", err)
	}

	// Mark events as orphaned (ETH)
	_, err = tx.ExecContext(ctx, `
		UPDATE events SET status = 'orphaned'
		WHERE chain_id = $1 AND block_height > $2 AND status != 'orphaned'
	`, string(chainID), toHeight)
	if err != nil {
		return fmt.Errorf("marking events as orphaned: %w", err)
	}

	// Delete orphaned blocks from main table
	_, err = tx.ExecContext(ctx, `
		DELETE FROM blocks
		WHERE chain_id = $1 AND height > $2
	`, string(chainID), toHeight)
	if err != nil {
		return fmt.Errorf("deleting orphaned blocks: %w", err)
	}

	// Reset checkpoint
	_, err = tx.ExecContext(ctx, `
		UPDATE checkpoints SET last_height = $2, last_hash = $3, updated_at = $4
		WHERE chain_id = $1
	`, string(chainID), toHeight, toHash, time.Now())
	if err != nil {
		return fmt.Errorf("resetting checkpoint: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing rollback: %w", err)
	}

	return nil
}

// FinalizeBlocks promotes blocks past confirmation depth to finalized status
func (s *Storage) FinalizeBlocks(ctx context.Context, chainID types.ChainID, confirmationDepth int) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning finalization transaction: %w", err)
	}
	defer tx.Rollback()

	// Get current tip height
	var tipHeight uint64
	err = tx.QueryRowContext(ctx, `
		SELECT last_height FROM checkpoints WHERE chain_id = $1
	`, string(chainID)).Scan(&tipHeight)
	if err == sql.ErrNoRows {
		return nil // Nothing to finalize
	}
	if err != nil {
		return fmt.Errorf("getting tip height: %w", err)
	}

	// Avoid underflow
	if tipHeight <= uint64(confirmationDepth) {
		return nil // Not enough blocks yet
	}
	finalizeBelow := tipHeight - uint64(confirmationDepth)

	// Finalize blocks
	_, err = tx.ExecContext(ctx, `
		UPDATE blocks SET status = 'finalized'
		WHERE chain_id = $1 AND status = 'pending' AND height <= $2
	`, string(chainID), finalizeBelow)
	if err != nil {
		return fmt.Errorf("finalizing blocks: %w", err)
	}

	// Finalize transactions
	_, err = tx.ExecContext(ctx, `
		UPDATE transactions SET status = 'finalized'
		WHERE chain_id = $1 AND status = 'pending' AND block_height <= $2
	`, string(chainID), finalizeBelow)
	if err != nil {
		return fmt.Errorf("finalizing transactions: %w", err)
	}

	// Finalize events
	_, err = tx.ExecContext(ctx, `
		UPDATE events SET status = 'finalized'
		WHERE chain_id = $1 AND status = 'pending' AND block_height <= $2
	`, string(chainID), finalizeBelow)
	if err != nil {
		return fmt.Errorf("finalizing events: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing finalization: %w", err)
	}

	return nil
}

// InitCheckpoint creates initial checkpoint if none exists
func (s *Storage) InitCheckpoint(ctx context.Context, chainID types.ChainID, startHeight uint64) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO checkpoints (chain_id, last_height, last_hash, updated_at)
		VALUES ($1, $2, '', $3)
		ON CONFLICT (chain_id) DO NOTHING
	`, string(chainID), startHeight, time.Now())
	if err != nil {
		return fmt.Errorf("initializing checkpoint: %w", err)
	}
	return nil
}

// GetAddressBalance calculates the balance for an address
func (s *Storage) GetAddressBalance(ctx context.Context, chainID types.ChainID, address string) (string, error) {
	var balance string
	// We cast to TEXT because Go Scan prefers strings for Numeric to preserve precision
	err := s.db.QueryRowContext(ctx, `
		SELECT
			(
				COALESCE(SUM(CASE WHEN to_addr = $2 THEN value ELSE 0 END), 0) -
				COALESCE(SUM(CASE WHEN from_addr = $2 THEN value ELSE 0 END), 0) -
				COALESCE(SUM(CASE WHEN from_addr = $2 THEN fee ELSE 0 END), 0)
			)::TEXT
		FROM transactions
		WHERE chain_id = $1 AND (from_addr = $2 OR to_addr = $2) AND status != 'orphaned'
	`, string(chainID), address).Scan(&balance)

	if err != nil {
		return "0", fmt.Errorf("calculating balance: %w", err)
	}
	return balance, nil
}
