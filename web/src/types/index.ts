export type ChainID = "btc" | "eth";

export type BlockStatus = "pending" | "finalized" | "orphaned";

export interface Block {
    ChainID: ChainID;
    Height: number;
    Hash: string;
    ParentHash: string;
    Timestamp: string;
    Status: BlockStatus;
    RawData?: string; // JSON string
}

export interface Transaction {
    ChainID: ChainID;
    BlockHeight: number;
    BlockHash: string;
    TxHash: string;
    TxIndex: number;
    FromAddr: string;
    ToAddr: string;
    Value: string; // Decimal string
    Fee: string; // Decimal string
    GasUsed?: number;
    Status: BlockStatus;
    RawData?: string;
}

export interface Event {
    ChainID: ChainID;
    BlockHeight: number;
    BlockHash: string;
    TxHash: string;
    LogIndex: number;
    ContractAddr: string;
    EventName: string;
    Topic0: string;
    Topics: string[];
    Data: string; // JSON string or hex
    RawData?: string;
    Status: BlockStatus;
    DecodeFailed: boolean;
}

export interface TxResponse {
    data: Transaction[];
    cursor?: string;
}

export interface Stats {
    blocksPerMin: number;
    avgLatencyMs: number;
    lastCheckpointHeight: number;
    reorgCount: number;
}

// From GET /stats/{chain}
export interface NetworkStats {
    ChainID: ChainID;
    LatestHeight: number;
    BlocksLastMinute: number;
    TxsLastMinute: number;
    AvgBlockTime: number;
    IndexerLagSeconds: number;
}

// From GET /blocks/{chain}/range
export interface BlockSummary {
    Height: number;
    Timestamp: string;
    Status: BlockStatus;
}

export interface Contract {
    ChainID: ChainID;
    Address: string;
    CreatorAddr: string;
    TxHash: string;
    BlockHeight: number;
    CreatedAt: string;
}

export interface AddressStats {
    ChainID: ChainID;
    Address: string;
    Balance: string;
    TotalReceived: string;
    TotalSent: string;
    TxCount: number;
    FirstSeenHeight: number;
    LastSeenHeight: number;
    LastUpdatedAt: string;
}
