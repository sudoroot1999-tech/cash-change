-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Trading pairs configuration
CREATE TABLE IF NOT EXISTS trading_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL UNIQUE,
    base_asset VARCHAR(10) NOT NULL,
    quote_asset VARCHAR(10) NOT NULL,
    asset_type VARCHAR(20) NOT NULL DEFAULT 'CRYPTO',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    min_price DECIMAL(30, 18) DEFAULT 0,
    max_price DECIMAL(30, 18) DEFAULT 0,
    tick_size DECIMAL(30, 18) DEFAULT 0.00000001,
    min_quantity DECIMAL(30, 18) DEFAULT 0,
    max_quantity DECIMAL(30, 18) DEFAULT 0,
    step_size DECIMAL(30, 18) DEFAULT 0.00000001,
    min_notional DECIMAL(30, 18) DEFAULT 0,
    price_precision INT DEFAULT 8,
    quantity_precision INT DEFAULT 8,
    external_symbol VARCHAR(20),
    data_sources JSONB DEFAULT '["BINANCE"]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticker snapshots (for historical data)
CREATE TABLE IF NOT EXISTS ticker_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trading_pair VARCHAR(20) NOT NULL,
    price DECIMAL(30, 18) NOT NULL,
    price_change DECIMAL(30, 18),
    price_change_pct DECIMAL(10, 4),
    high_24h DECIMAL(30, 18),
    low_24h DECIMAL(30, 18),
    volume_24h DECIMAL(30, 18),
    quote_volume DECIMAL(30, 18),
    bid_price DECIMAL(30, 18),
    ask_price DECIMAL(30, 18),
    source VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kline/Candlestick data
CREATE TABLE IF NOT EXISTS klines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trading_pair VARCHAR(20) NOT NULL,
    interval VARCHAR(10) NOT NULL,
    open_time TIMESTAMP WITH TIME ZONE NOT NULL,
    close_time TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(30, 18) NOT NULL,
    high DECIMAL(30, 18) NOT NULL,
    low DECIMAL(30, 18) NOT NULL,
    close DECIMAL(30, 18) NOT NULL,
    volume DECIMAL(30, 18),
    quote_volume DECIMAL(30, 18),
    trade_count BIGINT DEFAULT 0,
    source VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trading_pair, interval, open_time)
);

-- Market info (from CoinGecko)
CREATE TABLE IF NOT EXISTS market_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100),
    asset_type VARCHAR(20) NOT NULL DEFAULT 'CRYPTO',
    market_cap DECIMAL(30, 2),
    market_cap_rank INT,
    circulating_supply DECIMAL(30, 8),
    total_supply DECIMAL(30, 8),
    max_supply DECIMAL(30, 8),
    ath DECIMAL(30, 18),
    ath_date TIMESTAMP WITH TIME ZONE,
    atl DECIMAL(30, 18),
    atl_date TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NFT Collections (for future use)
CREATE TABLE IF NOT EXISTS nft_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    symbol VARCHAR(50),
    contract_address VARCHAR(100),
    chain VARCHAR(20) NOT NULL,
    floor_price DECIMAL(30, 18),
    volume_24h DECIMAL(30, 18),
    volume_7d DECIMAL(30, 18),
    market_cap DECIMAL(30, 18),
    owners BIGINT DEFAULT 0,
    total_supply BIGINT DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RWA Assets (for future use)
CREATE TABLE IF NOT EXISTS rwa_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    symbol VARCHAR(50) NOT NULL UNIQUE,
    asset_class VARCHAR(50) NOT NULL,
    price DECIMAL(30, 18),
    nav DECIMAL(30, 18),
    yield DECIMAL(10, 4),
    total_value DECIMAL(30, 18),
    tokenized_amount DECIMAL(30, 18),
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticker_snapshots_pair_time ON ticker_snapshots(trading_pair, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_klines_pair_interval_time ON klines(trading_pair, interval, open_time DESC);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_status ON trading_pairs(status);
CREATE INDEX IF NOT EXISTS idx_market_info_rank ON market_info(market_cap_rank);

-- Insert default trading pairs
INSERT INTO trading_pairs (symbol, base_asset, quote_asset, external_symbol) VALUES
    ('BTCUSDT', 'BTC', 'USDT', 'BTCUSDT'),
    ('ETHUSDT', 'ETH', 'USDT', 'ETHUSDT'),
    ('BNBUSDT', 'BNB', 'USDT', 'BNBUSDT'),
    ('XRPUSDT', 'XRP', 'USDT', 'XRPUSDT'),
    ('ADAUSDT', 'ADA', 'USDT', 'ADAUSDT'),
    ('SOLUSDT', 'SOL', 'USDT', 'SOLUSDT'),
    ('DOTUSDT', 'DOT', 'USDT', 'DOTUSDT'),
    ('DOGEUSDT', 'DOGE', 'USDT', 'DOGEUSDT'),
    ('AVAXUSDT', 'AVAX', 'USDT', 'AVAXUSDT'),
    ('MATICUSDT', 'MATIC', 'USDT', 'MATICUSDT'),
    ('LINKUSDT', 'LINK', 'USDT', 'LINKUSDT'),
    ('UNIUSDT', 'UNI', 'USDT', 'UNIUSDT'),
    ('ATOMUSDT', 'ATOM', 'USDT', 'ATOMUSDT'),
    ('LTCUSDT', 'LTC', 'USDT', 'LTCUSDT'),
    ('ETCUSDT', 'ETC', 'USDT', 'ETCUSDT')
ON CONFLICT (symbol) DO NOTHING;
