-- Initialize Exchange Database
-- This script runs on first PostgreSQL container start

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas for better organization
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS wallets;
CREATE SCHEMA IF NOT EXISTS trading;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS compliance;
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS admin;

-- Grant permissions
GRANT ALL ON SCHEMA users TO exchange_user;
GRANT ALL ON SCHEMA wallets TO exchange_user;
GRANT ALL ON SCHEMA trading TO exchange_user;
GRANT ALL ON SCHEMA notifications TO exchange_user;
GRANT ALL ON SCHEMA compliance TO exchange_user;
GRANT ALL ON SCHEMA security TO exchange_user;
GRANT ALL ON SCHEMA admin TO exchange_user;


-- Wallets schema tables
CREATE TABLE IF NOT EXISTS wallets.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    network VARCHAR(50) NOT NULL,
    contract_address VARCHAR(255),
    decimals INTEGER DEFAULT 18,
    is_active BOOLEAN DEFAULT TRUE,
    min_deposit DECIMAL(36, 18) DEFAULT 0,
    min_withdrawal DECIMAL(36, 18) DEFAULT 0,
    withdrawal_fee DECIMAL(36, 18) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES wallets.assets(id),
    address VARCHAR(255),
    available_balance DECIMAL(36, 18) DEFAULT 0,
    locked_balance DECIMAL(36, 18) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, asset_id)
);

CREATE TABLE IF NOT EXISTS wallets.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id),
    wallet_id UUID NOT NULL REFERENCES wallets.wallets(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'trade', 'fee', 'reward')),
    amount DECIMAL(36, 18) NOT NULL,
    fee DECIMAL(36, 18) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    tx_hash VARCHAR(255),
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    confirmations INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trading schema tables
CREATE TABLE IF NOT EXISTS trading.trading_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_asset_id UUID NOT NULL REFERENCES wallets.assets(id),
    quote_asset_id UUID NOT NULL REFERENCES wallets.assets(id),
    symbol VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'delisted')),
    min_order_size DECIMAL(36, 18) NOT NULL,
    max_order_size DECIMAL(36, 18) NOT NULL,
    price_precision INTEGER DEFAULT 8,
    quantity_precision INTEGER DEFAULT 8,
    maker_fee DECIMAL(10, 6) DEFAULT 0.001,
    taker_fee DECIMAL(10, 6) DEFAULT 0.001,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trading.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id),
    pair_id UUID NOT NULL REFERENCES trading.trading_pairs(id),
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('market', 'limit', 'stop_loss', 'stop_limit', 'trailing_stop')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'partial', 'filled', 'cancelled', 'rejected')),
    price DECIMAL(36, 18),
    quantity DECIMAL(36, 18) NOT NULL,
    filled_quantity DECIMAL(36, 18) DEFAULT 0,
    remaining_quantity DECIMAL(36, 18),
    stop_price DECIMAL(36, 18),
    time_in_force VARCHAR(10) DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),
    client_order_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trading.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair_id UUID NOT NULL REFERENCES trading.trading_pairs(id),
    buyer_order_id UUID NOT NULL REFERENCES trading.orders(id),
    seller_order_id UUID NOT NULL REFERENCES trading.orders(id),
    buyer_id UUID NOT NULL REFERENCES users.users(id),
    seller_id UUID NOT NULL REFERENCES users.users(id),
    price DECIMAL(36, 18) NOT NULL,
    quantity DECIMAL(36, 18) NOT NULL,
    buyer_fee DECIMAL(36, 18) DEFAULT 0,
    seller_fee DECIMAL(36, 18) DEFAULT 0,
    is_buyer_maker BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Admin schema tables
CREATE TABLE IF NOT EXISTS admin.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'finance_admin', 'support_admin', 'compliance_admin', 'marketing_admin', 'risk_manager', 'otc_desk_manager')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON wallets.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON wallets.transactions(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON trading.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_pair_status ON trading.orders(pair_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_pair_id ON trading.trades(pair_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trading.trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admin.admins(email);
CREATE INDEX IF NOT EXISTS idx_settings_key ON admin.settings(key);

-- Insert initial assets
INSERT INTO wallets.assets (symbol, name, network, decimals) VALUES
    ('BTC', 'Bitcoin', 'bitcoin', 8),
    ('ETH', 'Ethereum', 'ethereum', 18),
    ('USDT', 'Tether USD', 'ethereum', 6),
    ('USDC', 'USD Coin', 'ethereum', 6),
    ('BNB', 'Binance Coin', 'bsc', 18)
ON CONFLICT (symbol) DO NOTHING;

-- Insert initial trading pairs
INSERT INTO trading.trading_pairs (symbol, base_asset_id, quote_asset_id, min_order_size, max_order_size, price_precision, quantity_precision)
SELECT 'BTC/USDT', b.id, q.id, 0.0001, 100, 2, 6
FROM wallets.assets b, wallets.assets q
WHERE b.symbol = 'BTC' AND q.symbol = 'USDT'
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO trading.trading_pairs (symbol, base_asset_id, quote_asset_id, min_order_size, max_order_size, price_precision, quantity_precision)
SELECT 'ETH/USDT', b.id, q.id, 0.001, 1000, 2, 5
FROM wallets.assets b, wallets.assets q
WHERE b.symbol = 'ETH' AND q.symbol = 'USDT'
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO trading.trading_pairs (symbol, base_asset_id, quote_asset_id, min_order_size, max_order_size, price_precision, quantity_precision)
SELECT 'ETH/BTC', b.id, q.id, 0.001, 1000, 6, 5
FROM wallets.assets b, wallets.assets q
WHERE b.symbol = 'ETH' AND q.symbol = 'BTC'
ON CONFLICT (symbol) DO NOTHING;

-- Insert default super admin (password: Admin@123456)
-- Password hash generated with bcrypt rounds=10
INSERT INTO admin.admins (email, password_hash, full_name, role, is_active) VALUES
    ('admin@exchange.com', '$2b$10$rW8eXhKqPXfKvQzQ5qQBbOXJ7Z7fHGqZvXKqZvXKqZvXKqZvXKqZve', 'Super Admin', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- Insert default settings
INSERT INTO admin.settings (key, value, description, type) VALUES
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode', 'boolean'),
    ('trading_enabled', 'true', 'Enable/disable trading', 'boolean'),
    ('withdrawal_enabled', 'true', 'Enable/disable withdrawals', 'boolean'),
    ('deposit_enabled', 'true', 'Enable/disable deposits', 'boolean'),
    ('max_withdrawal_per_day', '100000', 'Maximum withdrawal amount per day in USD', 'number'),
    ('min_withdrawal_amount', '10', 'Minimum withdrawal amount in USD', 'number')
ON CONFLICT (key) DO NOTHING;