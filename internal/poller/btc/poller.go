package btc

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/internal/indexer/pkg/types"
)

// Poller implements the ChainPoller interface for Bitcoin
type Poller struct {
	rpcURL    string
	batchSize int
	client    *http.Client
}

// New creates a new BTC poller
func New(rpcURL string, batchSize int) *Poller {
	return &Poller{
		rpcURL:    rpcURL,
		batchSize: batchSize,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// ChainID returns the chain identifier
func (p *Poller) ChainID() types.ChainID {
	return types.ChainBTC
}

// GetChainTip returns the current blockchain height
func (p *Poller) GetChainTip(ctx context.Context) (uint64, error) {
	resp, err := p.rpcCall(ctx, "getblockcount", nil)
	if err != nil {
		return 0, fmt.Errorf("getting block count: %w", err)
	}

	height, ok := resp.(float64)
	if !ok {
		return 0, fmt.Errorf("unexpected response type for getblockcount: %T", resp)
	}

	return uint64(height), nil
}

// Poll fetches blocks from lastHeight+1 up to chain tip (limited by batch size)
func (p *Poller) Poll(ctx context.Context, lastHeight uint64) ([]types.Block, []types.Transaction, error) {
	tip, err := p.GetChainTip(ctx)
	if err != nil {
		return nil, nil, err
	}

	if lastHeight >= tip {
		return nil, nil, nil // Already at tip
	}

	startHeight := lastHeight + 1
	endHeight := startHeight + uint64(p.batchSize) - 1
	if endHeight > tip {
		endHeight = tip
	}

	var blocks []types.Block
	var allTxs []types.Transaction

	for height := startHeight; height <= endHeight; height++ {
		select {
		case <-ctx.Done():
			return nil, nil, ctx.Err()
		default:
		}

		block, txs, err := p.getBlockByHeight(ctx, height)
		if err != nil {
			return nil, nil, fmt.Errorf("getting block %d: %w", height, err)
		}

		blocks = append(blocks, *block)
		allTxs = append(allTxs, txs...)
	}

	return blocks, allTxs, nil
}

// GetBlockByHash fetches a block by its hash
func (p *Poller) GetBlockByHash(ctx context.Context, hash string) (*types.Block, error) {
	resp, err := p.rpcCall(ctx, "getblock", []interface{}{hash, 2}) // verbosity=2 for full tx data
	if err != nil {
		return nil, fmt.Errorf("getting block by hash: %w", err)
	}

	return p.parseBlock(resp)
}

func (p *Poller) getBlockByHeight(ctx context.Context, height uint64) (*types.Block, []types.Transaction, error) {
	// Get block hash at height
	hashResp, err := p.rpcCall(ctx, "getblockhash", []interface{}{height})
	if err != nil {
		return nil, nil, fmt.Errorf("getting block hash: %w", err)
	}

	hash, ok := hashResp.(string)
	if !ok {
		return nil, nil, fmt.Errorf("unexpected response type for getblockhash: %T", hashResp)
	}

	// Get block with transactions
	blockResp, err := p.rpcCall(ctx, "getblock", []interface{}{hash, 2})
	if err != nil {
		return nil, nil, fmt.Errorf("getting block data: %w", err)
	}

	block, err := p.parseBlock(blockResp)
	if err != nil {
		return nil, nil, err
	}

	txs, err := p.parseTransactions(blockResp, block)
	if err != nil {
		return nil, nil, err
	}

	return block, txs, nil
}

func (p *Poller) parseBlock(resp interface{}) (*types.Block, error) {
	blockMap, ok := resp.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected block response type: %T", resp)
	}

	rawData, _ := json.Marshal(blockMap)

	height, _ := blockMap["height"].(float64)
	hash, _ := blockMap["hash"].(string)
	prevHash, _ := blockMap["previousblockhash"].(string)
	timestamp, _ := blockMap["time"].(float64)

	return &types.Block{
		ChainID:    types.ChainBTC,
		Height:     uint64(height),
		Hash:       hash,
		ParentHash: prevHash,
		Timestamp:  time.Unix(int64(timestamp), 0),
		Status:     types.StatusPending,
		RawData:    rawData,
	}, nil
}

func (p *Poller) parseTransactions(blockResp interface{}, block *types.Block) ([]types.Transaction, error) {
	blockMap, ok := blockResp.(map[string]interface{})
	if !ok {
		return nil, nil
	}

	txsRaw, ok := blockMap["tx"].([]interface{})
	if !ok {
		return nil, nil
	}

	var txs []types.Transaction
	for i, txRaw := range txsRaw {
		txMap, ok := txRaw.(map[string]interface{})
		if !ok {
			continue
		}

		rawData, _ := json.Marshal(txMap)

		txHash, _ := txMap["txid"].(string)

		// Calculate total input/output values
		var totalIn, totalOut int64

		// Parse vout (outputs)
		if vouts, ok := txMap["vout"].([]interface{}); ok {
			for _, vout := range vouts {
				if voutMap, ok := vout.(map[string]interface{}); ok {
					if value, ok := voutMap["value"].(float64); ok {
						totalOut += int64(value * 1e8) // Convert BTC to satoshi
					}
				}
			}
		}

		// Parse vin (inputs) - note: coinbase tx has no vin value
		var fromAddr string
		if vins, ok := txMap["vin"].([]interface{}); ok {
			for _, vin := range vins {
				if vinMap, ok := vin.(map[string]interface{}); ok {
					// Check if coinbase
					if _, isCoinbase := vinMap["coinbase"]; isCoinbase {
						fromAddr = "coinbase"
						continue
					}
					// For regular inputs, we'd need to look up the previous tx
					// For simplicity, we'll leave fromAddr empty for non-coinbase
				}
			}
		}

		// Extract first output address as "to" address
		var toAddr string
		if vouts, ok := txMap["vout"].([]interface{}); ok && len(vouts) > 0 {
			if voutMap, ok := vouts[0].(map[string]interface{}); ok {
				if scriptPubKey, ok := voutMap["scriptPubKey"].(map[string]interface{}); ok {
					if addr, ok := scriptPubKey["address"].(string); ok {
						toAddr = addr
					}
				}
			}
		}

		// Fee is input - output (but we don't have input values without extra lookups)
		// For now, we skip fee calculation for BTC
		fee := int64(0)
		if totalIn > totalOut {
			fee = totalIn - totalOut
		}

		tx := types.Transaction{
			ChainID:     types.ChainBTC,
			BlockHeight: block.Height,
			BlockHash:   block.Hash,
			TxHash:      txHash,
			TxIndex:     i,
			FromAddr:    fromAddr,
			ToAddr:      toAddr,
			Value:       strconv.FormatInt(totalOut, 10),
			Fee:         strconv.FormatInt(fee, 10),
			Status:      types.StatusPending,
			RawData:     rawData,
		}

		txs = append(txs, tx)
	}

	return txs, nil
}

// rpcCall makes a JSON-RPC call to the Bitcoin node
func (p *Poller) rpcCall(ctx context.Context, method string, params interface{}) (interface{}, error) {
	if params == nil {
		params = []interface{}{}
	}

	reqBody := map[string]interface{}{
		"jsonrpc": "1.0",
		"id":      "indexer",
		"method":  method,
		"params":  params,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", p.rpcURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("making request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var rpcResp struct {
		Result interface{} `json:"result"`
		Error  *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(respBody, &rpcResp); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	if rpcResp.Error != nil {
		return nil, fmt.Errorf("RPC error %d: %s", rpcResp.Error.Code, rpcResp.Error.Message)
	}

	return rpcResp.Result, nil
}
