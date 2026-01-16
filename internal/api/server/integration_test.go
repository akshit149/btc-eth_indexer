package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/internal/indexer/internal/api/auth"
	"github.com/internal/indexer/internal/api/config"
	"github.com/internal/indexer/internal/api/query"
	"github.com/internal/indexer/internal/api/service"
	"github.com/internal/indexer/pkg/types"
)

// MockStore implements query.Store
type MockStore struct{}

func (m *MockStore) GetLatestBlock(ctx context.Context, chainID types.ChainID) (*types.Block, error) {
	return &types.Block{
		ChainID: chainID,
		Height:  100,
		Hash:    "hash123",
		Status:  types.StatusFinalized,
	}, nil
}
func (m *MockStore) GetBlockByHeight(ctx context.Context, chainID types.ChainID, height uint64) (*types.Block, error) {
	return &types.Block{
		ChainID: chainID,
		Height:  height,
		Hash:    "hash_height",
		Status:  types.StatusFinalized,
	}, nil
}
func (m *MockStore) GetBlockByHash(ctx context.Context, chainID types.ChainID, hash string) (*types.Block, error) {
	return &types.Block{
		ChainID: chainID,
		Height:  100,
		Hash:    hash,
		Status:  types.StatusFinalized,
	}, nil
}
func (m *MockStore) GetTx(ctx context.Context, chainID types.ChainID, hash string) (*types.Transaction, error) {
	return &types.Transaction{
		ChainID: chainID,
		TxHash:  hash,
		Status:  types.StatusFinalized,
	}, nil
}
func (m *MockStore) GetTransactionsByAddress(ctx context.Context, chainID types.ChainID, address, cursor string, limit int) ([]*types.Transaction, string, error) {
	return []*types.Transaction{}, "", nil
}
func (m *MockStore) GetTransactionsByBlock(ctx context.Context, chainID types.ChainID, blockID string, cursor string, limit int) ([]*types.Transaction, string, error) {
	return []*types.Transaction{{TxHash: "tx1"}}, "next_cursor", nil
}
func (m *MockStore) GetLatestTransactions(ctx context.Context, chainID types.ChainID, limit int) ([]*types.Transaction, error) {
	return []*types.Transaction{{TxHash: "latest_tx1"}}, nil
}
func (m *MockStore) GetNetworkStats(ctx context.Context, chainID types.ChainID) (*types.NetworkStats, error) {
	return &types.NetworkStats{ChainID: chainID, LatestHeight: 1000}, nil
}
func (m *MockStore) GetBlocksRange(ctx context.Context, chainID types.ChainID, fromHeight, toHeight uint64) ([]*types.BlockSummary, error) {
	return []*types.BlockSummary{{Height: fromHeight}, {Height: toHeight}}, nil
}
func (m *MockStore) GetEvents(ctx context.Context, filter query.EventFilter) ([]*types.Event, string, error) {
	return []*types.Event{}, "", nil
}
func (m *MockStore) GetAddressBalance(ctx context.Context, chainID types.ChainID, address string) (string, error) {
	return "1000", nil
}
func (m *MockStore) Close() error { return nil }

// MockCache implements cache.Cache
type MockCache struct{}

func (m *MockCache) Get(ctx context.Context, key string, dest interface{}) (bool, error) {
	return false, nil
}
func (m *MockCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	return nil
}
func (m *MockCache) Incr(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	return 1, nil
}
func (m *MockCache) Close() error { return nil }

func setupServer() *Server {
	cfg := config.ServerConfig{Port: 8080}
	authCfg := config.AuthConfig{RateLimitRequests: 100}

	store := &MockStore{}
	c := &MockCache{}
	svc := service.New(store, c)
	am := auth.New(c, authCfg)

	return New(cfg, svc, am)
}

func TestIntegration_Health(t *testing.T) {
	server := setupServer()

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestIntegration_GetLatestBlock(t *testing.T) {
	server := setupServer()

	req := httptest.NewRequest("GET", "/blocks/latest?chain=btc", nil)
	req.Header.Set("X-API-Key", "test-key")

	w := httptest.NewRecorder()

	server.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestIntegration_ExplorerEndpoints(t *testing.T) {
	server := setupServer()

	tests := []struct {
		name string
		path string
	}{
		{"GetBlockTxs", "/blocks/btc/100/txs"},
		{"GetLatestTxs", "/txs/latest?chain=btc"},
		{"GetStats", "/stats/btc"},
		{"GetBlocksRange", "/blocks/btc/range?from=1&to=10"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.path, nil)
			req.Header.Set("X-API-Key", "test-key")
			w := httptest.NewRecorder()

			server.router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("%s: expected 200, got %d", tt.name, w.Code)
			}
		})
	}
}
