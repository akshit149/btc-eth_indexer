package types

import (
	"math/big"
	"time"
)

// ChainID identifies a blockchain network
type ChainID string

const (
	ChainBTC ChainID = "btc"
	ChainETH ChainID = "eth"
)

// BlockStatus represents the finality state of a block
type BlockStatus string

const (
	StatusPending   BlockStatus = "pending"
	StatusFinalized BlockStatus = "finalized"
	StatusOrphaned  BlockStatus = "orphaned"
)

// Block represents a normalized block across chains
type Block struct {
	ChainID    ChainID
	Height     uint64
	Hash       string
	ParentHash string
	Timestamp  time.Time
	Status     BlockStatus
	RawData    []byte // JSON-encoded chain-specific data
}

// Transaction represents a normalized transaction
type Transaction struct {
	ChainID     ChainID
	BlockHeight uint64
	BlockHash   string
	TxHash      string
	TxIndex     int
	FromAddr    string // Empty for BTC coinbase
	ToAddr      string // Empty for contract creation
	Value       string // Decimal string (satoshi for BTC, wei for ETH)
	Fee         string // Decimal string
	GasUsed     uint64 // ETH only
	Status      BlockStatus
	RawData     []byte
}

// Event represents a decoded contract event (ETH only)
type Event struct {
	ChainID      ChainID
	BlockHeight  uint64
	BlockHash    string
	TxHash       string
	LogIndex     int
	ContractAddr string
	EventName    string // Empty if decode failed
	Topic0       string
	Topics       []string
	Data         []byte // Decoded event data as JSON
	RawData      []byte // Original log as JSON
	Status       BlockStatus
	DecodeFailed bool // True if ABI decode failed
}

// Contract represents an Ethereum smart contract
type Contract struct {
	ChainID     ChainID
	Address     string
	CreatorAddr string
	TxHash      string
	BlockHeight uint64
	CreatedAt   time.Time
}

// Checkpoint represents indexing progress for a chain
type Checkpoint struct {
	ChainID    ChainID
	LastHeight uint64
	LastHash   string
	UpdatedAt  time.Time
}

// NetworkStats holds statistical data for a chain
type NetworkStats struct {
	ChainID           ChainID
	LatestHeight      uint64
	BlocksLastMinute  int
	TxsLastMinute     int
	AvgBlockTime      float64
	IndexerLagSeconds int64
}

// BlockSummary holds simplified block data for range queries
type BlockSummary struct {
	Height    uint64
	Timestamp time.Time
	TxCount   int
	Status    BlockStatus
}

// AddressStatsDiff tracks changes to address statistics during block ingestion
type AddressStatsDiff struct {
	BalanceDelta   *big.Int
	TotalReceived  *big.Int
	TotalSent      *big.Int
	TxCount        int
	LastSeenHeight int64
}

// AddressStats represents the persisted address intelligence data
type AddressStats struct {
	ChainID         ChainID
	Address         string
	Balance         string
	TotalReceived   string
	TotalSent       string
	TxCount         int
	FirstSeenHeight int64
	LastSeenHeight  int64     `json:"last_seen_height"`
	LastUpdatedAt   time.Time `json:"last_updated_at"`
}

// Token represents an ERC20/ERC721 token
type Token struct {
	ChainID         ChainID   `json:"chain_id"`
	Address         string    `json:"address"`
	Name            string    `json:"name"`
	Symbol          string    `json:"symbol"`
	Decimals        int       `json:"decimals"`
	FirstSeenHeight uint64    `json:"first_seen_height"`
	LastSeenHeight  uint64    `json:"last_seen_height"`
	CreatedAt       time.Time `json:"created_at"`
}

// TokenTransfer represents a token movement event
type TokenTransfer struct {
	ChainID      ChainID   `json:"chain_id"`
	TxHash       string    `json:"tx_hash"`
	LogIndex     uint      `json:"log_index"`
	TokenAddress string    `json:"token_address"`
	FromAddr     string    `json:"from_addr"`
	ToAddr       string    `json:"to_addr"`
	Amount       string    `json:"amount"` // Numeric string
	BlockHeight  uint64    `json:"block_height"`
	BlockHash    string    `json:"block_hash"`
	Timestamp    time.Time `json:"timestamp"`
}

// TokenBalance represents the current balance of a token for an address
type TokenBalance struct {
	ChainID      ChainID   `json:"chain_id"`
	Address      string    `json:"address"`
	TokenAddress string    `json:"token_address"`
	Balance      string    `json:"balance"` // Numeric string
	LastUpdated  time.Time `json:"last_updated"`
}
