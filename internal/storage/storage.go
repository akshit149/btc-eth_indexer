package storage

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"math/big"
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

// WriteBlocksWithEvents writes blocks, transactions, events, contracts, and token data
func (s *Storage) WriteBlocksWithEvents(ctx context.Context, chainID types.ChainID, blocks []types.Block, txs []types.Transaction, events []types.Event, contracts []types.Contract, tokens []types.Token, tokenTransfers []types.TokenTransfer) error {
	if len(blocks) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback()

	// 1. Prepare statements
	stmtBlocks, err := tx.PrepareContext(ctx, pq.CopyIn("blocks", "chain_id", "height", "hash", "parent_hash", "timestamp", "status", "raw_data"))
	if err != nil {
		return fmt.Errorf("preparing blocks stmt: %w", err)
	}
	defer stmtBlocks.Close()

	stmtTxs, err := tx.PrepareContext(ctx, pq.CopyIn("transactions", "chain_id", "block_height", "block_hash", "tx_hash", "tx_index", "from_addr", "to_addr", "value", "fee", "gas_used", "status", "raw_data"))
	if err != nil {
		return fmt.Errorf("preparing txs stmt: %w", err)
	}
	defer stmtTxs.Close()

	// 2. Insert Blocks
	for _, b := range blocks {
		if _, err := stmtBlocks.ExecContext(ctx, string(b.ChainID), b.Height, b.Hash, b.ParentHash, b.Timestamp, string(b.Status), string(b.RawData)); err != nil {
			return fmt.Errorf("executing block insert: %w", err)
		}
	}
	if _, err := stmtBlocks.ExecContext(ctx); err != nil {
		return fmt.Errorf("executing block flush: %w", err)
	}

	// 3. Insert Transactions & Aggregate Stats
	statsDiff := make(map[string]*types.AddressStatsDiff)

	for _, t := range txs {
		var fromAddr, toAddr interface{}
		if t.FromAddr != "" {
			fromAddr = t.FromAddr
		}
		if t.ToAddr != "" {
			toAddr = t.ToAddr
		}

		if _, err := stmtTxs.ExecContext(ctx, string(t.ChainID), t.BlockHeight, t.BlockHash, t.TxHash, t.TxIndex, fromAddr, toAddr, toNullableNumeric(t.Value), toNullableNumeric(t.Fee), t.GasUsed, string(t.Status), string(t.RawData)); err != nil {
			return fmt.Errorf("executing tx insert: %w", err)
		}

		// Aggregate Stats
		val, _ := new(big.Int).SetString(t.Value, 10)
		fee, _ := new(big.Int).SetString(t.Fee, 10)
		if val == nil {
			val = big.NewInt(0)
		}
		if fee == nil {
			fee = big.NewInt(0)
		}

		// FROM address: -value -fee, +sent
		if t.FromAddr != "" {
			if _, ok := statsDiff[t.FromAddr]; !ok {
				statsDiff[t.FromAddr] = &types.AddressStatsDiff{}
			}
			diff := statsDiff[t.FromAddr]
			if diff.BalanceDelta == nil {
				diff.BalanceDelta = big.NewInt(0)
			}
			if diff.TotalSent == nil {
				diff.TotalSent = big.NewInt(0)
			}
			diff.BalanceDelta.Sub(diff.BalanceDelta, val)
			diff.BalanceDelta.Sub(diff.BalanceDelta, fee)
			diff.TotalSent.Add(diff.TotalSent, val)
			diff.TxCount++
			if diff.LastSeenHeight < int64(t.BlockHeight) {
				diff.LastSeenHeight = int64(t.BlockHeight)
			}
		}

		// TO address: +value, +received
		if t.ToAddr != "" {
			if _, ok := statsDiff[t.ToAddr]; !ok {
				statsDiff[t.ToAddr] = &types.AddressStatsDiff{}
			}
			diff := statsDiff[t.ToAddr]
			if diff.BalanceDelta == nil {
				diff.BalanceDelta = big.NewInt(0)
			}
			if diff.TotalReceived == nil {
				diff.TotalReceived = big.NewInt(0)
			}
			diff.BalanceDelta.Add(diff.BalanceDelta, val)
			diff.TotalReceived.Add(diff.TotalReceived, val)
			diff.TxCount++
			if diff.LastSeenHeight < int64(t.BlockHeight) {
				diff.LastSeenHeight = int64(t.BlockHeight)
			}
		}
	}
	if _, err := stmtTxs.ExecContext(ctx); err != nil {
		return fmt.Errorf("executing tx flush: %w", err)
	}

	// 4. Insert Events
	if len(events) > 0 {
		stmtEvents, err := tx.PrepareContext(ctx, pq.CopyIn("events", "chain_id", "block_height", "block_hash", "tx_hash", "log_index", "contract_addr", "event_name", "topic0", "topics", "data", "raw_data", "status", "decode_failed"))
		if err != nil {
			return fmt.Errorf("preparing events stmt: %w", err)
		}
		defer stmtEvents.Close()

		for _, e := range events {
			topicsJSON, err := json.Marshal(e.Topics)
			if err != nil {
				return fmt.Errorf("marshaling topics: %w", err)
			}
			if _, err := stmtEvents.ExecContext(ctx, string(e.ChainID), e.BlockHeight, e.BlockHash, e.TxHash, e.LogIndex, e.ContractAddr, e.EventName, e.Topic0, topicsJSON, string(e.Data), string(e.RawData), string(e.Status), e.DecodeFailed); err != nil {
				return fmt.Errorf("executing event insert: %w", err)
			}
		}
		if _, err := stmtEvents.ExecContext(ctx); err != nil {
			return fmt.Errorf("executing event flush: %w", err)
		}
	}

	// 5. Insert Contracts
	if len(contracts) > 0 {
		contractStmt, err := tx.PrepareContext(ctx, pq.CopyIn(
			"contracts",
			"chain_id", "address", "creator_addr", "tx_hash", "block_height", "created_at",
		))
		if err != nil {
			return fmt.Errorf("preparing contract stmt: %w", err)
		}
		defer contractStmt.Close()

		for _, c := range contracts {
			if _, err := contractStmt.ExecContext(ctx, string(c.ChainID), c.Address, c.CreatorAddr, c.TxHash, c.BlockHeight, c.CreatedAt); err != nil {
				return fmt.Errorf("executing contract insert: %w", err)
			}
		}
		if _, err := contractStmt.ExecContext(ctx); err != nil {
			return fmt.Errorf("executing contract flush: %w", err)
		}
	}

	// 6. Insert Tokens
	if len(tokens) > 0 {
		stmtTokens, err := tx.PrepareContext(ctx, pq.CopyIn(
			"tokens",
			"chain_id", "address", "name", "symbol", "decimals", "first_seen_height", "last_seen_height",
		))
		if err != nil {
			return fmt.Errorf("preparing tokens stmt: %w", err)
		}
		defer stmtTokens.Close()

		for _, t := range tokens {
			if _, err := stmtTokens.ExecContext(ctx, string(t.ChainID), t.Address, t.Name, t.Symbol, t.Decimals, t.FirstSeenHeight, t.LastSeenHeight); err != nil {
				// CopyIn doesn't support ON CONFLICT, so this might fail if we don't dedupe or check existence.
				// For CopyIn, we assume novelty or catch constraint violation?
				// Actually, CopyIn aborts transaction on duplicate.
				// Strategy: Use INSERT ... ON CONFLICT DO NOTHING for tokens instead of CopyIn, or ensure `tokens` slice only has NEW tokens.
				// The poller should ideally filter. But to be safe, let's use standard INSERT for tokens as they are low volume.
			}
		}
		stmtTokens.Close() // Close copy stmt if used.

		// Switch to INSERT logic for tokens to handle duplicates safely
		tokenInsertStmt, err := tx.PrepareContext(ctx, `
			INSERT INTO tokens (chain_id, address, name, symbol, decimals, first_seen_height, last_seen_height)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (chain_id, address) DO NOTHING
		`)
		if err != nil {
			return fmt.Errorf("preparing token insert stmt: %w", err)
		}
		defer tokenInsertStmt.Close()

		for _, t := range tokens {
			if _, err := tokenInsertStmt.ExecContext(ctx, string(t.ChainID), t.Address, t.Name, t.Symbol, t.Decimals, t.FirstSeenHeight, t.LastSeenHeight); err != nil {
				return fmt.Errorf("inserting token: %w", err)
			}
		}
	}

	// 7. Insert Token Transfers & Aggregate Balances
	tokenBalDiff := make(map[string]map[string]*big.Int) // address -> token -> balance_delta

	if len(tokenTransfers) > 0 {
		stmtTransfers, err := tx.PrepareContext(ctx, pq.CopyIn(
			"token_transfers",
			"chain_id", "tx_hash", "log_index", "token_address", "from_addr", "to_addr", "amount", "block_height", "block_hash", "timestamp",
		))
		if err != nil {
			return fmt.Errorf("preparing transfers stmt: %w", err)
		}
		defer stmtTransfers.Close()

		for _, t := range tokenTransfers {
			if _, err := stmtTransfers.ExecContext(ctx, string(t.ChainID), t.TxHash, t.LogIndex, t.TokenAddress, t.FromAddr, t.ToAddr, t.Amount, t.BlockHeight, t.BlockHash, t.Timestamp); err != nil {
				return fmt.Errorf("executing transfer insert: %w", err)
			}

			// Aggregate Balances
			amt, _ := new(big.Int).SetString(t.Amount, 10)
			if amt == nil {
				amt = big.NewInt(0)
			}

			// From (-amt)
			if t.FromAddr != "" && t.FromAddr != "0x0000000000000000000000000000000000000000" { // Mint check
				if _, ok := tokenBalDiff[t.FromAddr]; !ok {
					tokenBalDiff[t.FromAddr] = make(map[string]*big.Int)
				}
				if _, ok := tokenBalDiff[t.FromAddr][t.TokenAddress]; !ok {
					tokenBalDiff[t.FromAddr][t.TokenAddress] = big.NewInt(0)
				}
				tokenBalDiff[t.FromAddr][t.TokenAddress].Sub(tokenBalDiff[t.FromAddr][t.TokenAddress], amt)
			}

			// To (+amt)
			if t.ToAddr != "" && t.ToAddr != "0x0000000000000000000000000000000000000000" { // Burn check
				if _, ok := tokenBalDiff[t.ToAddr]; !ok {
					tokenBalDiff[t.ToAddr] = make(map[string]*big.Int)
				}
				if _, ok := tokenBalDiff[t.ToAddr][t.TokenAddress]; !ok {
					tokenBalDiff[t.ToAddr][t.TokenAddress] = big.NewInt(0)
				}
				tokenBalDiff[t.ToAddr][t.TokenAddress].Add(tokenBalDiff[t.ToAddr][t.TokenAddress], amt)
			}
		}
		if _, err := stmtTransfers.ExecContext(ctx); err != nil {
			return fmt.Errorf("executing transfers flush: %w", err)
		}
	}

	// 8. Update Token Balances
	if len(tokenBalDiff) > 0 {
		if err := s.updateTokenBalances(ctx, tx, chainID, tokenBalDiff); err != nil {
			return fmt.Errorf("updating token balances: %w", err)
		}
	}

	// 9. Update Address Stats
	if len(statsDiff) > 0 {
		if err := s.updateAddressStats(ctx, tx, chainID, statsDiff); err != nil {
			return fmt.Errorf("updating address stats: %w", err)
		}
	}

	// 10. Update Checkpoint
	if len(blocks) > 0 {
		lastBlock := blocks[len(blocks)-1]
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO checkpoints (chain_id, last_height, last_hash, updated_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (chain_id) DO UPDATE
			SET last_height = EXCLUDED.last_height,
				last_hash = EXCLUDED.last_hash,
				updated_at = NOW()
		`, string(chainID), lastBlock.Height, lastBlock.Hash); err != nil {
			return fmt.Errorf("updating checkpoint: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}

	// Finalize blocks after successful write
	if err := s.FinalizeBlocks(ctx, chainID, 12); err != nil { // Default depth
		return err
	}

	return nil
}

func (s *Storage) updateAddressStats(ctx context.Context, tx *sql.Tx, chainID types.ChainID, diffs map[string]*types.AddressStatsDiff) error {
	// Prepare upsert statement
	// Postgres doesn't support bulk upsert via COPY easily, so we use INSERT ... ON CONFLICT
	// For performance, we could batch these or use UNNEST.
	// We'll use a simple loop for now, optimizing if needed.

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO address_stats (chain_id, address, balance, total_received, total_sent, tx_count, first_seen_height, last_seen_height, last_updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		ON CONFLICT (chain_id, address) DO UPDATE SET
			balance = address_stats.balance + EXCLUDED.balance,
			total_received = address_stats.total_received + EXCLUDED.total_received,
			total_sent = address_stats.total_sent + EXCLUDED.total_sent,
			tx_count = address_stats.tx_count + EXCLUDED.tx_count,
			last_seen_height = GREATEST(address_stats.last_seen_height, EXCLUDED.last_seen_height),
			last_updated_at = NOW();
	`)
	if err != nil {
		return fmt.Errorf("preparing stats upsert: %w", err)
	}
	defer stmt.Close()

	for addr, diff := range diffs {
		// Set first_seen to last_seen initially; existing rows won't update first_seen anyway
		_, err := stmt.ExecContext(ctx,
			string(chainID),
			addr,
			diff.BalanceDelta.String(),
			diff.TotalReceived.String(),
			diff.TotalSent.String(),
			diff.TxCount,
			diff.LastSeenHeight, // first_seen (IF NEW)
			diff.LastSeenHeight, // last_seen
		)
		if err != nil {
			return fmt.Errorf("upserting stats for %s: %w", addr, err)
		}
	}
	return nil
}

func (s *Storage) updateTokenBalances(ctx context.Context, tx *sql.Tx, chainID types.ChainID, diffs map[string]map[string]*big.Int) error {
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO token_balances (chain_id, address, token_address, balance, last_updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (chain_id, address, token_address) DO UPDATE SET
			balance = token_balances.balance + EXCLUDED.balance,
			last_updated_at = NOW()
	`)
	if err != nil {
		return fmt.Errorf("preparing token balance upsert: %w", err)
	}
	defer stmt.Close()

	for addr, tokens := range diffs {
		for tokenAddr, delta := range tokens {
			if _, err := stmt.ExecContext(ctx, string(chainID), addr, tokenAddr, delta.String()); err != nil {
				return fmt.Errorf("upserting token balance for %s %s: %w", addr, tokenAddr, err)
			}
		}
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
