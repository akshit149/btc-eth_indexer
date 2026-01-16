CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_tokens_name_trgm ON tokens USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol_trgm ON tokens USING gin (symbol gin_trgm_ops);
