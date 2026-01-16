-- Migration: 003_add_address_stats.up.sql

CREATE TABLE IF NOT EXISTS address_stats (
    chain_id            VARCHAR(16) NOT NULL,
    address             VARCHAR(66) NOT NULL, -- ETH addresses are 42, BTC can be longer
    balance             NUMERIC(78, 0) NOT NULL DEFAULT 0,
    total_received      NUMERIC(78, 0) NOT NULL DEFAULT 0,
    total_sent          NUMERIC(78, 0) NOT NULL DEFAULT 0,
    tx_count            INT NOT NULL DEFAULT 0,
    first_seen_height   BIGINT,
    last_seen_height    BIGINT,
    last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (chain_id, address)
);

-- Index for ranking (Rich List support later)
CREATE INDEX IF NOT EXISTS idx_address_stats_balance ON address_stats(chain_id, balance DESC);
