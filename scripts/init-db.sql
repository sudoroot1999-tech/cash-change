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
CREATE SCHEMA IF NOT EXISTS reserves;
CREATE SCHEMA IF NOT EXISTS admin;

-- Grant permissions
GRANT ALL ON SCHEMA users TO exchange_user;
GRANT ALL ON SCHEMA wallets TO exchange_user;
GRANT ALL ON SCHEMA trading TO exchange_user;
GRANT ALL ON SCHEMA notifications TO exchange_user;
GRANT ALL ON SCHEMA compliance TO exchange_user;
GRANT ALL ON SCHEMA security TO exchange_user;
GRANT ALL ON SCHEMA reserves TO exchange_user;
GRANT ALL ON SCHEMA admin TO exchange_user;

-- Users schema tables
CREATE TABLE IF NOT EXISTS users.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    phone VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'banned')),
    tier VARCHAR(50) DEFAULT 'basic' CHECK (tier IN ('basic', 'intermediate', 'advanced', 'vip', 'ultra_vip', 'institutional')),
    kyc_level INTEGER DEFAULT 0 CHECK (kyc_level BETWEEN 0 AND 3),
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users.users(id),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    postal_code VARCHAR(20),
    avatar_url TEXT,
    bio TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- Notifications schema
CREATE TABLE IF NOT EXISTS notifications.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'telegram')),
    subject VARCHAR(255),
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id),
    template_id UUID REFERENCES notifications.notification_templates(id),
    channel VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 0 AND 3),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    content JSONB NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users.users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON users.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON users.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON wallets.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON wallets.transactions(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON trading.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_pair_status ON trading.orders(pair_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_pair_id ON trading.trades(pair_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trading.trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications.notifications(user_id);

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
