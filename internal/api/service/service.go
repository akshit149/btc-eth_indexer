package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/internal/indexer/internal/api/cache"
	"github.com/internal/indexer/internal/api/query"
	"github.com/internal/indexer/pkg/types"
)

// Service defines the business logic including caching
type Service struct {
	store query.Store
	cache cache.Cache
}

// New creates a new Service
func New(store query.Store, cache cache.Cache) *Service {
	return &Service{
		store: store,
		cache: cache,
	}
}

// GetLatestBlock returns the latest block, using cache
func (s *Service) GetLatestBlock(ctx context.Context, chainID types.ChainID) (*types.Block, error) {
	key := cache.LatestBlockKey(string(chainID))

	// properties: cached
	var block types.Block
	found, err := s.cache.Get(ctx, key, &block)
	if err == nil && found {
		return &block, nil
	}

	// db lookup
	b, err := s.store.GetLatestBlock(ctx, chainID)
	if err != nil {
		return nil, err
	}
	if b == nil {
		return nil, nil // Not found
	}

	// cache populate (short TTL for latest)
	// We use a short TTL because "latest" changes frequently.
	// We defined ShortCacheTTL in config/redis.go (default 15s).
	// But here we don't have access to config directly unless passed or hardcoded/method on cache.
	// cache.Set uses default TTL if 0. We might want to pass explicit short TTL.
	// Let's assume 5 seconds for latest block to be safe.
	s.cache.Set(ctx, key, b, 5*time.Second)

	return b, nil
}

// GetBlockByHeight returns a block by height, using cache
func (s *Service) GetBlockByHeight(ctx context.Context, chainID types.ChainID, height uint64) (*types.Block, error) {
	key := cache.BlockHeightKey(string(chainID), height)

	var block types.Block
	found, err := s.cache.Get(ctx, key, &block)
	if err == nil && found {
		return &block, nil
	}

	b, err := s.store.GetBlockByHeight(ctx, chainID, height)
	if err != nil {
		return nil, err
	}
	if b == nil {
		return nil, nil
	}

	// Cache indefinitely/long TTL for historical blocks?
	// If the block is NOT finalized, we should cache shortly.
	// If finalized, longer.
	ttl := 1 * time.Hour // Default long
	if b.Status != types.StatusFinalized {
		ttl = 10 * time.Second
	}

	s.cache.Set(ctx, key, b, ttl)

	// Also cache by hash if possible?
	// The prompt requirement implies lookups. We can dual-cache.
	s.cache.Set(ctx, cache.BlockKey(string(chainID), b.Hash), b, ttl)

	return b, nil
}

// GetBlockByHash returns a block by hash, using cache
func (s *Service) GetBlockByHash(ctx context.Context, chainID types.ChainID, hash string) (*types.Block, error) {
	key := cache.BlockKey(string(chainID), hash)

	var block types.Block
	found, err := s.cache.Get(ctx, key, &block)
	if err == nil && found {
		return &block, nil
	}

	b, err := s.store.GetBlockByHash(ctx, chainID, hash)
	if err != nil {
		return nil, err
	}
	if b == nil {
		return nil, nil
	}

	ttl := 1 * time.Hour
	if b.Status != types.StatusFinalized {
		ttl = 10 * time.Second
	}

	s.cache.Set(ctx, key, b, ttl)
	// Key by height too
	s.cache.Set(ctx, cache.BlockHeightKey(string(chainID), b.Height), b, ttl)

	return b, nil
}

// GetTx returns a transaction by hash, using cache
func (s *Service) GetTx(ctx context.Context, chainID types.ChainID, hash string) (*types.Transaction, error) {
	key := cache.TxKey(string(chainID), hash)

	var tx types.Transaction
	found, err := s.cache.Get(ctx, key, &tx)
	if err == nil && found {
		return &tx, nil
	}

	t, err := s.store.GetTx(ctx, chainID, hash)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, nil
	}

	s.cache.Set(ctx, key, t, 1*time.Hour) // Tx are usually immutable unless reorg
	return t, nil
}

// GetTransactionsByAddress returns txs for address
func (s *Service) GetTransactionsByAddress(ctx context.Context, chainID types.ChainID, address, cursor string, limit int) ([]*types.Transaction, string, error) {
	// List queries are harder to cache effectively due to cursors.
	// We will skip caching for now or implement short caching based on params hash.
	return s.store.GetTransactionsByAddress(ctx, chainID, address, cursor, limit)
}

// GetEvents returns events based on filter, using cache for specific queries?
func (s *Service) GetEvents(ctx context.Context, filter query.EventFilter) ([]*types.Event, string, error) {
	// If query is broad, maybe cache?
	// Let's generate a cache key from filter
	cacheKey := fmt.Sprintf("events:%s:%s:%s:%s:%s:%s:%d",
		filter.ChainID, filter.ContractAddr, filter.Topic0,
		strPtr(filter.FromHeight), strPtr(filter.ToHeight), filter.Cursor, filter.Limit)

	hashedKey := sha256.Sum256([]byte(cacheKey))
	key := "req:events:" + hex.EncodeToString(hashedKey[:])

	var cachedResult struct {
		Events []*types.Event
		Cursor string
	}
	found, err := s.cache.Get(ctx, key, &cachedResult)
	if err == nil && found {
		return cachedResult.Events, cachedResult.Cursor, nil
	}

	events, nextCursor, err := s.store.GetEvents(ctx, filter)
	if err != nil {
		return nil, "", err
	}

	// Cache for short time
	result := struct {
		Events []*types.Event
		Cursor string
	}{Events: events, Cursor: nextCursor}

	s.cache.Set(ctx, key, result, 10*time.Second)

	return events, nextCursor, nil
}

// GetBlockTransactions returns transactions for a block with pagination
func (s *Service) GetBlockTransactions(ctx context.Context, chainID types.ChainID, blockID, cursor string, limit int) ([]*types.Transaction, string, error) {
	// Cache page results?
	// Key: blocktx:{chain}:{id}:{cursor}:{limit}
	// TTL: 15s
	key := fmt.Sprintf("blocktx:%s:%s:%s:%d", chainID, blockID, cursor, limit)

	type CachedPage struct {
		Txs    []*types.Transaction
		Cursor string
	}
	var page CachedPage
	found, err := s.cache.Get(ctx, key, &page)
	if err == nil && found {
		return page.Txs, page.Cursor, nil
	}

	txs, next, err := s.store.GetTransactionsByBlock(ctx, chainID, blockID, cursor, limit)
	if err != nil {
		return nil, "", err
	}

	s.cache.Set(ctx, key, CachedPage{Txs: txs, Cursor: next}, 15*time.Second)
	return txs, next, nil
}

// GetLatestTransactions returns latest tx feed
func (s *Service) GetLatestTransactions(ctx context.Context, chainID types.ChainID, limit int) ([]*types.Transaction, error) {
	key := fmt.Sprintf("feed:txs:%s:%d", chainID, limit)

	var txs []*types.Transaction
	found, err := s.cache.Get(ctx, key, &txs)
	if err == nil && found {
		return txs, nil
	}

	txs, err = s.store.GetLatestTransactions(ctx, chainID, limit)
	if err != nil {
		return nil, err
	}

	s.cache.Set(ctx, key, txs, 5*time.Second)
	return txs, nil
}

// GetNetworkStats returns simple stats
func (s *Service) GetNetworkStats(ctx context.Context, chainID types.ChainID) (*types.NetworkStats, error) {
	key := fmt.Sprintf("stats:%s", chainID)

	var stats types.NetworkStats
	found, err := s.cache.Get(ctx, key, &stats)
	if err == nil && found {
		return &stats, nil
	}

	st, err := s.store.GetNetworkStats(ctx, chainID)
	if err != nil {
		return nil, err
	}
	if st == nil {
		return nil, nil
	}

	s.cache.Set(ctx, key, st, 3*time.Second)
	return st, nil
}

// GetBlocksRange returns block summaries for charts
func (s *Service) GetBlocksRange(ctx context.Context, chainID types.ChainID, from, to uint64) ([]*types.BlockSummary, error) {
	// Range queries are cacheable if historical (to < current_height).
	// If "to" is near tip, cache short.
	// Key: range:{chain}:{from}:{to}
	key := fmt.Sprintf("range:%s:%d:%d", chainID, from, to)

	var blocks []*types.BlockSummary
	found, err := s.cache.Get(ctx, key, &blocks)
	if err == nil && found {
		return blocks, nil
	}

	blocks, err = s.store.GetBlocksRange(ctx, chainID, from, to)
	if err != nil {
		return nil, err
	}

	s.cache.Set(ctx, key, blocks, 10*time.Second) // Broad TTL for simplicity
	return blocks, nil
}

func strPtr(u *uint64) string {
	if u == nil {
		return "nil"
	}
	return fmt.Sprintf("%d", *u)
}

// GetAddressBalance returns the balance for an address
func (s *Service) GetAddressBalance(ctx context.Context, chainID types.ChainID, address string) (string, error) {
	// Cache balance?
	// It changes frequently. Short TTL.
	key := fmt.Sprintf("balance:%s:%s", chainID, address)

	var balance string
	found, err := s.cache.Get(ctx, key, &balance)
	if err == nil && found {
		return balance, nil
	}

	balance, err = s.store.GetAddressBalance(ctx, chainID, address)
	if err != nil {
		return "0", err
	}

	s.cache.Set(ctx, key, balance, 5*time.Second)
	return balance, nil
}
