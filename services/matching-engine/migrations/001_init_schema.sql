-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Trading Pairs Table
CREATE TABLE IF NOT EXISTS trading_pairs (
    symbol VARCHAR(20) PRIMARY KEY,
    base_currency VARCHAR(10) NOT NULL,
    quote_currency VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    min_order_size DECIMAL(30, 8) NOT NULL,
    max_order_size DECIMAL(30, 8) NOT NULL,
    price_precision INT NOT NULL,
    quantity_precision INT NOT NULL,
    maker_fee DECIMAL(10, 4) DEFAULT 0.001,
    taker_fee DECIMAL(10, 4) DEFAULT 0.002,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    price DECIMAL(30, 8) NOT NULL,
    quantity DECIMAL(30, 8) NOT NULL,
    filled_quantity DECIMAL(30, 8) DEFAULT 0,
    remaining_quantity DECIMAL(30, 8) NOT NULL,
    status VARCHAR(20) NOT NULL,
    time_in_force VARCHAR(10) NOT NULL,
    trading_type VARCHAR(20) NOT NULL,
    margin_mode VARCHAR(20),
    leverage DECIMAL(10, 2),
    stop_price DECIMAL(30, 8),
    trailing_delta DECIMAL(30, 8),
    display_quantity DECIMAL(30, 8),
    linked_order_id UUID,
    position_id UUID,
    reduce_only BOOLEAN DEFAULT FALSE,
    post_only BOOLEAN DEFAULT FALSE,
    maker_fee DECIMAL(10, 4) DEFAULT 0.001,
    taker_fee DECIMAL(10, 4) DEFAULT 0.002,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    FOREIGN KEY (trading_pair) REFERENCES trading_pairs(symbol)
);

-- Create indexes for orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_trading_pair ON orders(trading_pair);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order Book Table (for historical data)
CREATE TABLE IF NOT EXISTS order_book_snapshots (
    id BIGSERIAL,
    trading_pair VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    price DECIMAL(30, 8) NOT NULL,
    quantity DECIMAL(30, 8) NOT NULL,
    orders_count INT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (trading_pair) REFERENCES trading_pairs(symbol)
);

-- Convert to hypertable for time-series data
SELECT create_hypertable('order_book_snapshots', 'timestamp', if_not_exists => TRUE);

-- Create indexes for order book
CREATE INDEX idx_order_book_trading_pair ON order_book_snapshots(trading_pair, timestamp DESC);
CREATE INDEX idx_order_book_timestamp ON order_book_snapshots(timestamp DESC);

-- Trades Table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY,
    trading_pair VARCHAR(20) NOT NULL,
    buy_order_id UUID NOT NULL,
    sell_order_id UUID NOT NULL,
    buy_user_id UUID NOT NULL,
    sell_user_id UUID NOT NULL,
    price DECIMAL(30, 8) NOT NULL,
    quantity DECIMAL(30, 8) NOT NULL,
    buyer_fee DECIMAL(30, 8) NOT NULL,
    seller_fee DECIMAL(30, 8) NOT NULL,
    trading_type VARCHAR(20) NOT NULL,
    is_maker BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (trading_pair) REFERENCES trading_pairs(symbol)
);

-- Convert trades to hypertable
SELECT create_hypertable('trades', 'timestamp', if_not_exists => TRUE);

-- Create indexes for trades
CREATE INDEX idx_trades_trading_pair ON trades(trading_pair, timestamp DESC);
CREATE INDEX idx_trades_buy_user ON trades(buy_user_id, timestamp DESC);
CREATE INDEX idx_trades_sell_user ON trades(sell_user_id, timestamp DESC);
CREATE INDEX idx_trades_buy_order ON trades(buy_order_id);
CREATE INDEX idx_trades_sell_order ON trades(sell_order_id);

-- User Positions Table (for futures/margin trading)
CREATE TABLE IF NOT EXISTS user_positions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    size DECIMAL(30, 8) NOT NULL,
    entry_price DECIMAL(30, 8) NOT NULL,
    mark_price DECIMAL(30, 8) NOT NULL,
    liquidation_price DECIMAL(30, 8) NOT NULL,
    leverage DECIMAL(10, 2) NOT NULL,
    margin DECIMAL(30, 8) NOT NULL,
    margin_mode VARCHAR(20) NOT NULL,
    unrealized_pnl DECIMAL(30, 8) DEFAULT 0,
    realized_pnl DECIMAL(30, 8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (trading_pair) REFERENCES trading_pairs(symbol),
    UNIQUE(user_id, trading_pair)
);

-- Create indexes for positions
CREATE INDEX idx_positions_user_id ON user_positions(user_id);
CREATE INDEX idx_positions_trading_pair ON user_positions(trading_pair);
CREATE INDEX idx_positions_liquidation_price ON user_positions(liquidation_price);

-- Liquidations Table
CREATE TABLE IF NOT EXISTS liquidations (
    id UUID PRIMARY KEY,
    position_id UUID NOT NULL,
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    size DECIMAL(30, 8) NOT NULL,
    liquidation_price DECIMAL(30, 8) NOT NULL,
    bankruptcy_price DECIMAL(30, 8),
    insurance_fund_contribution DECIMAL(30, 8) DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (trading_pair) REFERENCES trading_pairs(symbol)
);

-- Convert liquidations to hypertable
SELECT create_hypertable('liquidations', 'timestamp', if_not_exists => TRUE);

-- Create indexes for liquidations
CREATE INDEX idx_liquidations_user_id ON liquidations(user_id, timestamp DESC);
CREATE INDEX idx_liquidations_trading_pair ON liquidations(trading_pair, timestamp DESC);

-- Tickers Table (for 24h statistics)
CREATE TABLE IF NOT EXISTS tickers (
    trading_pair VARCHAR(20) PRIMARY KEY,
    last_price DECIMAL(30, 8) NOT NULL,
    high_24h DECIMAL(30, 8) NOT NULL,
    low_24h DECIMAL(30, 8) NOT NULL,
    volume_24h DECIMAL(30, 8) NOT NULL,
    volume_quote_24h DECIMAL(30, 8) NOT NULL,
    price_change_24h DECIMAL(30, 8) NOT NULL,
    price_change_percent_24h DECIMAL(10, 4) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (trading_pair) REFERENCES trading_pairs(symbol)
);

-- Candles Table (OHLCV data)
CREATE TABLE IF NOT EXISTS candles (
    id BIGSERIAL,
    trading_pair VARCHAR(20) NOT NULL,
    interval VARCHAR(10) NOT NULL,
    open_price DECIMAL(30, 8) NOT NULL,
    high_price DECIMAL(30, 8) NOT NULL,
    low_price DECIMAL(30, 8) NOT NULL,
    close_price DECIMAL(30, 8) NOT NULL,
    volume DECIMAL(30, 8) NOT NULL,
    volume_quote DECIMAL(30, 8) NOT NULL,
    trades_count INT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (trading_pair) REFERENCES trading_pairs(symbol),
    UNIQUE(trading_pair, interval, timestamp)
);

-- Convert candles to hypertable
SELECT create_hypertable('candles', 'timestamp', if_not_exists => TRUE);

-- Create indexes for candles
CREATE INDEX idx_candles_trading_pair ON candles(trading_pair, interval, timestamp DESC);

-- Insurance Fund Table
CREATE TABLE IF NOT EXISTS insurance_fund (
    id BIGSERIAL PRIMARY KEY,
    amount DECIMAL(30, 8) NOT NULL,
    source VARCHAR(50) NOT NULL,
    description TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-Deleveraging Queue Table
CREATE TABLE IF NOT EXISTS adl_queue (
    id BIGSERIAL PRIMARY KEY,
    position_id UUID NOT NULL,
    user_id UUID NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    priority DECIMAL(10, 6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (trading_pair) REFERENCES trading_pairs(symbol)
);

-- Create indexes for ADL queue
CREATE INDEX idx_adl_queue_trading_pair ON adl_queue(trading_pair, priority DESC);
CREATE INDEX idx_adl_queue_position ON adl_queue(position_id);

-- Rate Limits Table
CREATE TABLE IF NOT EXISTS rate_limits (
    user_id UUID NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    requests_count INT DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, endpoint, window_start)
);

-- Create continuous aggregates for better query performance
CREATE MATERIALIZED VIEW IF NOT EXISTS trades_1m
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 minute', timestamp) AS bucket,
    trading_pair,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(quantity) AS volume,
    sum(quantity * price) AS volume_quote,
    count(*) AS trades_count
FROM trades
GROUP BY bucket, trading_pair
WITH NO DATA;

-- Create refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('trades_1m',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE
);

-- Insert sample trading pairs
INSERT INTO trading_pairs (symbol, base_currency, quote_currency, min_order_size, max_order_size, price_precision, quantity_precision)
VALUES 
    ('BTC-USDT', 'BTC', 'USDT', 0.00001, 100, 2, 6),
    ('ETH-USDT', 'ETH', 'USDT', 0.0001, 1000, 2, 5),
    ('BNB-USDT', 'BNB', 'USDT', 0.001, 10000, 2, 4),
    ('SOL-USDT', 'SOL', 'USDT', 0.01, 100000, 2, 3),
    ('ADA-USDT', 'ADA', 'USDT', 1, 1000000, 4, 2)
ON CONFLICT (symbol) DO NOTHING;

-- Initialize tickers
INSERT INTO tickers (trading_pair, last_price, high_24h, low_24h, volume_24h, volume_quote_24h, price_change_24h, price_change_percent_24h)
SELECT 
    symbol,
    50000.00 AS last_price,
    52000.00 AS high_24h,
    48000.00 AS low_24h,
    100.00 AS volume_24h,
    5000000.00 AS volume_quote_24h,
    1000.00 AS price_change_24h,
    2.04 AS price_change_percent_24h
FROM trading_pairs
ON CONFLICT (trading_pair) DO NOTHING;

-- Create function to update ticker
CREATE OR REPLACE FUNCTION update_ticker()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tickers (trading_pair, last_price, high_24h, low_24h, volume_24h, volume_quote_24h, price_change_24h, price_change_percent_24h)
    VALUES (
        NEW.trading_pair,
        NEW.price,
        NEW.price,
        NEW.price,
        NEW.quantity,
        NEW.price * NEW.quantity,
        0,
        0
    )
    ON CONFLICT (trading_pair) DO UPDATE SET
        last_price = NEW.price,
        high_24h = GREATEST(tickers.high_24h, NEW.price),
        low_24h = LEAST(tickers.low_24h, NEW.price),
        volume_24h = tickers.volume_24h + NEW.quantity,
        volume_quote_24h = tickers.volume_quote_24h + (NEW.price * NEW.quantity),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ticker updates
CREATE TRIGGER trigger_update_ticker
AFTER INSERT ON trades
FOR EACH ROW
EXECUTE FUNCTION update_ticker();
