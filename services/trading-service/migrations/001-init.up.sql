-- Trading Service Database Schema
-- Migration: 000001_init_schema
-- Description: Initial schema for trading-go service

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE order_type AS ENUM (
    'MARKET',
    'LIMIT',
    'STOP_LOSS',
    'STOP_LIMIT',
    'TAKE_PROFIT',
    'TRAILING_STOP',
    'ICEBERG'
);

CREATE TYPE order_side AS ENUM ('BUY', 'SELL');

CREATE TYPE order_status AS ENUM (
    'PENDING',
    'OPEN',
    'PARTIALLY_FILLED',
    'FILLED',
    'CANCELLED',
    'REJECTED',
    'EXPIRED'
);

CREATE TYPE time_in_force AS ENUM ('GTC', 'IOC', 'FOK', 'GTD');

CREATE TYPE trading_type AS ENUM ('SPOT', 'MARGIN', 'FUTURES');

CREATE TYPE margin_mode AS ENUM ('CROSS', 'ISOLATED');

CREATE TYPE trading_pair_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Trading Pairs table
CREATE TABLE trading_pairs (
    symbol VARCHAR(20) PRIMARY KEY,
    base_asset VARCHAR(10) NOT NULL,
    quote_asset VARCHAR(10) NOT NULL,
    min_order_size DECIMAL(36, 18) NOT NULL DEFAULT 0,
    max_order_size DECIMAL(36, 18) NOT NULL DEFAULT 0,
    price_precision INTEGER NOT NULL DEFAULT 8,
    quantity_precision INTEGER NOT NULL DEFAULT 8,
    maker_fee DECIMAL(10, 6) NOT NULL DEFAULT 0.001,
    taker_fee DECIMAL(10, 6) NOT NULL DEFAULT 0.001,
    status trading_pair_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trading_pairs_status ON trading_pairs(status);
CREATE INDEX idx_trading_pairs_base_asset ON trading_pairs(base_asset);
CREATE INDEX idx_trading_pairs_quote_asset ON trading_pairs(quote_asset);


-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL REFERENCES trading_pairs(symbol),
    type order_type NOT NULL,
    side order_side NOT NULL,
    price DECIMAL(36, 18) NOT NULL DEFAULT 0,
    quantity DECIMAL(36, 18) NOT NULL,
    filled_quantity DECIMAL(36, 18) NOT NULL DEFAULT 0,
    remaining_quantity DECIMAL(36, 18) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    time_in_force time_in_force NOT NULL DEFAULT 'GTC',
    trading_type trading_type NOT NULL DEFAULT 'SPOT',
    margin_mode margin_mode,
    leverage DECIMAL(10, 2),
    stop_price DECIMAL(36, 18),
    display_quantity DECIMAL(36, 18),
    maker_fee DECIMAL(10, 6) NOT NULL DEFAULT 0,
    taker_fee DECIMAL(10, 6) NOT NULL DEFAULT 0,
    reduce_only BOOLEAN NOT NULL DEFAULT FALSE,
    post_only BOOLEAN NOT NULL DEFAULT FALSE,
    linked_order_id UUID REFERENCES orders(id),
    client_order_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders indexes for common queries
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_trading_pair ON orders(trading_pair);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_user_pair_status ON orders(user_id, trading_pair, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_client_order_id ON orders(client_order_id) WHERE client_order_id IS NOT NULL;
CREATE INDEX idx_orders_trading_type ON orders(trading_type);

-- Trades table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buy_order_id UUID NOT NULL REFERENCES orders(id),
    sell_order_id UUID NOT NULL REFERENCES orders(id),
    buy_user_id UUID NOT NULL,
    sell_user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL REFERENCES trading_pairs(symbol),
    price DECIMAL(36, 18) NOT NULL,
    quantity DECIMAL(36, 18) NOT NULL,
    buyer_fee DECIMAL(36, 18) NOT NULL DEFAULT 0,
    seller_fee DECIMAL(36, 18) NOT NULL DEFAULT 0,
    trading_type trading_type NOT NULL DEFAULT 'SPOT',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trades indexes
CREATE INDEX idx_trades_trading_pair ON trades(trading_pair);
CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX idx_trades_pair_timestamp ON trades(trading_pair, timestamp DESC);
CREATE INDEX idx_trades_buy_user_id ON trades(buy_user_id);
CREATE INDEX idx_trades_sell_user_id ON trades(sell_user_id);
CREATE INDEX idx_trades_buy_order_id ON trades(buy_order_id);
CREATE INDEX idx_trades_sell_order_id ON trades(sell_order_id);


-- Positions table (for margin/futures trading)
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL REFERENCES trading_pairs(symbol),
    side order_side NOT NULL,
    size DECIMAL(36, 18) NOT NULL DEFAULT 0,
    entry_price DECIMAL(36, 18) NOT NULL DEFAULT 0,
    mark_price DECIMAL(36, 18) NOT NULL DEFAULT 0,
    liquidation_price DECIMAL(36, 18) NOT NULL DEFAULT 0,
    leverage DECIMAL(10, 2) NOT NULL DEFAULT 1,
    margin_mode margin_mode NOT NULL DEFAULT 'CROSS',
    margin DECIMAL(36, 18) NOT NULL DEFAULT 0,
    unrealized_pnl DECIMAL(36, 18) NOT NULL DEFAULT 0,
    realized_pnl DECIMAL(36, 18) NOT NULL DEFAULT 0,
    trading_type trading_type NOT NULL DEFAULT 'FUTURES',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, trading_pair)
);

-- Positions indexes
CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_trading_pair ON positions(trading_pair);
CREATE INDEX idx_positions_user_pair ON positions(user_id, trading_pair);
CREATE INDEX idx_positions_size ON positions(size) WHERE size > 0;

-- Liquidations table
CREATE TABLE liquidations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID NOT NULL REFERENCES positions(id),
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL REFERENCES trading_pairs(symbol),
    side order_side NOT NULL,
    size DECIMAL(36, 18) NOT NULL,
    liquidation_price DECIMAL(36, 18) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Liquidations indexes
CREATE INDEX idx_liquidations_user_id ON liquidations(user_id);
CREATE INDEX idx_liquidations_trading_pair ON liquidations(trading_pair);
CREATE INDEX idx_liquidations_timestamp ON liquidations(timestamp DESC);
CREATE INDEX idx_liquidations_position_id ON liquidations(position_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_trading_pairs_updated_at
    BEFORE UPDATE ON trading_pairs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default trading pairs
INSERT INTO trading_pairs (symbol, base_asset, quote_asset, min_order_size, max_order_size, price_precision, quantity_precision, maker_fee, taker_fee, status) VALUES
    ('BTC/USDT', 'BTC', 'USDT', 0.0001, 1000, 2, 6, 0.001, 0.001, 'ACTIVE'),
    ('ETH/USDT', 'ETH', 'USDT', 0.001, 10000, 2, 5, 0.001, 0.001, 'ACTIVE'),
    ('BNB/USDT', 'BNB', 'USDT', 0.01, 100000, 2, 4, 0.001, 0.001, 'ACTIVE'),
    ('SOL/USDT', 'SOL', 'USDT', 0.01, 100000, 2, 4, 0.001, 0.001, 'ACTIVE'),
    ('XRP/USDT', 'XRP', 'USDT', 1, 1000000, 4, 2, 0.001, 0.001, 'ACTIVE'),
    ('ETH/BTC', 'ETH', 'BTC', 0.001, 10000, 6, 5, 0.001, 0.001, 'ACTIVE');
