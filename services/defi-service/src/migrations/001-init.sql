-- Create staking_positions table
CREATE TABLE IF NOT EXISTS staking_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    coin VARCHAR(20) NOT NULL,
    amount DECIMAL(30, 18) NOT NULL,
    rewards_earned DECIMAL(30, 18) DEFAULT 0,
    apr DECIMAL(10, 2) NOT NULL,
    staking_type VARCHAR(20) NOT NULL CHECK (staking_type IN ('FLEXIBLE', 'LOCKED')),
    lock_days INTEGER,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    unstaked_date TIMESTAMP,
    auto_compound BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNSTAKED', 'COMPLETED')),
    transaction_hash VARCHAR(255),
    contract_address VARCHAR(255),
    last_reward_claim TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for staking_positions
CREATE INDEX idx_staking_positions_user_id ON staking_positions(user_id);
CREATE INDEX idx_staking_positions_status ON staking_positions(status);
CREATE INDEX idx_staking_positions_user_status ON staking_positions(user_id, status);
CREATE INDEX idx_staking_positions_coin_type ON staking_positions(coin, staking_type);

-- Create liquidity_pools table
CREATE TABLE IF NOT EXISTS liquidity_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token0 VARCHAR(20) NOT NULL,
    token1 VARCHAR(20) NOT NULL,
    pair_symbol VARCHAR(50) UNIQUE NOT NULL,
    reserve0 DECIMAL(30, 18) NOT NULL,
    reserve1 DECIMAL(30, 18) NOT NULL,
    tvl DECIMAL(30, 18) NOT NULL,
    apr DECIMAL(10, 2) NOT NULL,
    total_lp_tokens DECIMAL(30, 18) DEFAULT 0,
    total_rewards_distributed DECIMAL(30, 18) DEFAULT 0,
    lp_token_address VARCHAR(255) NOT NULL,
    contract_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CLOSED')),
    fee_percentage DECIMAL(10, 2) DEFAULT 0.3,
    last_reward_distribution TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for liquidity_pools
CREATE INDEX idx_liquidity_pools_tokens ON liquidity_pools(token0, token1);
CREATE INDEX idx_liquidity_pools_status ON liquidity_pools(status);

-- Create liquidity_positions table
CREATE TABLE IF NOT EXISTS liquidity_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    pool_id UUID NOT NULL REFERENCES liquidity_pools(id),
    lp_token_amount DECIMAL(30, 18) NOT NULL,
    token0_amount DECIMAL(30, 18) NOT NULL,
    token1_amount DECIMAL(30, 18) NOT NULL,
    farming_rewards DECIMAL(30, 18) DEFAULT 0,
    impermanent_loss DECIMAL(30, 18) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REMOVED')),
    auto_harvest BOOLEAN DEFAULT false,
    auto_restake BOOLEAN DEFAULT false,
    add_liquidity_tx_hash VARCHAR(255),
    remove_liquidity_tx_hash VARCHAR(255),
    last_harvest_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for liquidity_positions
CREATE INDEX idx_liquidity_positions_user_id ON liquidity_positions(user_id);
CREATE INDEX idx_liquidity_positions_pool_id ON liquidity_positions(pool_id);
CREATE INDEX idx_liquidity_positions_user_status ON liquidity_positions(user_id, status);

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    collateral_asset VARCHAR(20) NOT NULL,
    collateral_amount DECIMAL(30, 18) NOT NULL,
    collateral_value_usd DECIMAL(30, 18) NOT NULL,
    collateral_type VARCHAR(20) DEFAULT 'CRYPTO' CHECK (collateral_type IN ('CRYPTO', 'NFT', 'LP_TOKEN')),
    nft_token_id VARCHAR(255),
    nft_contract_address VARCHAR(255),
    borrowed_asset VARCHAR(20) NOT NULL,
    borrowed_amount DECIMAL(30, 18) NOT NULL,
    accrued_interest DECIMAL(30, 18) DEFAULT 0,
    interest_rate DECIMAL(10, 2) NOT NULL,
    health_factor DECIMAL(10, 2) NOT NULL,
    ltv_ratio DECIMAL(10, 2) NOT NULL,
    liquidation_threshold DECIMAL(10, 2) DEFAULT 75,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REPAID', 'LIQUIDATED', 'DEFAULTED')),
    loan_start_date TIMESTAMP NOT NULL,
    loan_end_date TIMESTAMP,
    last_interest_update TIMESTAMP NOT NULL,
    borrow_tx_hash VARCHAR(255),
    repay_tx_hash VARCHAR(255),
    liquidation_tx_hash VARCHAR(255),
    contract_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for loans
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_user_status ON loans(user_id, status);
CREATE INDEX idx_loans_health_factor ON loans(health_factor);

-- Create rewards_history table
CREATE TABLE IF NOT EXISTS rewards_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('STAKING', 'FARMING', 'LENDING', 'REFERRAL')),
    reward_asset VARCHAR(20) NOT NULL,
    amount DECIMAL(30, 18) NOT NULL,
    value_usd DECIMAL(30, 18),
    source_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLAIMED', 'COMPOUNDED')),
    transaction_hash VARCHAR(255),
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for rewards_history
CREATE INDEX idx_rewards_history_user_id ON rewards_history(user_id);
CREATE INDEX idx_rewards_history_user_type ON rewards_history(user_id, reward_type);
CREATE INDEX idx_rewards_history_status ON rewards_history(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_staking_positions_updated_at BEFORE UPDATE ON staking_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_liquidity_pools_updated_at BEFORE UPDATE ON liquidity_pools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_liquidity_positions_updated_at BEFORE UPDATE ON liquidity_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
