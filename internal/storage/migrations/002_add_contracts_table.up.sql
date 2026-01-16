-- Migration: 002_add_contracts_table.up.sql

CREATE TABLE IF NOT EXISTS contracts (
    chain_id        VARCHAR(16) NOT NULL DEFAULT 'eth',
    address         VARCHAR(42) NOT NULL,
    creator_addr    VARCHAR(42),
    tx_hash         VARCHAR(66) NOT NULL,
    block_height    BIGINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (chain_id, address)
);

CREATE INDEX IF NOT EXISTS idx_contracts_creator ON contracts(chain_id, creator_addr);
