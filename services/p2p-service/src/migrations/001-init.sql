-- P2P Marketplace Database Schema

-- Create p2p_ads table
CREATE TABLE p2p_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
    crypto_asset VARCHAR(10) NOT NULL,
    fiat_currency VARCHAR(10) NOT NULL,
    price NUMERIC(18, 8) NOT NULL,
    price_type VARCHAR(20) DEFAULT 'fixed',
    margin_percentage NUMERIC(5, 2),
    min_limit NUMERIC(18, 2) NOT NULL,
    max_limit NUMERIC(18, 2) NOT NULL,
    available_amount NUMERIC(18, 8) NOT NULL,
    payment_methods TEXT[] NOT NULL,
    payment_time_limit INTEGER DEFAULT 30,
    auto_reply TEXT,
    terms TEXT,
    min_buyer_rating NUMERIC(3, 2) DEFAULT 0,
    require_verification BOOLEAN DEFAULT FALSE,
    require_id_verification BOOLEAN DEFAULT FALSE,
    blacklist TEXT[],
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused', 'deleted')),
    total_trades INTEGER DEFAULT 0,
    completed_trades INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_ads_user_id ON p2p_ads(user_id);
CREATE INDEX idx_p2p_ads_status ON p2p_ads(status);
CREATE INDEX idx_p2p_ads_crypto_fiat ON p2p_ads(crypto_asset, fiat_currency, type, status);
CREATE INDEX idx_p2p_ads_created_at ON p2p_ads(created_at);

-- Create p2p_trades table
CREATE TABLE p2p_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES p2p_ads(id),
    buyer_id VARCHAR(255) NOT NULL,
    seller_id VARCHAR(255) NOT NULL,
    crypto_asset VARCHAR(10) NOT NULL,
    crypto_amount NUMERIC(18, 8) NOT NULL,
    fiat_currency VARCHAR(10) NOT NULL,
    fiat_amount NUMERIC(18, 2) NOT NULL,
    price NUMERIC(18, 8) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_details JSONB,
    payment_proof TEXT[],
    payment_reference VARCHAR(255),
    escrow_fee NUMERIC(18, 8) NOT NULL,
    escrow_address VARCHAR(255),
    escrow_tx_hash VARCHAR(255),
    release_tx_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'cancelled', 'disputed', 'refunded', 'expired')),
    notes TEXT,
    seller_notes TEXT,
    paid_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by VARCHAR(255),
    cancellation_reason TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_trades_buyer_id ON p2p_trades(buyer_id);
CREATE INDEX idx_p2p_trades_seller_id ON p2p_trades(seller_id);
CREATE INDEX idx_p2p_trades_ad_id ON p2p_trades(ad_id);
CREATE INDEX idx_p2p_trades_status ON p2p_trades(status);
CREATE INDEX idx_p2p_trades_expires_at ON p2p_trades(expires_at);
CREATE INDEX idx_p2p_trades_created_at ON p2p_trades(created_at);

-- Create p2p_disputes table
CREATE TABLE p2p_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES p2p_trades(id),
    opened_by VARCHAR(255) NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('payment_not_received', 'payment_issue', 'wrong_amount', 'scam_attempt', 'other')),
    description TEXT NOT NULL,
    evidence TEXT[],
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
    assigned_to VARCHAR(255),
    admin_notes TEXT,
    resolution VARCHAR(30) CHECK (resolution IN ('buyer_wins', 'seller_wins', 'partial_refund', 'cancelled')),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_p2p_disputes_trade_id ON p2p_disputes(trade_id);
CREATE INDEX idx_p2p_disputes_status ON p2p_disputes(status);
CREATE INDEX idx_p2p_disputes_assigned_to ON p2p_disputes(assigned_to);
CREATE INDEX idx_p2p_disputes_created_at ON p2p_disputes(created_at);

-- Create user_ratings table
CREATE TABLE user_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES p2p_trades(id),
    rated_user_id VARCHAR(255) NOT NULL,
    rater_user_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('positive', 'neutral', 'negative')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_ratings_rated_user_id ON user_ratings(rated_user_id);
CREATE INDEX idx_user_ratings_trade_id ON user_ratings(trade_id);
CREATE INDEX idx_user_ratings_created_at ON user_ratings(created_at);

-- Create trade_messages table
CREATE TABLE trade_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES p2p_trades(id),
    sender_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
    content TEXT NOT NULL,
    file_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trade_messages_trade_id ON trade_messages(trade_id, created_at);
CREATE INDEX idx_trade_messages_sender_id ON trade_messages(sender_id);

-- Create user_statistics table
CREATE TABLE user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) UNIQUE NOT NULL,
    total_trades INTEGER DEFAULT 0,
    completed_trades INTEGER DEFAULT 0,
    cancelled_trades INTEGER DEFAULT 0,
    disputed_trades INTEGER DEFAULT 0,
    total_volume NUMERIC(18, 2) DEFAULT 0,
    positive_ratings INTEGER DEFAULT 0,
    neutral_ratings INTEGER DEFAULT 0,
    negative_ratings INTEGER DEFAULT 0,
    average_rating NUMERIC(3, 2) DEFAULT 0,
    completion_rate NUMERIC(5, 2) DEFAULT 0,
    average_release_time INTEGER DEFAULT 0,
    last_trade_at TIMESTAMP,
    is_trusted BOOLEAN DEFAULT FALSE,
    trust_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_statistics_user_id ON user_statistics(user_id);

-- ============================================================
-- LOANS TABLE
-- ============================================================
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lender_id UUID NOT NULL,
    borrower_id UUID NOT NULL,
    
    -- Principal
    principal_amount DECIMAL(30, 8) NOT NULL,
    principal_currency VARCHAR(10) NOT NULL,
    
    -- Collateral
    collateral_amount DECIMAL(30, 8) NOT NULL,
    collateral_currency VARCHAR(10) NOT NULL,
    collateral_type VARCHAR(20) DEFAULT 'CRYPTO', -- CRYPTO, NFT
    collateral_wallet_address VARCHAR(255),
    
    -- Terms
    interest_rate DECIMAL(10, 4) NOT NULL, -- APR percentage
    duration_days INTEGER NOT NULL,
    ltv_ratio DECIMAL(10, 4) NOT NULL, -- Loan-to-value ratio
    liquidation_threshold DECIMAL(10, 4) DEFAULT 150.00,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    -- ACTIVE, REPAID, DEFAULTED, LIQUIDATED
    
    -- Dates
    created_at TIMESTAMPTZ DEFAULT NOW(),
    funded_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ NOT NULL,
    repaid_at TIMESTAMPTZ,
    liquidated_at TIMESTAMPTZ,
    
    -- Tracking
    total_paid DECIMAL(30, 8) DEFAULT 0,
    accrued_interest DECIMAL(30, 8) DEFAULT 0,
    last_interest_calculation TIMESTAMPTZ DEFAULT NOW(),
    
    -- Blockchain
    contract_address VARCHAR(255),
    loan_contract_id VARCHAR(100),
    creation_tx_hash VARCHAR(255),
    repayment_tx_hash VARCHAR(255),
    liquidation_tx_hash VARCHAR(255),
    
    -- Metadata
    loan_purpose TEXT,
    terms_accepted_at TIMESTAMPTZ,
    
    CONSTRAINT chk_status CHECK (status IN ('PENDING', 'ACTIVE', 'REPAID', 'DEFAULTED', 'LIQUIDATED', 'CANCELLED')),
    CONSTRAINT chk_collateral_type CHECK (collateral_type IN ('CRYPTO', 'NFT'))
);

CREATE INDEX idx_loans_lender ON loans(lender_id);
CREATE INDEX idx_loans_borrower ON loans(borrower_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_due_date ON loans(due_date);
CREATE INDEX idx_loans_created_at ON loans(created_at DESC);

-- ============================================================
-- LOAN REQUESTS TABLE (Marketplace)
-- ============================================================
CREATE TABLE loan_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    request_type VARCHAR(10) NOT NULL, -- 'OFFER' or 'REQUEST'
    
    -- Amount details
    principal_amount DECIMAL(30, 8) NOT NULL,
    principal_currency VARCHAR(10) NOT NULL,
    
    -- Collateral (for borrowers)
    collateral_amount DECIMAL(30, 8),
    collateral_currency VARCHAR(10),
    collateral_type VARCHAR(20) DEFAULT 'CRYPTO',
    proposed_ltv DECIMAL(10, 4),
    
    -- Terms
    min_interest_rate DECIMAL(10, 4), -- For lenders
    max_interest_rate DECIMAL(10, 4), -- For borrowers
    duration_days INTEGER NOT NULL,
    
    -- Matching criteria
    min_credit_score INTEGER,
    max_ltv_ratio DECIMAL(10, 4),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    -- OPEN, MATCHED, ACTIVE, EXPIRED, CANCELLED
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    matched_request_id UUID REFERENCES loan_requests(id),
    
    -- Auto-matching
    auto_match_enabled BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT chk_request_type CHECK (request_type IN ('OFFER', 'REQUEST')),
    CONSTRAINT chk_request_status CHECK (status IN ('OPEN', 'MATCHED', 'ACTIVE', 'EXPIRED', 'CANCELLED'))
);

CREATE INDEX idx_loan_requests_user ON loan_requests(user_id);
CREATE INDEX idx_loan_requests_type ON loan_requests(request_type);
CREATE INDEX idx_loan_requests_status ON loan_requests(status);
CREATE INDEX idx_loan_requests_currency ON loan_requests(principal_currency);
CREATE INDEX idx_loan_requests_created ON loan_requests(created_at DESC);

-- ============================================================
-- LOAN REPAYMENTS TABLE
-- ============================================================
CREATE TABLE loan_repayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(30, 8) NOT NULL,
    principal_paid DECIMAL(30, 8) NOT NULL,
    interest_paid DECIMAL(30, 8) NOT NULL,
    
    -- Blockchain
    transaction_hash VARCHAR(255) NOT NULL,
    block_number BIGINT,
    
    -- Timestamps
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    
    -- Metadata
    payment_method VARCHAR(50),
    notes TEXT
);

CREATE INDEX idx_repayments_loan ON loan_repayments(loan_id);
CREATE INDEX idx_repayments_paid_at ON loan_repayments(paid_at DESC);

-- ============================================================
-- CREDIT SCORES TABLE
-- ============================================================
CREATE TABLE credit_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Score (0-1000)
    score INTEGER NOT NULL DEFAULT 500,
    grade VARCHAR(5) NOT NULL DEFAULT 'C', -- A+, A, B, C, D, F
    
    -- Components
    repayment_history_score DECIMAL(10, 2) DEFAULT 0, -- 40%
    credit_utilization_score DECIMAL(10, 2) DEFAULT 0, -- 20%
    account_age_score DECIMAL(10, 2) DEFAULT 0, -- 15%
    loan_diversity_score DECIMAL(10, 2) DEFAULT 0, -- 10%
    defaults_score DECIMAL(10, 2) DEFAULT 0, -- 10%
    onchain_activity_score DECIMAL(10, 2) DEFAULT 0, -- 5%
    
    -- Statistics
    total_loans INTEGER DEFAULT 0,
    completed_loans INTEGER DEFAULT 0,
    defaulted_loans INTEGER DEFAULT 0,
    total_borrowed DECIMAL(30, 8) DEFAULT 0,
    total_repaid DECIMAL(30, 8) DEFAULT 0,
    on_time_payments INTEGER DEFAULT 0,
    late_payments INTEGER DEFAULT 0,
    avg_ltv DECIMAL(10, 4) DEFAULT 0,
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    last_loan_at TIMESTAMPTZ,
    
    -- Account age (in days)
    account_age_days INTEGER DEFAULT 0,
    
    CONSTRAINT chk_score_range CHECK (score >= 0 AND score <= 1000),
    CONSTRAINT chk_grade CHECK (grade IN ('A+', 'A', 'B', 'C', 'D', 'F'))
);

CREATE INDEX idx_credit_scores_user ON credit_scores(user_id);
CREATE INDEX idx_credit_scores_score ON credit_scores(score DESC);
CREATE INDEX idx_credit_scores_grade ON credit_scores(grade);

-- ============================================================
-- CREDIT HISTORY TABLE
-- ============================================================
CREATE TABLE credit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,
    -- LOAN_CREATED, LOAN_REPAID, LOAN_DEFAULTED, PAYMENT_LATE, etc.
    
    -- Impact
    score_before INTEGER NOT NULL,
    score_after INTEGER NOT NULL,
    score_change INTEGER NOT NULL,
    
    -- Reference
    loan_id UUID REFERENCES loans(id),
    
    -- Timestamps
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    details JSONB
);

CREATE INDEX idx_credit_history_user ON credit_history(user_id);
CREATE INDEX idx_credit_history_occurred ON credit_history(occurred_at DESC);

-- ============================================================
-- COLLATERAL MONITORING TABLE
-- ============================================================
CREATE TABLE collateral_monitoring (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    
    -- Current values
    collateral_value_usd DECIMAL(30, 8) NOT NULL,
    borrowed_value_usd DECIMAL(30, 8) NOT NULL,
    current_ltv DECIMAL(10, 4) NOT NULL,
    health_factor DECIMAL(10, 4) NOT NULL,
    
    -- Price data
    collateral_price_usd DECIMAL(30, 8) NOT NULL,
    borrowed_price_usd DECIMAL(30, 8) NOT NULL,
    
    -- Oracle data
    oracle_source VARCHAR(50), -- CHAINLINK, CUSTOM
    price_update_timestamp TIMESTAMPTZ,
    
    -- Liquidation tracking
    is_at_risk BOOLEAN DEFAULT FALSE,
    liquidation_warning_sent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collateral_loan ON collateral_monitoring(loan_id);
CREATE INDEX idx_collateral_at_risk ON collateral_monitoring(is_at_risk);
CREATE INDEX idx_collateral_checked ON collateral_monitoring(checked_at DESC);

-- ============================================================
-- INSURANCE FUND TABLE
-- ============================================================
CREATE TABLE insurance_fund (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Fund details
    asset_symbol VARCHAR(10) NOT NULL,
    total_amount DECIMAL(30, 8) NOT NULL DEFAULT 0,
    reserved_amount DECIMAL(30, 8) NOT NULL DEFAULT 0,
    available_amount DECIMAL(30, 8) NOT NULL DEFAULT 0,
    
    -- Statistics
    total_claims_paid DECIMAL(30, 8) DEFAULT 0,
    total_deposits DECIMAL(30, 8) DEFAULT 0,
    claim_count INTEGER DEFAULT 0,
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(asset_symbol)
);

-- ============================================================
-- INSURANCE CLAIMS TABLE
-- ============================================================
CREATE TABLE insurance_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id),
    
    -- Claim details
    claim_amount DECIMAL(30, 8) NOT NULL,
    claim_asset VARCHAR(10) NOT NULL,
    
    -- Coverage
    approved_amount DECIMAL(30, 8),
    coverage_percentage DECIMAL(10, 4),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING, APPROVED, PAID, REJECTED
    
    -- Processing
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    -- Blockchain
    payout_tx_hash VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    reason TEXT,
    
    CONSTRAINT chk_claim_status CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'REJECTED'))
);

CREATE INDEX idx_insurance_claims_loan ON insurance_claims(loan_id);
CREATE INDEX idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX idx_insurance_claims_created ON insurance_claims(created_at DESC);

-- ============================================================
-- INTEREST RATE HISTORY TABLE
-- ============================================================
CREATE TABLE interest_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Rate details
    asset_symbol VARCHAR(10) NOT NULL,
    base_rate DECIMAL(10, 4) NOT NULL,
    calculated_rate DECIMAL(10, 4) NOT NULL,
    
    -- Factors
    supply_demand_factor DECIMAL(10, 4) DEFAULT 0,
    volatility_factor DECIMAL(10, 4) DEFAULT 0,
    utilization_rate DECIMAL(10, 4) DEFAULT 0,
    
    -- Market data
    total_supply DECIMAL(30, 8) DEFAULT 0,
    total_demand DECIMAL(30, 8) DEFAULT 0,
    
    -- Timestamp
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interest_rate_asset ON interest_rate_history(asset_symbol);
CREATE INDEX idx_interest_rate_calculated ON interest_rate_history(calculated_at DESC);

-- ============================================================
-- LIQUIDATIONS TABLE
-- ============================================================
CREATE TABLE liquidations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id),
    
    -- Liquidation details
    liquidator_id UUID,
    collateral_seized DECIMAL(30, 8) NOT NULL,
    collateral_value_usd DECIMAL(30, 8) NOT NULL,
    debt_covered DECIMAL(30, 8) NOT NULL,
    
    -- Shortfall (covered by insurance)
    shortfall_amount DECIMAL(30, 8) DEFAULT 0,
    insurance_coverage DECIMAL(30, 8) DEFAULT 0,
    
    -- Excess returned to borrower
    excess_returned DECIMAL(30, 8) DEFAULT 0,
    
    -- Blockchain
    liquidation_tx_hash VARCHAR(255),
    block_number BIGINT,
    
    -- Liquidator reward
    liquidation_bonus DECIMAL(30, 8) DEFAULT 0,
    
    -- Timestamps
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_liquidations_loan ON liquidations(loan_id);
CREATE INDEX idx_liquidations_liquidator ON liquidations(liquidator_id);
CREATE INDEX idx_liquidations_triggered ON liquidations(triggered_at DESC);

-- ============================================================
-- PLATFORM STATISTICS TABLE
-- ============================================================
CREATE TABLE platform_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Snapshot date
    date DATE NOT NULL UNIQUE,
    
    -- Loan statistics
    total_loans_created INTEGER DEFAULT 0,
    total_loans_active INTEGER DEFAULT 0,
    total_loans_completed INTEGER DEFAULT 0,
    total_loans_defaulted INTEGER DEFAULT 0,
    
    -- Volume
    total_volume_usd DECIMAL(30, 8) DEFAULT 0,
    daily_volume_usd DECIMAL(30, 8) DEFAULT 0,
    
    -- TVL
    total_value_locked_usd DECIMAL(30, 8) DEFAULT 0,
    
    -- Revenue
    total_fees_collected_usd DECIMAL(30, 8) DEFAULT 0,
    daily_fees_usd DECIMAL(30, 8) DEFAULT 0,
    
    -- Insurance
    insurance_fund_size_usd DECIMAL(30, 8) DEFAULT 0,
    insurance_claims_paid_usd DECIMAL(30, 8) DEFAULT 0,
    
    -- Users
    total_lenders INTEGER DEFAULT 0,
    total_borrowers INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    
    -- Updated
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_stats_date ON platform_statistics(date DESC);

-- ============================================================
-- VIEWS
-- ============================================================

-- Active loans with health metrics
CREATE OR REPLACE VIEW active_loans_with_health AS
SELECT 
    l.*,
    cm.current_ltv,
    cm.health_factor,
    cm.is_at_risk,
    cs.score as borrower_credit_score,
    cs.grade as borrower_credit_grade
FROM loans l
LEFT JOIN LATERAL (
    SELECT * FROM collateral_monitoring
    WHERE loan_id = l.id
    ORDER BY checked_at DESC
    LIMIT 1
) cm ON TRUE
LEFT JOIN credit_scores cs ON cs.user_id = l.borrower_id
WHERE l.status = 'ACTIVE';

-- User loan summary
CREATE OR REPLACE VIEW user_loan_summary AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_loans,
    COUNT(*) FILTER (WHERE status = 'REPAID') as completed_loans,
    COUNT(*) FILTER (WHERE status = 'DEFAULTED') as defaulted_loans,
    SUM(principal_amount) FILTER (WHERE status = 'ACTIVE') as total_active_borrowed,
    SUM(principal_amount) FILTER (WHERE status = 'REPAID') as total_repaid,
    AVG(interest_rate) as avg_interest_rate,
    AVG(ltv_ratio) as avg_ltv_ratio
FROM (
    SELECT borrower_id as user_id, status, principal_amount, interest_rate, ltv_ratio FROM loans
    UNION ALL
    SELECT lender_id as user_id, status, principal_amount, interest_rate, ltv_ratio FROM loans
) combined
GROUP BY user_id;

-- Marketplace summary
CREATE OR REPLACE VIEW marketplace_summary AS
SELECT 
    principal_currency,
    request_type,
    COUNT(*) as total_requests,
    SUM(principal_amount) as total_amount,
    AVG(COALESCE(min_interest_rate, max_interest_rate)) as avg_interest_rate,
    AVG(duration_days) as avg_duration_days
FROM loan_requests
WHERE status = 'OPEN'
GROUP BY principal_currency, request_type;

COMMENT ON TABLE loans IS 'Active and historical P2P loans';
COMMENT ON TABLE loan_requests IS 'Marketplace for loan offers and requests';
COMMENT ON TABLE credit_scores IS 'User credit scoring system (0-1000)';
COMMENT ON TABLE insurance_fund IS 'Insurance fund for loan defaults';
COMMENT ON TABLE collateral_monitoring IS 'Real-time collateral health tracking';

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_p2p_ads_updated_at BEFORE UPDATE ON p2p_ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_p2p_trades_updated_at BEFORE UPDATE ON p2p_trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_p2p_disputes_updated_at BEFORE UPDATE ON p2p_disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
