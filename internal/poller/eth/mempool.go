package eth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/internal/indexer/internal/api/cache"
)

// MempoolPoller polls for pending transactions
type MempoolPoller struct {
	rpcURL string
	cache  cache.Cache
	logger *slog.Logger
	quit   chan struct{}
}

// NewMempoolPoller creates a new MempoolPoller
func NewMempoolPoller(rpcURL string, cache cache.Cache, logger *slog.Logger) *MempoolPoller {
	return &MempoolPoller{
		rpcURL: rpcURL,
		cache:  cache,
		logger: logger.With("component", "mempool_poller"),
		quit:   make(chan struct{}),
	}
}

// Start begins polling for pending transactions
func (p *MempoolPoller) Start() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	p.logger.Info("Starting Mempool Poller")

	for {
		select {
		case <-ticker.C:
			if err := p.pollPending(); err != nil {
				p.logger.Error("Failed to poll pending block", "error", err)
			}
		case <-p.quit:
			return
		}
	}
}

// Stop stops the poller
func (p *MempoolPoller) Stop() {
	close(p.quit)
}

func (p *MempoolPoller) pollPending() error {
	// reuse existing helpers or create minimal rpc call
	// For mempool, we need "pending" block

	// Create request
	reqBody := []byte(`{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["pending", true],"id":1}`)
	resp, err := p.doRPC(reqBody)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// custom struct to parse simplified RPC response for mempool
	type RPCTransaction struct {
		Hash string `json:"hash"`
		// Add other fields if needed for UI, e.g. From, To, Value
		From  string `json:"from"`
		To    string `json:"to"`
		Value string `json:"value"`
	}

	var rpcResp struct {
		Result *struct {
			Transactions []RPCTransaction `json:"transactions"`
		} `json:"result"`
		Error *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return fmt.Errorf("decoding response: %w", err)
	}

	if rpcResp.Error != nil {
		return fmt.Errorf("rpc error: %s", rpcResp.Error.Message)
	}

	if rpcResp.Result == nil {
		return nil // No pending block or empty
	}

	// Extract transactions
	// We only want a summary list for the mempool view
	// Store in Redis with short TTL

	// Simplify: just store the whole list of tx hashes or a few details?
	// The verified checking plan says "/txs/pending/{chain}" endpoint.
	// Frontend wants to show "Pending Transactions".
	// Let's store the full slice of transactions as JSON

	ctx := context.Background()
	key := "mempool:eth:latest"

	// Convert to simpler struct if needed, but types.Block already has simplified Txs?
	// types.Block has Txs []Transaction

	// We'll limit the number of txs stored to avoid huge redis payloads if pending is massive
	maxTxs := 50
	txs := rpcResp.Result.Transactions
	if len(txs) > maxTxs {
		txs = txs[:maxTxs]
	}

	if err := p.cache.Set(ctx, key, txs, 15*time.Second); err != nil {
		return fmt.Errorf("cache set: %w", err)
	}

	return nil
}

func (p *MempoolPoller) doRPC(body []byte) (*http.Response, error) {
	// Basic HTTP client
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post(p.rpcURL, "application/json", bytes.NewReader(body))
	// Note: bytes import needed
	if err != nil {
		return nil, err
	}
	return resp, nil
}
