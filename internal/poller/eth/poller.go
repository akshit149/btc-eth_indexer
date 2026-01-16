package eth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	ethtypes "github.com/ethereum/go-ethereum/core/types"
	"github.com/internal/indexer/pkg/types"
)

const (
	// DefaultLogBatchSize is the default number of blocks per eth_getLogs call
	DefaultLogBatchSize = 2000
	// MinLogBatchSize is the minimum range before giving up
	MinLogBatchSize = 10
	// MaxLogBatchRetries is the maximum number of range reductions per poll
	MaxLogBatchRetries = 5
	// MaxEventsPerBlockPerContract prevents log-based DoS
	MaxEventsPerBlockPerContract = 1000
)

// ContractConfig holds configuration for a monitored contract
type ContractConfig struct {
	Address common.Address
	ABI     *abi.ABI
	Name    string
}

// Poller implements ChainPoller for Ethereum
type Poller struct {
	rpcURL            string
	batchSize         int
	logBatchSize      int
	useFinalizedTag   bool
	confirmationDepth int
	contracts         []ContractConfig
	decoder           *Decoder
	client            *http.Client
	logger            *slog.Logger

	// Metrics
	logsIndexed     uint64
	decodeFailures  uint64
	rateLimitHits   uint64
	rangeReductions uint64
}

// NewPoller creates a new ETH poller
func NewPoller(
	rpcURL string,
	batchSize int,
	logBatchSize int,
	useFinalizedTag bool,
	confirmationDepth int,
	contracts []ContractConfig,
	logger *slog.Logger,
) *Poller {
	// Build ABI map for decoder
	abiMap := make(map[common.Address]*abi.ABI)
	for _, c := range contracts {
		if c.ABI != nil {
			abiMap[c.Address] = c.ABI
		}
	}

	if logBatchSize == 0 {
		logBatchSize = DefaultLogBatchSize
	}

	return &Poller{
		rpcURL:            rpcURL,
		batchSize:         batchSize,
		logBatchSize:      logBatchSize,
		useFinalizedTag:   useFinalizedTag,
		confirmationDepth: confirmationDepth,
		contracts:         contracts,
		decoder:           NewDecoder(abiMap),
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger.With("chain", "eth"),
	}
}

// ChainID returns the chain identifier
func (p *Poller) ChainID() types.ChainID {
	return types.ChainETH
}

// GetChainTip returns the current head block number
func (p *Poller) GetChainTip(ctx context.Context) (uint64, error) {
	resp, err := p.rpcCall(ctx, "eth_blockNumber", nil)
	if err != nil {
		return 0, fmt.Errorf("eth_blockNumber: %w", err)
	}

	hexNum, ok := resp.(string)
	if !ok {
		return 0, fmt.Errorf("unexpected response type: %T", resp)
	}

	return parseHexUint64(hexNum)
}

// GetFinalizedHeight returns the finalized block height
func (p *Poller) GetFinalizedHeight(ctx context.Context) (uint64, error) {
	if !p.useFinalizedTag {
		// Fallback to confirmation depth
		tip, err := p.GetChainTip(ctx)
		if err != nil {
			return 0, err
		}
		if tip < uint64(p.confirmationDepth) {
			return 0, nil
		}
		return tip - uint64(p.confirmationDepth), nil
	}

	resp, err := p.rpcCall(ctx, "eth_getBlockByNumber", []interface{}{"finalized", false})
	if err != nil {
		// Fallback if finalized tag not supported
		p.logger.Warn("finalized tag failed, falling back to confirmation depth", "error", err)
		tip, tipErr := p.GetChainTip(ctx)
		if tipErr != nil {
			return 0, tipErr
		}
		if tip < uint64(p.confirmationDepth) {
			return 0, nil
		}
		return tip - uint64(p.confirmationDepth), nil
	}

	if resp == nil {
		return 0, nil
	}

	blockMap, ok := resp.(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("unexpected block response type: %T", resp)
	}

	numHex, ok := blockMap["number"].(string)
	if !ok {
		return 0, fmt.Errorf("missing block number")
	}

	return parseHexUint64(numHex)
}

// Poll fetches blocks and transactions (no events)
func (p *Poller) Poll(ctx context.Context, lastHeight uint64) ([]types.Block, []types.Transaction, error) {
	blocks, txs, _, err := p.PollWithEvents(ctx, lastHeight)
	return blocks, txs, err
}

// PollWithEvents fetches blocks, transactions, and events
func (p *Poller) PollWithEvents(ctx context.Context, lastHeight uint64) ([]types.Block, []types.Transaction, []types.Event, error) {
	tip, err := p.GetChainTip(ctx)
	if err != nil {
		return nil, nil, nil, err
	}

	if lastHeight >= tip {
		return nil, nil, nil, nil // At tip
	}

	startHeight := lastHeight + 1
	endHeight := startHeight + uint64(p.batchSize) - 1
	if endHeight > tip {
		endHeight = tip
	}

	var blocks []types.Block
	var allTxs []types.Transaction

	// Fetch blocks and transactions
	for height := startHeight; height <= endHeight; height++ {
		select {
		case <-ctx.Done():
			return nil, nil, nil, ctx.Err()
		default:
		}

		block, txs, err := p.getBlockByNumber(ctx, height)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("getting block %d: %w", height, err)
		}

		blocks = append(blocks, *block)
		allTxs = append(allTxs, txs...)
	}

	// Fetch events if contracts are configured
	var allEvents []types.Event
	if len(p.contracts) > 0 {
		events, err := p.fetchLogs(ctx, startHeight, endHeight)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("fetching logs: %w", err)
		}
		allEvents = events
	}

	return blocks, allTxs, allEvents, nil
}

// GetBlockByHash fetches a block by hash for reorg detection
func (p *Poller) GetBlockByHash(ctx context.Context, hash string) (*types.Block, error) {
	resp, err := p.rpcCall(ctx, "eth_getBlockByHash", []interface{}{hash, true})
	if err != nil {
		return nil, fmt.Errorf("eth_getBlockByHash: %w", err)
	}

	if resp == nil {
		return nil, nil // Block not found
	}

	return p.parseBlock(resp)
}

func (p *Poller) getBlockByNumber(ctx context.Context, height uint64) (*types.Block, []types.Transaction, error) {
	hexHeight := fmt.Sprintf("0x%x", height)

	// Get block with transactions
	resp, err := p.rpcCall(ctx, "eth_getBlockByNumber", []interface{}{hexHeight, true})
	if err != nil {
		return nil, nil, fmt.Errorf("eth_getBlockByNumber: %w", err)
	}

	if resp == nil {
		return nil, nil, fmt.Errorf("block %d not found", height)
	}

	block, err := p.parseBlock(resp)
	if err != nil {
		return nil, nil, err
	}

	txs, err := p.parseTransactions(resp, block)
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

	numHex, _ := blockMap["number"].(string)
	height, err := parseHexUint64(numHex)
	if err != nil {
		return nil, fmt.Errorf("parsing block number: %w", err)
	}

	hash, _ := blockMap["hash"].(string)
	parentHash, _ := blockMap["parentHash"].(string)
	timestampHex, _ := blockMap["timestamp"].(string)

	timestamp, _ := parseHexUint64(timestampHex)

	// Validate hash format
	if len(hash) != 66 || !isHexString(hash) {
		return nil, fmt.Errorf("invalid block hash format: %s", hash)
	}

	return &types.Block{
		ChainID:    types.ChainETH,
		Height:     height,
		Hash:       hash,
		ParentHash: parentHash,
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

	txsRaw, ok := blockMap["transactions"].([]interface{})
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

		txHash, _ := txMap["hash"].(string)
		from, _ := txMap["from"].(string)
		to, _ := txMap["to"].(string) // May be null for contract creation
		valueHex, _ := txMap["value"].(string)

		value := parseHexBigInt(valueHex)

		tx := types.Transaction{
			ChainID:     types.ChainETH,
			BlockHeight: block.Height,
			BlockHash:   block.Hash,
			TxHash:      txHash,
			TxIndex:     i,
			FromAddr:    from,
			ToAddr:      to,
			Value:       value.String(),
			Status:      types.StatusPending,
			RawData:     rawData,
		}

		txs = append(txs, tx)
	}

	return txs, nil
}

func (p *Poller) fetchLogs(ctx context.Context, fromBlock, toBlock uint64) ([]types.Event, error) {
	// Build contract address filter
	addresses := make([]string, len(p.contracts))
	for i, c := range p.contracts {
		addresses[i] = c.Address.Hex()
	}

	var allEvents []types.Event
	currentFrom := fromBlock
	batchSize := uint64(p.logBatchSize)
	retries := 0

	for currentFrom <= toBlock {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		currentTo := currentFrom + batchSize - 1
		if currentTo > toBlock {
			currentTo = toBlock
		}

		events, err := p.fetchLogsRange(ctx, currentFrom, currentTo, addresses)
		if err != nil {
			// Check for rate limit
			if isRateLimitError(err) {
				p.rateLimitHits++
				time.Sleep(time.Second * time.Duration(1<<retries)) // Exponential backoff
				retries++
				if retries > MaxLogBatchRetries {
					return nil, fmt.Errorf("max retries exceeded after rate limiting: %w", err)
				}
				continue
			}

			// Check for range too large error
			if isRangeTooLargeError(err) {
				p.rangeReductions++
				batchSize = batchSize / 2
				if batchSize < MinLogBatchSize {
					return nil, fmt.Errorf("log batch size reduced below minimum: %w", err)
				}
				p.logger.Warn("reducing log batch size", "new_size", batchSize)
				retries++
				if retries > MaxLogBatchRetries {
					return nil, fmt.Errorf("max log batch retries exceeded: %w", err)
				}
				continue
			}

			return nil, err
		}

		allEvents = append(allEvents, events...)
		currentFrom = currentTo + 1
		retries = 0 // Reset retries on success
	}

	return allEvents, nil
}

func (p *Poller) fetchLogsRange(ctx context.Context, fromBlock, toBlock uint64, addresses []string) ([]types.Event, error) {
	params := map[string]interface{}{
		"fromBlock": fmt.Sprintf("0x%x", fromBlock),
		"toBlock":   fmt.Sprintf("0x%x", toBlock),
		"address":   addresses,
	}

	resp, err := p.rpcCall(ctx, "eth_getLogs", []interface{}{params})
	if err != nil {
		return nil, err
	}

	logsRaw, ok := resp.([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected logs response type: %T", resp)
	}

	// Track events per block per contract for DoS protection
	eventCounts := make(map[uint64]map[common.Address]int)

	var events []types.Event
	for _, logRaw := range logsRaw {
		logMap, ok := logRaw.(map[string]interface{})
		if !ok {
			continue
		}

		event, err := p.parseLog(logMap, eventCounts)
		if err != nil {
			p.logger.Warn("failed to parse log", "error", err)
			continue
		}

		if event != nil {
			events = append(events, *event)
			p.logsIndexed++
		}
	}

	return events, nil
}

func (p *Poller) parseLog(logMap map[string]interface{}, eventCounts map[uint64]map[common.Address]int) (*types.Event, error) {
	blockNumHex, _ := logMap["blockNumber"].(string)
	blockNum, err := parseHexUint64(blockNumHex)
	if err != nil {
		return nil, fmt.Errorf("parsing block number: %w", err)
	}

	blockHash, _ := logMap["blockHash"].(string)
	txHash, _ := logMap["transactionHash"].(string)
	logIndexHex, _ := logMap["logIndex"].(string)
	logIndex, _ := parseHexUint64(logIndexHex)

	addressStr, _ := logMap["address"].(string)
	address := common.HexToAddress(addressStr)

	// DoS protection: limit events per block per contract
	if eventCounts[blockNum] == nil {
		eventCounts[blockNum] = make(map[common.Address]int)
	}
	eventCounts[blockNum][address]++
	if eventCounts[blockNum][address] > MaxEventsPerBlockPerContract {
		p.logger.Warn("event limit exceeded for contract in block",
			"contract", addressStr,
			"block", blockNum,
			"limit", MaxEventsPerBlockPerContract,
		)
		return nil, nil // Skip but don't error
	}

	topicsRaw, _ := logMap["topics"].([]interface{})
	topics := make([]string, len(topicsRaw))
	for i, t := range topicsRaw {
		topics[i], _ = t.(string)
	}

	dataHex, _ := logMap["data"].(string)
	rawData, _ := json.Marshal(logMap)

	// Build go-ethereum log for decoder
	var ethTopics []common.Hash
	for _, t := range topics {
		ethTopics = append(ethTopics, common.HexToHash(t))
	}
	ethLog := ethtypes.Log{
		Address: address,
		Topics:  ethTopics,
		Data:    common.FromHex(dataHex),
	}

	// Attempt decode
	var eventName string
	var decodedData []byte
	var decodeFailed bool

	decoded, err := p.decoder.DecodeLog(ethLog)
	if err != nil {
		p.decodeFailures++
		decodeFailed = true
		p.logger.Debug("decode failed", "error", err, "contract", addressStr)
	} else {
		eventName = decoded.Name
		decodedData, _ = json.Marshal(decoded.Params)
	}

	topic0 := ""
	if len(topics) > 0 {
		topic0 = topics[0]
	}

	return &types.Event{
		ChainID:      types.ChainETH,
		BlockHeight:  blockNum,
		BlockHash:    blockHash,
		TxHash:       txHash,
		LogIndex:     int(logIndex),
		ContractAddr: addressStr,
		EventName:    eventName,
		Topic0:       topic0,
		Topics:       topics,
		Data:         decodedData,
		RawData:      rawData,
		Status:       types.StatusPending,
		DecodeFailed: decodeFailed,
	}, nil
}

// rpcCall makes a JSON-RPC call
func (p *Poller) rpcCall(ctx context.Context, method string, params interface{}) (interface{}, error) {
	if params == nil {
		params = []interface{}{}
	}

	reqBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
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

	// Check for rate limiting
	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("rate limited: HTTP 429")
	}

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

// GetMetrics returns ETH-specific metrics
func (p *Poller) GetMetrics() (logsIndexed, decodeFailures, rateLimitHits, rangeReductions uint64) {
	return p.logsIndexed, p.decodeFailures, p.rateLimitHits, p.rangeReductions
}

// LoadContractsFromConfig loads contract configurations from file paths
func LoadContractsFromConfig(configs []struct {
	Address string
	ABIPath string
	Name    string
}) ([]ContractConfig, error) {
	var contracts []ContractConfig

	for _, cfg := range configs {
		abiData, err := os.ReadFile(cfg.ABIPath)
		if err != nil {
			return nil, fmt.Errorf("reading ABI %s: %w", cfg.ABIPath, err)
		}

		parsedABI, err := LoadABIFromJSON(abiData)
		if err != nil {
			return nil, fmt.Errorf("parsing ABI %s: %w", cfg.ABIPath, err)
		}

		contracts = append(contracts, ContractConfig{
			Address: common.HexToAddress(cfg.Address),
			ABI:     parsedABI,
			Name:    cfg.Name,
		})
	}

	return contracts, nil
}

// Helper functions

func parseHexUint64(hex string) (uint64, error) {
	if len(hex) < 2 {
		return 0, fmt.Errorf("invalid hex: %s", hex)
	}
	if hex[:2] == "0x" || hex[:2] == "0X" {
		hex = hex[2:]
	}
	return strconv.ParseUint(hex, 16, 64)
}

func parseHexBigInt(hex string) *big.Int {
	if hex == "" {
		return big.NewInt(0)
	}
	if len(hex) > 2 && (hex[:2] == "0x" || hex[:2] == "0X") {
		hex = hex[2:]
	}
	val, _ := new(big.Int).SetString(hex, 16)
	if val == nil {
		return big.NewInt(0)
	}
	return val
}

func isHexString(s string) bool {
	if len(s) < 2 || s[:2] != "0x" {
		return false
	}
	for _, c := range s[2:] {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

func isRateLimitError(err error) bool {
	return err != nil && (contains(err.Error(), "429") ||
		contains(err.Error(), "rate limit"))
}

func isRangeTooLargeError(err error) bool {
	return err != nil && (contains(err.Error(), "query returned more than") ||
		contains(err.Error(), "range too large") ||
		contains(err.Error(), "block range"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsImpl(s, substr))
}

func containsImpl(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
