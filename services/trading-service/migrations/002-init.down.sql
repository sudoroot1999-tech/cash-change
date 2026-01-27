-- Trading Service Database Schema Rollback
-- Migration: 000001_init_schema
-- Description: Rollback initial schema for trading-go service

-- Drop triggers
DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS update_trading_pairs_updated_at ON trading_pairs;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order of creation due to foreign keys)
DROP TABLE IF EXISTS liquidations;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS trading_pairs;

-- Drop enum types
DROP TYPE IF EXISTS trading_pair_status;
DROP TYPE IF EXISTS margin_mode;
DROP TYPE IF EXISTS trading_type;
DROP TYPE IF EXISTS time_in_force;
DROP TYPE IF EXISTS order_status;
DROP TYPE IF EXISTS order_side;
DROP TYPE IF EXISTS order_type;
