-- Migration: 001_initial_schema.down.sql
-- Drops all tables in reverse order

DROP TABLE IF EXISTS orphaned_blocks;
DROP TABLE IF EXISTS checkpoints;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS blocks;
