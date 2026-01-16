-- Migration: 001_initial_schema.up.sql
-- Creates the core tables for block indexing

-- Blocks table (chain-agnostic)
CREATE TABLE IF NOT EXISTS blocks (
    id              BIGSERIAL PRIMARY KEY,
    chain_id        VARCHAR(16) NOT NULL,
    height          BIGINT NOT NULL,
    hash            VARCHAR(66) NOT NULL,
    parent_hash     VARCHAR(66) NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'pending',
    raw_data        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT blocks_chain_height_hash_unique UNIQUE(chain_id, height, hash)
);

CREATE INDEX IF NOT EXISTS idx_blocks_chain_height ON blocks(chain_id, height);
CREATE INDEX IF NOT EXISTS idx_blocks_chain_hash ON blocks(chain_id, hash);
CREATE INDEX IF NOT EXISTS idx_blocks_chain_status ON blocks(chain_id, status);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id              BIGSERIAL PRIMARY KEY,
    chain_id        VARCHAR(16) NOT NULL,
    block_height    BIGINT NOT NULL,
    block_hash      VARCHAR(66) NOT NULL,
    tx_hash         VARCHAR(66) NOT NULL,
    tx_index        INT NOT NULL,
    from_addr       VARCHAR(66),
    to_addr         VARCHAR(66),
    value           NUMERIC(78, 0),
    fee             NUMERIC(78, 0),
    gas_used        BIGINT,
    status          VARCHAR(16) NOT NULL DEFAULT 'pending',
    raw_data        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT transactions_chain_txhash_unique UNIQUE(chain_id, tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_transactions_chain_block ON transactions(chain_id, block_height);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(chain_id, from_addr) WHERE from_addr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(chain_id, to_addr) WHERE to_addr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(chain_id, tx_hash);

-- Events table (ETH only)
CREATE TABLE IF NOT EXISTS events (
    id              BIGSERIAL PRIMARY KEY,
    chain_id        VARCHAR(16) NOT NULL DEFAULT 'eth',
    block_height    BIGINT NOT NULL,
    block_hash      VARCHAR(66) NOT NULL,
    tx_hash         VARCHAR(66) NOT NULL,
    log_index       INT NOT NULL,
    contract_addr   VARCHAR(42) NOT NULL,
    event_name      VARCHAR(128),
    topic0          VARCHAR(66) NOT NULL,
    topics          JSONB,
    data            TEXT,
    raw_data        TEXT,
    status          VARCHAR(16) NOT NULL DEFAULT 'pending',
    decode_failed   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT events_chain_tx_logindex_unique UNIQUE(chain_id, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_events_contract ON events(chain_id, contract_addr, block_height);
CREATE INDEX IF NOT EXISTS idx_events_block_height ON events(chain_id, block_height);
CREATE INDEX IF NOT EXISTS idx_events_topic0 ON events(chain_id, topic0);

-- Checkpoints table (one row per chain)
CREATE TABLE IF NOT EXISTS checkpoints (
    chain_id        VARCHAR(16) PRIMARY KEY,
    last_height     BIGINT NOT NULL,
    last_hash       VARCHAR(66) NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orphaned blocks archive
CREATE TABLE IF NOT EXISTS orphaned_blocks (
    id              BIGSERIAL PRIMARY KEY,
    chain_id        VARCHAR(16) NOT NULL,
    height          BIGINT NOT NULL,
    hash            VARCHAR(66) NOT NULL,
    parent_hash     VARCHAR(66) NOT NULL,
    orphaned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    original_data   TEXT
);

CREATE INDEX IF NOT EXISTS idx_orphaned_chain_height ON orphaned_blocks(chain_id, height);
