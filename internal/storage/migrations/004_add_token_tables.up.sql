CREATE TABLE IF NOT EXISTS tokens (
    chain_id TEXT NOT NULL,
    address TEXT NOT NULL,
    name TEXT,
    symbol TEXT,
    decimals INT,
    first_seen_height BIGINT,
    last_seen_height BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chain_id, address)
);

CREATE TABLE IF NOT EXISTS token_transfers (
    chain_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    log_index INT NOT NULL,
    token_address TEXT NOT NULL,
    from_addr TEXT NOT NULL,
    to_addr TEXT NOT NULL,
    amount NUMERIC(78, 0), -- Support uint256
    block_height BIGINT NOT NULL,
    block_hash TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (chain_id, tx_hash, log_index)
);

CREATE INDEX idx_token_transfers_token_addr ON token_transfers(chain_id, token_address);
CREATE INDEX idx_token_transfers_from_addr ON token_transfers(chain_id, from_addr);
CREATE INDEX idx_token_transfers_to_addr ON token_transfers(chain_id, to_addr);
CREATE INDEX idx_token_transfers_block_height ON token_transfers(chain_id, block_height);

CREATE TABLE IF NOT EXISTS token_balances (
    chain_id TEXT NOT NULL,
    address TEXT NOT NULL,
    token_address TEXT NOT NULL,
    balance NUMERIC(78, 0) DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chain_id, address, token_address)
);

CREATE INDEX idx_token_balances_address ON token_balances(chain_id, address);
