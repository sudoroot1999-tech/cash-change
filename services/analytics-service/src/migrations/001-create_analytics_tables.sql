-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Trading Volume Metrics (Time-series data)
CREATE TABLE IF NOT EXISTS trading_volume_metrics (
    time TIMESTAMPTZ NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    user_level VARCHAR(20),
    buy_volume DECIMAL(20, 8) DEFAULT 0,
    sell_volume DECIMAL(20, 8) DEFAULT 0,
    total_volume DECIMAL(20, 8) DEFAULT 0,
    trade_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_trade_size DECIMAL(20, 8) DEFAULT 0
);

SELECT create_hypertable('trading_volume_metrics', 'time', if_not_exists => TRUE);

-- Create indices for faster queries
CREATE INDEX IF NOT EXISTS idx_trading_volume_pair_time ON trading_volume_metrics (trading_pair, time DESC);
CREATE INDEX IF NOT EXISTS idx_trading_volume_level_time ON trading_volume_metrics (user_level, time DESC);

-- User Activity Metrics (Time-series data)
CREATE TABLE IF NOT EXISTS user_activity_metrics (
    time TIMESTAMPTZ NOT NULL,
    metric_type VARCHAR(20) NOT NULL, -- DAU, WAU, MAU
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    active_traders INTEGER DEFAULT 0,
    verified_users INTEGER DEFAULT 0
);

SELECT create_hypertable('user_activity_metrics', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_user_activity_type_time ON user_activity_metrics (metric_type, time DESC);

-- Revenue Metrics (Time-series data)
CREATE TABLE IF NOT EXISTS revenue_metrics (
    time TIMESTAMPTZ NOT NULL,
    revenue_type VARCHAR(30) NOT NULL, -- trading_fee, withdrawal_fee, etc.
    amount DECIMAL(20, 8) DEFAULT 0,
    currency VARCHAR(10) NOT NULL,
    transaction_count INTEGER DEFAULT 0
);

SELECT create_hypertable('revenue_metrics', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_revenue_type_time ON revenue_metrics (revenue_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_currency_time ON revenue_metrics (currency, time DESC);

-- Liquidity Metrics (Time-series data)
CREATE TABLE IF NOT EXISTS liquidity_metrics (
    time TIMESTAMPTZ NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    bid_volume DECIMAL(20, 8) DEFAULT 0,
    ask_volume DECIMAL(20, 8) DEFAULT 0,
    spread DECIMAL(10, 6) DEFAULT 0,
    depth_10 DECIMAL(20, 8) DEFAULT 0, -- Depth at 10% from mid price
    depth_20 DECIMAL(20, 8) DEFAULT 0, -- Depth at 20% from mid price
    order_count INTEGER DEFAULT 0
);

SELECT create_hypertable('liquidity_metrics', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_liquidity_pair_time ON liquidity_metrics (trading_pair, time DESC);

-- User Cohort Analysis
CREATE TABLE IF NOT EXISTS user_cohorts (
    cohort_id SERIAL PRIMARY KEY,
    cohort_date DATE NOT NULL,
    cohort_name VARCHAR(100),
    total_users INTEGER DEFAULT 0,
    retention_day_1 INTEGER DEFAULT 0,
    retention_day_7 INTEGER DEFAULT 0,
    retention_day_30 INTEGER DEFAULT 0,
    retention_day_90 INTEGER DEFAULT 0,
    avg_lifetime_value DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_date ON user_cohorts (cohort_date DESC);

-- User Behavior Patterns
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
    pattern_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL, -- login_frequency, trading_style, etc.
    pattern_data JSONB,
    confidence_score DECIMAL(5, 4),
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavior_user_id ON user_behavior_patterns (user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_type ON user_behavior_patterns (pattern_type);

-- Churn Prediction
CREATE TABLE IF NOT EXISTS churn_predictions (
    prediction_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    churn_probability DECIMAL(5, 4) NOT NULL,
    risk_level VARCHAR(20), -- low, medium, high
    factors JSONB,
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' -- active, churned, retained
);

CREATE INDEX IF NOT EXISTS idx_churn_user_id ON churn_predictions (user_id);
CREATE INDEX IF NOT EXISTS idx_churn_risk ON churn_predictions (risk_level, predicted_at DESC);

-- Financial Snapshots
CREATE TABLE IF NOT EXISTS financial_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(30) NOT NULL, -- daily, weekly, monthly
    total_revenue DECIMAL(20, 8) DEFAULT 0,
    total_expenses DECIMAL(20, 8) DEFAULT 0,
    net_profit DECIMAL(20, 8) DEFAULT 0,
    total_assets DECIMAL(20, 8) DEFAULT 0,
    total_liabilities DECIMAL(20, 8) DEFAULT 0,
    reserve_ratio DECIMAL(10, 6) DEFAULT 0,
    snapshot_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_date ON financial_snapshots (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_type ON financial_snapshots (snapshot_type, snapshot_date DESC);

-- Risk Exposure
CREATE TABLE IF NOT EXISTS risk_exposure (
    exposure_id SERIAL PRIMARY KEY,
    measured_at TIMESTAMPTZ NOT NULL,
    asset VARCHAR(10) NOT NULL,
    total_exposure DECIMAL(20, 8) DEFAULT 0,
    long_exposure DECIMAL(20, 8) DEFAULT 0,
    short_exposure DECIMAL(20, 8) DEFAULT 0,
    concentration_ratio DECIMAL(10, 6) DEFAULT 0,
    var_95 DECIMAL(20, 8) DEFAULT 0, -- Value at Risk 95%
    var_99 DECIMAL(20, 8) DEFAULT 0 -- Value at Risk 99%
);

CREATE INDEX IF NOT EXISTS idx_risk_asset_time ON risk_exposure (asset, measured_at DESC);

-- Liquidation Events
CREATE TABLE IF NOT EXISTS liquidation_events (
    event_id SERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    position_id VARCHAR(100),
    asset VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    liquidation_price DECIMAL(20, 8) NOT NULL,
    loss_amount DECIMAL(20, 8) DEFAULT 0,
    event_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_liquidation_time ON liquidation_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquidation_user ON liquidation_events (user_id);
CREATE INDEX IF NOT EXISTS idx_liquidation_asset ON liquidation_events (asset, occurred_at DESC);

-- Fraud Detection Alerts
CREATE TABLE IF NOT EXISTS fraud_alerts (
    alert_id SERIAL PRIMARY KEY,
    detected_at TIMESTAMPTZ NOT NULL,
    user_id VARCHAR(100),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    description TEXT,
    alert_data JSONB,
    status VARCHAR(20) DEFAULT 'open', -- open, investigating, resolved, false_positive
    assigned_to VARCHAR(100),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fraud_status ON fraud_alerts (status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_severity ON fraud_alerts (severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_user ON fraud_alerts (user_id);

-- Marketing Campaign Performance
CREATE TABLE IF NOT EXISTS campaign_performance (
    campaign_id VARCHAR(100) PRIMARY KEY,
    campaign_name VARCHAR(200) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    budget DECIMAL(20, 2) DEFAULT 0,
    spend DECIMAL(20, 2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(20, 8) DEFAULT 0,
    cac DECIMAL(20, 8) DEFAULT 0, -- Customer Acquisition Cost
    roi DECIMAL(10, 4) DEFAULT 0,
    campaign_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_channel ON campaign_performance (channel);
CREATE INDEX IF NOT EXISTS idx_campaign_dates ON campaign_performance (start_date, end_date);

-- Referral Program Stats
CREATE TABLE IF NOT EXISTS referral_stats (
    stat_id SERIAL PRIMARY KEY,
    measured_date DATE NOT NULL,
    total_referrers INTEGER DEFAULT 0,
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    total_rewards_paid DECIMAL(20, 8) DEFAULT 0,
    referral_revenue DECIMAL(20, 8) DEFAULT 0,
    top_referrer_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_referral_date ON referral_stats (measured_date DESC);

-- Conversion Funnels
CREATE TABLE IF NOT EXISTS conversion_funnels (
    funnel_id SERIAL PRIMARY KEY,
    funnel_name VARCHAR(100) NOT NULL,
    measured_date DATE NOT NULL,
    step_1_count INTEGER DEFAULT 0, -- e.g., landing page visit
    step_2_count INTEGER DEFAULT 0, -- e.g., registration
    step_3_count INTEGER DEFAULT 0, -- e.g., KYC submission
    step_4_count INTEGER DEFAULT 0, -- e.g., first deposit
    step_5_count INTEGER DEFAULT 0, -- e.g., first trade
    conversion_rate DECIMAL(5, 4) DEFAULT 0,
    drop_off_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_funnel_name_date ON conversion_funnels (funnel_name, measured_date DESC);

-- Price Movement Analytics
CREATE TABLE IF NOT EXISTS price_movements (
    time TIMESTAMPTZ NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    open_price DECIMAL(20, 8) NOT NULL,
    high_price DECIMAL(20, 8) NOT NULL,
    low_price DECIMAL(20, 8) NOT NULL,
    close_price DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 8) DEFAULT 0,
    volatility DECIMAL(10, 6) DEFAULT 0,
    price_change DECIMAL(10, 6) DEFAULT 0
);

SELECT create_hypertable('price_movements', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_price_pair_time ON price_movements (trading_pair, time DESC);

-- Data Retention Policies
SELECT add_retention_policy('trading_volume_metrics', INTERVAL '2 years', if_not_exists => TRUE);
SELECT add_retention_policy('user_activity_metrics', INTERVAL '2 years', if_not_exists => TRUE);
SELECT add_retention_policy('revenue_metrics', INTERVAL '5 years', if_not_exists => TRUE);
SELECT add_retention_policy('liquidity_metrics', INTERVAL '1 year', if_not_exists => TRUE);
SELECT add_retention_policy('price_movements', INTERVAL '2 years', if_not_exists => TRUE);

-- Continuous Aggregates for faster queries
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_trading_volume
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    trading_pair,
    SUM(total_volume) AS total_volume,
    SUM(trade_count) AS trade_count,
    AVG(avg_trade_size) AS avg_trade_size
FROM trading_volume_metrics
GROUP BY bucket, trading_pair;

CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_revenue
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    revenue_type,
    currency,
    SUM(amount) AS total_amount,
    SUM(transaction_count) AS transaction_count
FROM revenue_metrics
GROUP BY bucket, revenue_type, currency;

-- Refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('daily_trading_volume',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('hourly_revenue',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);
