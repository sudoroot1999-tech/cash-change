-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trading Pairs Table
CREATE TABLE trading_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) NOT NULL UNIQUE,
    base_currency VARCHAR(10) NOT NULL,
    quote_currency VARCHAR(10) NOT NULL,
    min_order_size DECIMAL(30, 18) NOT NULL,
    max_order_size DECIMAL(30, 18) NOT NULL,
    price_precision INT NOT NULL DEFAULT 8,
    quantity_precision INT NOT NULL DEFAULT 8,
    maker_fee DECIMAL(10, 6) NOT NULL DEFAULT 0.001,
    taker_fee DECIMAL(10, 6) NOT NULL DEFAULT 0.001,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_spot_enabled BOOLEAN DEFAULT true,
    is_margin_enabled BOOLEAN DEFAULT true,
    is_futures_enabled BOOLEAN DEFAULT true,
    max_leverage DECIMAL(10, 2) DEFAULT 125.00,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    price DECIMAL(30, 18) NOT NULL DEFAULT 0,
    quantity DECIMAL(30, 18) NOT NULL,
    filled_quantity DECIMAL(30, 18) NOT NULL DEFAULT 0,
    remaining_quantity DECIMAL(30, 18) NOT NULL,
    status VARCHAR(20) NOT NULL,
    time_in_force VARCHAR(10) NOT NULL DEFAULT 'GTC',
    trading_type VARCHAR(20) NOT NULL DEFAULT 'SPOT',
    margin_mode VARCHAR(20),
    leverage DECIMAL(10, 2),
    stop_price DECIMAL(30, 18),
    trailing_delta DECIMAL(30, 18),
    display_quantity DECIMAL(30, 18),
    linked_order_id UUID,
    position_id UUID,
    reduce_only BOOLEAN DEFAULT false,
    post_only BOOLEAN DEFAULT false,
    maker_fee DECIMAL(10, 6) NOT NULL DEFAULT 0.001,
    taker_fee DECIMAL(10, 6) NOT NULL DEFAULT 0.001,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Hypertable for orders (TimescaleDB)
SELECT create_hypertable('orders', 'created_at', if_not_exists => TRUE);

-- Indexes for orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_trading_pair ON orders(trading_pair);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(type);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_user_trading_pair ON orders(user_id, trading_pair);

-- Trades Table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_pair VARCHAR(20) NOT NULL,
    buy_order_id UUID NOT NULL,
    sell_order_id UUID NOT NULL,
    buy_user_id UUID NOT NULL,
    sell_user_id UUID NOT NULL,
    price DECIMAL(30, 18) NOT NULL,
    quantity DECIMAL(30, 18) NOT NULL,
    buyer_fee DECIMAL(30, 18) NOT NULL,
    seller_fee DECIMAL(30, 18) NOT NULL,
    trading_type VARCHAR(20) NOT NULL DEFAULT 'SPOT',
    is_maker BOOLEAN DEFAULT false,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Hypertable for trades (TimescaleDB)
SELECT create_hypertable('trades', 'timestamp', if_not_exists => TRUE);

-- Indexes for trades
CREATE INDEX idx_trades_trading_pair ON trades(trading_pair);
CREATE INDEX idx_trades_buy_order_id ON trades(buy_order_id);
CREATE INDEX idx_trades_sell_order_id ON trades(sell_order_id);
CREATE INDEX idx_trades_buy_user_id ON trades(buy_user_id);
CREATE INDEX idx_trades_sell_user_id ON trades(sell_user_id);
CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);

-- User Positions Table (for Futures/Margin)
CREATE TABLE user_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    size DECIMAL(30, 18) NOT NULL DEFAULT 0,
    entry_price DECIMAL(30, 18) NOT NULL,
    mark_price DECIMAL(30, 18) NOT NULL DEFAULT 0,
    liquidation_price DECIMAL(30, 18) NOT NULL DEFAULT 0,
    leverage DECIMAL(10, 2) NOT NULL DEFAULT 1,
    margin DECIMAL(30, 18) NOT NULL DEFAULT 0,
    margin_mode VARCHAR(20) NOT NULL,
    unrealized_pnl DECIMAL(30, 18) NOT NULL DEFAULT 0,
    realized_pnl DECIMAL(30, 18) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, trading_pair)
);

-- Indexes for positions
CREATE INDEX idx_positions_user_id ON user_positions(user_id);
CREATE INDEX idx_positions_trading_pair ON user_positions(trading_pair);
CREATE INDEX idx_positions_liquidation_price ON user_positions(liquidation_price);

-- Liquidations Table
CREATE TABLE liquidations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID NOT NULL,
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    size DECIMAL(30, 18) NOT NULL,
    liquidation_price DECIMAL(30, 18) NOT NULL,
    bankruptcy_price DECIMAL(30, 18) NOT NULL DEFAULT 0,
    insurance_fund_contribution DECIMAL(30, 18) NOT NULL DEFAULT 0,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Hypertable for liquidations (TimescaleDB)
SELECT create_hypertable('liquidations', 'timestamp', if_not_exists => TRUE);

-- Indexes for liquidations
CREATE INDEX idx_liquidations_user_id ON liquidations(user_id);
CREATE INDEX idx_liquidations_trading_pair ON liquidations(trading_pair);
CREATE INDEX idx_liquidations_timestamp ON liquidations(timestamp DESC);

-- Order Book Table (for order book snapshots)
CREATE TABLE order_book_snapshots (
    id BIGSERIAL,
    trading_pair VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    price DECIMAL(30, 18) NOT NULL,
    quantity DECIMAL(30, 18) NOT NULL,
    order_count INT NOT NULL DEFAULT 1,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Hypertable for order book snapshots (TimescaleDB)
SELECT create_hypertable('order_book_snapshots', 'timestamp', if_not_exists => TRUE);

-- Indexes for order book
CREATE INDEX idx_orderbook_trading_pair ON order_book_snapshots(trading_pair);
CREATE INDEX idx_orderbook_timestamp ON order_book_snapshots(timestamp DESC);

-- Trading Bots Table
CREATE TABLE trading_bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    strategy VARCHAR(50) NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE',
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    total_profit DECIMAL(30, 18) DEFAULT 0,
    total_trades INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bots_user_id ON trading_bots(user_id);
CREATE INDEX idx_bots_status ON trading_bots(status);

-- Copy Trading Table
CREATE TABLE copy_trading (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL,
    leader_id UUID NOT NULL,
    trading_pair VARCHAR(20),
    copy_ratio DECIMAL(10, 4) NOT NULL DEFAULT 1.0,
    max_copy_amount DECIMAL(30, 18),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    total_copied_trades INT DEFAULT 0,
    total_profit DECIMAL(30, 18) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, leader_id)
);

CREATE INDEX idx_copy_trading_follower ON copy_trading(follower_id);
CREATE INDEX idx_copy_trading_leader ON copy_trading(leader_id);

-- Rate Limits Table
CREATE TABLE api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    api_key VARCHAR(100) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    window_start TIMESTAMP NOT NULL DEFAULT NOW(),
    window_end TIMESTAMP NOT NULL,
    limit_per_window INT NOT NULL DEFAULT 1000
);

CREATE INDEX idx_rate_limits_user_id ON api_rate_limits(user_id);
CREATE INDEX idx_rate_limits_api_key ON api_rate_limits(api_key);

-- Insurance Fund Table
CREATE TABLE insurance_fund (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_pair VARCHAR(20) NOT NULL,
    balance DECIMAL(30, 18) NOT NULL DEFAULT 0,
    total_contributions DECIMAL(30, 18) NOT NULL DEFAULT 0,
    total_payouts DECIMAL(30, 18) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Market Stats Table (24h stats)
CREATE TABLE market_stats_24h (
    trading_pair VARCHAR(20) PRIMARY KEY,
    last_price DECIMAL(30, 18) NOT NULL,
    high_24h DECIMAL(30, 18) NOT NULL,
    low_24h DECIMAL(30, 18) NOT NULL,
    volume_24h DECIMAL(30, 18) NOT NULL,
    volume_quote_24h DECIMAL(30, 18) NOT NULL,
    price_change_24h DECIMAL(30, 18) NOT NULL,
    price_change_percent_24h DECIMAL(10, 4) NOT NULL,
    trade_count_24h INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Continuous aggregate for 1-minute candles
CREATE MATERIALIZED VIEW candles_1m
WITH (timescaledb.continuous) AS
SELECT
    trading_pair,
    time_bucket('1 minute', timestamp) AS bucket,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume,
    count(*) AS trade_count
FROM trades
GROUP BY trading_pair, bucket
WITH NO DATA;

-- Refresh policy for continuous aggregates
SELECT add_continuous_aggregate_policy('candles_1m',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

-- Insert sample trading pairs
INSERT INTO trading_pairs (symbol, base_currency, quote_currency, min_order_size, max_order_size, maker_fee, taker_fee, max_leverage)
VALUES
    ('BTC/USDT', 'BTC', 'USDT', 0.0001, 100, 0.001, 0.002, 125),
    ('ETH/USDT', 'ETH', 'USDT', 0.001, 1000, 0.001, 0.002, 100),
    ('BNB/USDT', 'BNB', 'USDT', 0.01, 10000, 0.001, 0.002, 50),
    ('SOL/USDT', 'SOL', 'USDT', 0.1, 50000, 0.001, 0.002, 50),
    ('XRP/USDT', 'XRP', 'USDT', 1, 1000000, 0.001, 0.002, 20);

-- Functions and Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trading_pairs_updated_at BEFORE UPDATE ON trading_pairs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON user_positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
