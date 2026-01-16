package types

import "time"

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
