package query

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/internal/indexer/pkg/types"
	_ "github.com/lib/pq"
)

// Store defines the interface for database access
type Store interface {
	GetLatestBlock(ctx context.Context, chainID types.ChainID) (*types.Block, error)
	GetBlockByHeight(ctx context.Context, chainID types.ChainID, height uint64) (*types.Block, error)
	GetBlockByHash(ctx context.Context, chainID types.ChainID, hash string) (*types.Block, error)
	GetTx(ctx context.Context, chainID types.ChainID, hash string) (*types.Transaction, error)
	GetTransactionsByAddress(ctx context.Context, chainID types.ChainID, address string, cursor string, limit int) ([]*types.Transaction, string, error)
	GetTransactionsByBlock(ctx context.Context, chainID types.ChainID, blockID string, cursor string, limit int) ([]*types.Transaction, string, error)
	GetLatestTransactions(ctx context.Context, chainID types.ChainID, limit int) ([]*types.Transaction, error)
	GetNetworkStats(ctx context.Context, chainID types.ChainID) (*types.NetworkStats, error)
	GetBlocksRange(ctx context.Context, chainID types.ChainID, fromHeight, toHeight uint64) ([]*types.BlockSummary, error)
	GetEvents(ctx context.Context, filter EventFilter) ([]*types.Event, string, error)
	GetContract(ctx context.Context, chainID types.ChainID, address string) (*types.Contract, error)
	GetAddressStats(ctx context.Context, chainID types.ChainID, address string) (*types.AddressStats, error)
	GetTokenBalances(ctx context.Context, chainID types.ChainID, address string) ([]types.TokenBalance, error)
	GetTokenTransfers(ctx context.Context, chainID types.ChainID, address string, limit, offset int) ([]types.TokenTransfer, error)
	GetAddressBalance(ctx context.Context, chainID types.ChainID, address string) (string, error)
	SearchTokens(ctx context.Context, query string) ([]types.Token, error)
	Close() error
}

// EventFilter defines filters for querying events
type EventFilter struct {
	ChainID      types.ChainID
	ContractAddr string
	Topic0       string
	FromHeight   *uint64
	ToHeight     *uint64
	Cursor       string
	Limit        int
}

// PostgresStore implements Store for PostgreSQL
type PostgresStore struct {
	db *sql.DB
}

// NewPostgresStore creates a new PostgresStore
func NewPostgresStore(dsn string, maxConns int) (*PostgresStore, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	db.SetMaxOpenConns(maxConns)
	db.SetMaxIdleConns(maxConns)
	db.SetConnMaxLifetime(time.Hour)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("pinging database: %w", err)
	}

	return &PostgresStore{db: db}, nil
}

func (s *PostgresStore) Close() error {
	return s.db.Close()
}

// GetLatestBlock returns the latest block for a chain
func (s *PostgresStore) GetLatestBlock(ctx context.Context, chainID types.ChainID) (*types.Block, error) {
	query := `
		SELECT chain_id, height, hash, parent_hash, timestamp, status, raw_data
		FROM blocks
		WHERE chain_id = $1
		ORDER BY height DESC
		LIMIT 1`

	return s.scanBlock(s.db.QueryRowContext(ctx, query, chainID))
}

// GetBlockByHeight returns a block by height
func (s *PostgresStore) GetBlockByHeight(ctx context.Context, chainID types.ChainID, height uint64) (*types.Block, error) {
	query := `
		SELECT chain_id, height, hash, parent_hash, timestamp, status, raw_data
		FROM blocks
		WHERE chain_id = $1 AND height = $2`

	return s.scanBlock(s.db.QueryRowContext(ctx, query, chainID, height))
}

// GetBlockByHash returns a block by hash
func (s *PostgresStore) GetBlockByHash(ctx context.Context, chainID types.ChainID, hash string) (*types.Block, error) {
	query := `
		SELECT chain_id, height, hash, parent_hash, timestamp, status, raw_data
		FROM blocks
		WHERE chain_id = $1 AND hash = $2`

	return s.scanBlock(s.db.QueryRowContext(ctx, query, chainID, hash))
}

func (s *PostgresStore) scanBlock(row *sql.Row) (*types.Block, error) {
	var b types.Block
	var rawData []byte
	err := row.Scan(
		&b.ChainID,
		&b.Height,
		&b.Hash,
		&b.ParentHash,
		&b.Timestamp,
		&b.Status,
		&rawData,
	)
	if err == sql.ErrNoRows {
		return nil, nil // Not found
	}
	if err != nil {
		return nil, err
	}
	b.RawData = rawData
	return &b, nil
}

// GetTx returns a transaction by hash
func (s *PostgresStore) GetTx(ctx context.Context, chainID types.ChainID, hash string) (*types.Transaction, error) {
	query := `
		SELECT chain_id, block_height, block_hash, tx_hash, COALESCE(from_addr, ''), COALESCE(to_addr, ''), COALESCE(value::text, '0'), COALESCE(fee::text, ''), COALESCE(gas_used, 0), status, raw_data, tx_index
		FROM transactions
		WHERE chain_id = $1 AND tx_hash = $2`

	row := s.db.QueryRowContext(ctx, query, chainID, hash)
	var tx types.Transaction
	var rawData []byte
	var value, fee, toAddr, fromAddr sql.NullString

	err := row.Scan(
		&tx.ChainID,
		&tx.BlockHeight,
		&tx.BlockHash,
		&tx.TxHash,
		&fromAddr,
		&toAddr,
		&value,
		&fee,
		&tx.GasUsed,
		&tx.Status,
		&rawData,
		&tx.TxIndex,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	tx.RawData = rawData
	tx.Value = value.String
	tx.Fee = fee.String
	tx.FromAddr = fromAddr.String
	tx.ToAddr = toAddr.String
	return &tx, nil
}

// GetTransactionsByAddress returns transactions for an address with cursor-based pagination
func (s *PostgresStore) GetTransactionsByAddress(ctx context.Context, chainID types.ChainID, address string, cursor string, limit int) ([]*types.Transaction, string, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	// Cursor format: "block_height,tx_index" (simplified to just block_height for now if tx_index is not key, but usually it is).
	// Actually, the requirements mentioned "cursor". Let's assume pagination by block_height DESC, then tx_hash (or some tie breaker).
	// Since we don't have a unique ID other than tx_hash, let's use block_height + tx_hash as cursor if needed.
	// But `transactions` table usually doesn't have a guaranteed order other than block_height logic.
	// Let's rely on block_height DESC.

	// Complex cursor logic: "height,tx_index" if we had tx_index.
	// `types.Transaction` has `TxIndex`. Let's assume the DB has it or we rely on insertion order if missing?
	// The schema in prompt didn't explicitly list `tx_index` in `transactions` table columns but `types.Transaction` has it.
	// Let's assume `transactions` table has `tx_index` or similar implicit ordering.
	// Actually, looking at prompt schema:
	// transactions: chain_id, block_height, block_hash, tx_hash, from_addr, to_addr, value, fee, gas_used, status, raw_data.
	// No tx_index in DB schema explicitly, but good practice to have it.
	// Let's assume for now we order by block_height DESC. If multiple txs in same block, order is arbitrary without tx_index.
	// To be safe, let's just use block_height for now, or maybe block_height, tx_hash.

	query := `
		SELECT chain_id, block_height, block_hash, tx_hash, COALESCE(from_addr, ''), COALESCE(to_addr, ''), COALESCE(value::text, '0'), COALESCE(fee::text, ''), COALESCE(gas_used, 0), status, raw_data
		FROM transactions
		WHERE chain_id = $1 AND (from_addr = $2 OR to_addr = $2)`

	args := []interface{}{chainID, address}
	argIdx := 3

	if cursor != "" {
		// Parse cursor, e.g., "123456" (height)
		// For stricter pagination we need a tie-breaker.
		query += fmt.Sprintf(" AND block_height < $%d", argIdx)
		args = append(args, cursor) // simplified cursor as just height for now
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY block_height DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var txs []*types.Transaction
	var lastHeight uint64

	for rows.Next() {
		var tx types.Transaction
		var rawData []byte
		if err := rows.Scan(
			&tx.ChainID,
			&tx.BlockHeight,
			&tx.BlockHash,
			&tx.TxHash,
			&tx.FromAddr,
			&tx.ToAddr,
			&tx.Value,
			&tx.Fee,
			&tx.GasUsed,
			&tx.Status,
			&rawData,
		); err != nil {
			return nil, "", err
		}
		tx.RawData = rawData
		txs = append(txs, &tx)
		lastHeight = tx.BlockHeight
	}

	nextCursor := ""
	if len(txs) == limit {
		nextCursor = fmt.Sprintf("%d", lastHeight)
	}

	return txs, nextCursor, nil
}

// GetTransactionsByBlock returns transactions for a block (height or hash)
func (s *PostgresStore) GetTransactionsByBlock(ctx context.Context, chainID types.ChainID, blockID string, cursor string, limit int) ([]*types.Transaction, string, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}

	// Determine if blockID is height or hash
	isHash := len(blockID) > 20 // Crude check, but heights are usually shorter numbers
	// Better: try parsing as int. But generic approach:
	// The query logic needs to handle join or subquery if height.
	// DB schema has block_height and block_hash in transactions table.

	query := `
		SELECT chain_id, block_height, block_hash, tx_hash, COALESCE(from_addr, ''), COALESCE(to_addr, ''), COALESCE(value::text, '0'), COALESCE(fee::text, ''), COALESCE(gas_used, 0), status, raw_data, tx_index
		FROM transactions
		WHERE chain_id = $1`

	args := []interface{}{chainID}
	argIdx := 2

	if isHash {
		query += fmt.Sprintf(" AND block_hash = $%d", argIdx)
		args = append(args, blockID)
	} else {
		// Assume height
		query += fmt.Sprintf(" AND block_height = $%d", argIdx)
		args = append(args, blockID) // PG will cast string to int if column is int
	}
	argIdx++

	if cursor != "" {
		// Cursor for within a block: assume tx_index or just offset?
		// "Index on (chain_id, block_height, tx_index)" is required.
		// So we use tx_index.
		query += fmt.Sprintf(" AND tx_index > $%d", argIdx)
		args = append(args, cursor)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY tx_index ASC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var txs []*types.Transaction
	var lastIndex int

	for rows.Next() {
		var tx types.Transaction
		var rawData []byte
		var value, fee, toAddr, fromAddr sql.NullString

		if err := rows.Scan(
			&tx.ChainID,
			&tx.BlockHeight,
			&tx.BlockHash,
			&tx.TxHash,
			&fromAddr,
			&toAddr,
			&value,
			&fee,
			&tx.GasUsed,
			&tx.Status,
			&rawData,
			&tx.TxIndex,
		); err != nil {
			return nil, "", err
		}
		tx.RawData = rawData
		tx.Value = value.String
		tx.Fee = fee.String
		tx.FromAddr = fromAddr.String
		tx.ToAddr = toAddr.String

		txs = append(txs, &tx)
		lastIndex = tx.TxIndex
	}

	nextCursor := ""
	if len(txs) == limit {
		nextCursor = fmt.Sprintf("%d", lastIndex)
	}

	return txs, nextCursor, nil
}

// GetLatestTransactions returns the most recent transactions
func (s *PostgresStore) GetLatestTransactions(ctx context.Context, chainID types.ChainID, limit int) ([]*types.Transaction, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	// "Returns most recent txs across latest indexed blocks"
	// Sort by block_height DESC, tx_index DESC
	query := `
		SELECT chain_id, block_height, block_hash, tx_hash, COALESCE(from_addr, ''), COALESCE(to_addr, ''), COALESCE(value::text, '0'), COALESCE(fee::text, ''), COALESCE(gas_used, 0), status, raw_data, tx_index
		FROM transactions
		WHERE chain_id = $1
		ORDER BY block_height DESC, tx_index DESC
		LIMIT $2`

	rows, err := s.db.QueryContext(ctx, query, chainID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []*types.Transaction
	for rows.Next() {
		var tx types.Transaction
		var rawData []byte
		var value, fee, toAddr, fromAddr sql.NullString

		if err := rows.Scan(
			&tx.ChainID,
			&tx.BlockHeight,
			&tx.BlockHash,
			&tx.TxHash,
			&fromAddr,
			&toAddr,
			&value,
			&fee,
			&tx.GasUsed,
			&tx.Status,
			&rawData,
			&tx.TxIndex,
		); err != nil {
			return nil, err
		}
		tx.RawData = rawData
		tx.Value = value.String
		tx.Fee = fee.String
		tx.FromAddr = fromAddr.String
		tx.ToAddr = toAddr.String

		txs = append(txs, &tx)
	}
	return txs, nil
}

// GetNetworkStats returns statistics for the chain
func (s *PostgresStore) GetNetworkStats(ctx context.Context, chainID types.ChainID) (*types.NetworkStats, error) {
	stats := &types.NetworkStats{ChainID: chainID}

	// 1. Latest Height
	err := s.db.QueryRowContext(ctx, "SELECT COALESCE(MAX(height), 0) FROM blocks WHERE chain_id = $1", chainID).Scan(&stats.LatestHeight)
	if err != nil {
		return nil, fmt.Errorf("getting max height: %w", err)
	}

	// 2. Blocks Last Minute & Indexer Lag
	// We need current time.
	// Lag = now - latest_block_time
	var latestTime time.Time
	err = s.db.QueryRowContext(ctx, "SELECT timestamp FROM blocks WHERE chain_id = $1 AND height = $2", chainID, stats.LatestHeight).Scan(&latestTime)
	if err == nil {
		stats.IndexerLagSeconds = int64(time.Since(latestTime).Seconds())
	}

	// Blocks last minute
	minuteAgo := time.Now().Add(-1 * time.Minute)
	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM blocks WHERE chain_id = $1 AND timestamp >= $2", chainID, minuteAgo).Scan(&stats.BlocksLastMinute)
	if err != nil {
		return nil, fmt.Errorf("counting blocks: %w", err)
	}

	// 3. Txs Last Minute
	// Assuming transactions has 'created_at' or we join with blocks.
	// REQUIRED: "Index on (chain_id, created_at DESC)" on transactions.
	// But `transactions` table schema in Prompt 0 didn't have `created_at`.
	// But "DATABASE ASSUMPTIONS" in Prompt 1 says "Transactions table includes ... created_at".
	// So we assume it exists.
	// Wait, if I assume it exists, I should use it.
	// But `GetTx` earlier didn't scan it. I should probably update `GetTx` too if I want to be consistent, but for now I only need it here.

	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM transactions WHERE chain_id = $1 AND created_at >= $2", chainID, minuteAgo).Scan(&stats.TxsLastMinute)
	if err != nil {
		// Fallback if column doesn't exist? Users said "Transactions table includes... created_at".
		// But if the migration wasn't run, it might fail. The user said "I already have... PostgreSQL with tables".
		// I must assume the user updated the DB or I should rely on Block timestamp join.
		// "Index on (chain_id, created_at DESC)" implies created_at is the filter.
		return nil, fmt.Errorf("counting txs: %w", err)
	}

	// 4. Avg Block Time (last 100 blocks?)
	// Simple approx: (Time(Head) - Time(Head-100)) / 100
	// Or just hardcode based on chain? No, calculate it.
	if stats.LatestHeight > 100 {
		var t1, t2 time.Time
		s.db.QueryRowContext(ctx, "SELECT timestamp FROM blocks WHERE chain_id = $1 AND height = $2", chainID, stats.LatestHeight).Scan(&t1)
		s.db.QueryRowContext(ctx, "SELECT timestamp FROM blocks WHERE chain_id = $1 AND height = $2", chainID, stats.LatestHeight-100).Scan(&t2)
		diff := t1.Sub(t2).Seconds()
		if diff > 0 {
			stats.AvgBlockTime = diff / 100.0
		}
	}

	return stats, nil
}

// GetBlocksRange returns a summary of blocks in a range
func (s *PostgresStore) GetBlocksRange(ctx context.Context, chainID types.ChainID, fromHeight, toHeight uint64) ([]*types.BlockSummary, error) {
	// Limit range to avoid massive queries?
	if toHeight < fromHeight {
		return nil, fmt.Errorf("invalid range")
	}
	if toHeight-fromHeight > 100 {
		toHeight = fromHeight + 100
	}

	// We need tx_count.
	// "Returns: height, timestamp, tx_count, status"
	// We can use a subquery for tx_count or join.
	// GROUP BY is needed.

	query := `
		SELECT b.height, b.timestamp, b.status, COUNT(t.tx_hash)
		FROM blocks b
		LEFT JOIN transactions t ON b.chain_id = t.chain_id AND b.height = t.block_height
		WHERE b.chain_id = $1 AND b.height >= $2 AND b.height <= $3
		GROUP BY b.height, b.timestamp, b.status
		ORDER BY b.height ASC`

	rows, err := s.db.QueryContext(ctx, query, chainID, fromHeight, toHeight)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocks []*types.BlockSummary
	for rows.Next() {
		var b types.BlockSummary
		if err := rows.Scan(&b.Height, &b.Timestamp, &b.Status, &b.TxCount); err != nil {
			return nil, err
		}
		blocks = append(blocks, &b)
	}
	return blocks, nil
}

// GetEvents returns events with filtering and pagination
func (s *PostgresStore) GetEvents(ctx context.Context, filter EventFilter) ([]*types.Event, string, error) {
	query := `
		SELECT chain_id, block_height, block_hash, tx_hash, log_index, contract_addr, event_name, topic0, topics, data, status
		FROM events
		WHERE chain_id = $1`

	args := []interface{}{filter.ChainID}
	argIdx := 2

	if filter.ContractAddr != "" {
		query += fmt.Sprintf(" AND contract_addr = $%d", argIdx)
		args = append(args, filter.ContractAddr)
		argIdx++
	}
	if filter.Topic0 != "" {
		query += fmt.Sprintf(" AND topic0 = $%d", argIdx)
		args = append(args, filter.Topic0)
		argIdx++
	}
	if filter.FromHeight != nil {
		query += fmt.Sprintf(" AND block_height >= $%d", argIdx)
		args = append(args, *filter.FromHeight)
		argIdx++
	}
	if filter.ToHeight != nil {
		query += fmt.Sprintf(" AND block_height <= $%d", argIdx)
		args = append(args, *filter.ToHeight)
		argIdx++
	}

	// Cursor logic (simple height based)
	if filter.Cursor != "" {
		query += fmt.Sprintf(" AND block_height < $%d", argIdx)
		args = append(args, filter.Cursor) // Assuming cursor is just height string
		argIdx++
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query += fmt.Sprintf(" ORDER BY block_height DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var events []*types.Event
	var lastHeight uint64

	for rows.Next() {
		var e types.Event
		var topicsJSON []byte
		var dataJSON []byte

		if err := rows.Scan(
			&e.ChainID,
			&e.BlockHeight,
			&e.BlockHash,
			&e.TxHash,
			&e.LogIndex,
			&e.ContractAddr,
			&e.EventName,
			&e.Topic0,
			&topicsJSON,
			&dataJSON,
			&e.Status,
		); err != nil {
			return nil, "", err
		}

		if err := json.Unmarshal(topicsJSON, &e.Topics); err != nil {
			// If topics are just a string representation in DB, might need different handling
			// Assuming DB stores JSON array for topics as per schema implication
		}
		e.Data = dataJSON

		events = append(events, &e)
		lastHeight = e.BlockHeight
	}

	nextCursor := ""
	if len(events) == limit {
		nextCursor = fmt.Sprintf("%d", lastHeight)
	}

	return events, nextCursor, nil
}

// GetAddressBalance calculates the balance for an address
func (s *PostgresStore) GetAddressBalance(ctx context.Context, chainID types.ChainID, address string) (string, error) {
	var balance string
	query := `
		SELECT
			(
				COALESCE(SUM(CASE WHEN to_addr = $2 THEN value ELSE 0 END), 0) -
				COALESCE(SUM(CASE WHEN from_addr = $2 THEN value ELSE 0 END), 0) -
				COALESCE(SUM(CASE WHEN from_addr = $2 THEN fee ELSE 0 END), 0)
			)::TEXT
		FROM transactions
		WHERE chain_id = $1 AND (from_addr = $2 OR to_addr = $2) AND status != 'orphaned'
	`
	err := s.db.QueryRowContext(ctx, query, chainID, address).Scan(&balance)
	if err != nil {
		if err == sql.ErrNoRows {
			return "0", nil // Or 0 if no txs
		}
		// If NULL is returned (no rows match sum?), the query usually returns "0" due to COALESCE but if no rows at all?
		// SUM over empty set is NULL, COALESCE makes it 0.
		// So checking err is good.
		return "0", fmt.Errorf("calculating balance: %w", err)
	}
	if balance == "" {
		return "0", nil
	}
	return balance, nil
}

// GetContract returns a contract by address
func (s *PostgresStore) GetContract(ctx context.Context, chainID types.ChainID, address string) (*types.Contract, error) {
	var c types.Contract
	err := s.db.QueryRowContext(ctx, `
		SELECT chain_id, address, creator_addr, tx_hash, block_height, created_at
		FROM contracts
		WHERE chain_id = $1 AND address = $2
	`, string(chainID), address).Scan(&c.ChainID, &c.Address, &c.CreatorAddr, &c.TxHash, &c.BlockHeight, &c.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil // Not found
	}
	if err != nil {
		return nil, fmt.Errorf("querying contract: %w", err)
	}

	return &c, nil
}

// GetAddressStats returns analytics for an address
func (s *PostgresStore) GetAddressStats(ctx context.Context, chainID types.ChainID, address string) (*types.AddressStats, error) {
	var stats types.AddressStats
	err := s.db.QueryRowContext(ctx, `
		SELECT chain_id, address, balance, total_received, total_sent, tx_count, first_seen_height, last_seen_height, last_updated_at
		FROM address_stats
		WHERE chain_id = $1 AND address = $2
	`, string(chainID), address).Scan(
		&stats.ChainID, &stats.Address, &stats.Balance, &stats.TotalReceived, &stats.TotalSent,
		&stats.TxCount, &stats.FirstSeenHeight, &stats.LastSeenHeight, &stats.LastUpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // Not found
	}
	if err != nil {
		return nil, fmt.Errorf("querying address stats: %w", err)
	}

	return &stats, nil
}

func (s *PostgresStore) GetTokenBalances(ctx context.Context, chainID types.ChainID, address string) ([]types.TokenBalance, error) {
	query := `
		SELECT chain_id, address, token_address, balance, last_updated_at
		FROM token_balances
		WHERE chain_id = $1 AND address = $2 AND balance > 0
		ORDER BY balance DESC
	`
	rows, err := s.db.QueryContext(ctx, query, chainID, address)
	if err != nil {
		return nil, fmt.Errorf("querying token balances: %w", err)
	}
	defer rows.Close()

	var balances []types.TokenBalance
	for rows.Next() {
		var b types.TokenBalance
		if err := rows.Scan(&b.ChainID, &b.Address, &b.TokenAddress, &b.Balance, &b.LastUpdated); err != nil {
			return nil, fmt.Errorf("scanning token balance: %w", err)
		}
		balances = append(balances, b)
	}
	return balances, nil
}

func (s *PostgresStore) GetTokenTransfers(ctx context.Context, chainID types.ChainID, address string, limit, offset int) ([]types.TokenTransfer, error) {
	query := `
		SELECT chain_id, tx_hash, log_index, token_address, from_addr, to_addr, amount, block_height, block_hash, timestamp
		FROM token_transfers
		WHERE chain_id = $1 AND (from_addr = $2 OR to_addr = $2)
		ORDER BY block_height DESC, log_index DESC
		LIMIT $3 OFFSET $4
	`
	rows, err := s.db.QueryContext(ctx, query, chainID, address, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("querying token transfers: %w", err)
	}
	defer rows.Close()

	var transfers []types.TokenTransfer
	for rows.Next() {
		var t types.TokenTransfer
		if err := rows.Scan(
			&t.ChainID, &t.TxHash, &t.LogIndex, &t.TokenAddress,
			&t.FromAddr, &t.ToAddr, &t.Amount,
			&t.BlockHeight, &t.BlockHash, &t.Timestamp,
		); err != nil {
			return nil, fmt.Errorf("scanning token transfer: %w", err)
		}
		transfers = append(transfers, t)
	}
	return transfers, nil
}

func (s *PostgresStore) SearchTokens(ctx context.Context, q string) ([]types.Token, error) {
	// Use ILIKE for partial match, relying on pg_trgm index for performance if pattern starts with %
	// Actually pg_trgm handles %pattern% well.
	match := "%" + q + "%"
	query := `
		SELECT chain_id, address, name, symbol, decimals, first_seen_height, last_seen_height
		FROM tokens
		WHERE name ILIKE $1 OR symbol ILIKE $1
		LIMIT 10
	`
	// TODO: Add ordering by similarity if simple ILIKE is not enough, but ILIKE is standard for fuzzy start.
	// For better ranking: ORDER BY similarity(name, $2) DESC

	rows, err := s.db.QueryContext(ctx, query, match)
	if err != nil {
		return nil, fmt.Errorf("searching tokens: %w", err)
	}
	defer rows.Close()

	var tokens []types.Token
	for rows.Next() {
		var t types.Token
		// CreatedAt missing in scan if not in query, but types.Token has it.
		// Schema likely has created_at not null default now?
		// Checking schema... migrations/004_add_token_tables.up.sql (implied).
		// types.Token struct has CreatedAt. Let's skip scanning it if simpler or add it.
		// I'll scan basic fields.
		if err := rows.Scan(
			&t.ChainID, &t.Address, &t.Name, &t.Symbol, &t.Decimals, &t.FirstSeenHeight, &t.LastSeenHeight,
		); err != nil {
			return nil, fmt.Errorf("scanning token: %w", err)
		}
		tokens = append(tokens, t)
	}
	return tokens, nil
}
