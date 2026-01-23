-- Wallet Service Initial Schema
-- Generated: 2025-10-11

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    balance DECIMAL(36, 18) NOT NULL DEFAULT 0,
    locked_balance DECIMAL(36, 18) NOT NULL DEFAULT 0,
    type VARCHAR(10) NOT NULL DEFAULT 'HOT' CHECK (type IN ('HOT', 'COLD')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    master_public_key TEXT,
    derivation_path VARCHAR(255),
    address_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);
CREATE INDEX idx_wallets_user_currency ON wallets(user_id, currency);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    chain VARCHAR(20) NOT NULL CHECK (chain IN ('BITCOIN', 'ETHEREUM', 'BSC', 'POLYGON', 'SOLANA')),
    type VARCHAR(20) NOT NULL DEFAULT 'DEPOSIT' CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'CHANGE', 'MULTISIG')),
    derivation_index INTEGER,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    label VARCHAR(255),
    multisig_config JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (address, chain)
);

CREATE INDEX idx_addresses_wallet_id ON addresses(wallet_id);
CREATE INDEX idx_addresses_address ON addresses(address);
CREATE INDEX idx_addresses_chain ON addresses(chain);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'INTERNAL_TRANSFER', 'FEE', 'TRADE')),
    amount DECIMAL(36, 18) NOT NULL,
    fee DECIMAL(36, 18) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMING', 'CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    tx_hash VARCHAR(255),
    description TEXT,
    confirmations INTEGER NOT NULL DEFAULT 0,
    required_confirmations INTEGER NOT NULL DEFAULT 6,
    block_number BIGINT,
    idempotency_key VARCHAR(255) UNIQUE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_wallet_created ON transactions(wallet_id, created_at DESC);

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(36, 18) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED')),
    required_approvals INTEGER NOT NULL DEFAULT 1,
    current_approvals INTEGER NOT NULL DEFAULT 0,
    approvals JSONB NOT NULL DEFAULT '[]',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    risk_factors TEXT[],
    is_whitelisted BOOLEAN NOT NULL DEFAULT FALSE,
    time_lock_until TIMESTAMP,
    two_factor_verified BOOLEAN NOT NULL DEFAULT FALSE,
    transaction_id VARCHAR(255),
    notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX idx_withdrawals_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawals_wallet_id ON withdrawal_requests(wallet_id);
CREATE INDEX idx_withdrawals_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawals_user_created ON withdrawal_requests(user_id, created_at DESC);
CREATE INDEX idx_withdrawals_status_created ON withdrawal_requests(status, created_at);

-- Deposit history table
CREATE TABLE IF NOT EXISTS deposit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    amount DECIMAL(36, 18) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    tx_hash VARCHAR(255) NOT NULL UNIQUE,
    confirmations INTEGER NOT NULL DEFAULT 0,
    required_confirmations INTEGER NOT NULL DEFAULT 6,
    status VARCHAR(20) NOT NULL DEFAULT 'DETECTED' CHECK (status IN ('DETECTED', 'PENDING', 'CONFIRMING', 'CONFIRMED', 'CREDITED', 'FAILED')),
    block_number BIGINT,
    block_timestamp TIMESTAMP,
    transaction_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    credited_at TIMESTAMP
);

CREATE INDEX idx_deposits_user_id ON deposit_history(user_id);
CREATE INDEX idx_deposits_wallet_id ON deposit_history(wallet_id);
CREATE INDEX idx_deposits_address_id ON deposit_history(address_id);
CREATE INDEX idx_deposits_tx_hash ON deposit_history(tx_hash);
CREATE INDEX idx_deposits_status ON deposit_history(status);
CREATE INDEX idx_deposits_user_created ON deposit_history(user_id, created_at DESC);

-- Internal transfers table
CREATE TABLE IF NOT EXISTS internal_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id VARCHAR(255) NOT NULL,
    to_user_id VARCHAR(255) NOT NULL,
    from_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    to_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(36, 18) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED')),
    description TEXT,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_internal_transfers_from_user ON internal_transfers(from_user_id);
CREATE INDEX idx_internal_transfers_to_user ON internal_transfers(to_user_id);
CREATE INDEX idx_internal_transfers_from_user_created ON internal_transfers(from_user_id, created_at DESC);
CREATE INDEX idx_internal_transfers_to_user_created ON internal_transfers(to_user_id, created_at DESC);

-- Withdrawal whitelist table
CREATE TABLE IF NOT EXISTS withdrawal_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    label VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, address, currency)
);

CREATE INDEX idx_whitelist_user_id ON withdrawal_whitelist(user_id);
CREATE INDEX idx_whitelist_address ON withdrawal_whitelist(address);

-- Withdrawal limits table
CREATE TABLE IF NOT EXISTS withdrawal_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    daily_limit DECIMAL(36, 18) NOT NULL,
    daily_used DECIMAL(36, 18) NOT NULL DEFAULT 0,
    monthly_limit DECIMAL(36, 18) NOT NULL,
    monthly_used DECIMAL(36, 18) NOT NULL DEFAULT 0,
    kyc_level INTEGER NOT NULL DEFAULT 1,
    last_reset_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, currency)
);

CREATE INDEX idx_limits_user_id ON withdrawal_limits(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON deposit_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_transfers_updated_at BEFORE UPDATE ON internal_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whitelist_updated_at BEFORE UPDATE ON withdrawal_whitelist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_limits_updated_at BEFORE UPDATE ON withdrawal_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE wallets IS 'User wallet balances for different currencies';
COMMENT ON TABLE addresses IS 'Generated addresses for deposits and withdrawals';
COMMENT ON TABLE transactions IS 'All transaction records';
COMMENT ON TABLE withdrawal_requests IS 'Withdrawal requests with approval workflow';
COMMENT ON TABLE deposit_history IS 'Deposit detection and confirmation tracking';
COMMENT ON TABLE internal_transfers IS 'Peer-to-peer transfers between platform users';
COMMENT ON TABLE withdrawal_whitelist IS 'Pre-approved withdrawal addresses';
COMMENT ON TABLE withdrawal_limits IS 'User withdrawal limits based on KYC level';
