-- Comprehensive Business Metrics Schema
-- This migration adds all KPI tracking tables for comprehensive business metrics

-- =============================================================================
-- USER METRICS
-- =============================================================================

-- Daily User Metrics (comprehensive)
CREATE TABLE IF NOT EXISTS metrics_daily_users (
    time TIMESTAMPTZ NOT NULL,
    total_registered_users BIGINT DEFAULT 0,
    daily_active_users INTEGER DEFAULT 0,
    weekly_active_users INTEGER DEFAULT 0,
    monthly_active_users INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    retention_1_day DECIMAL(5, 4) DEFAULT 0,
    retention_7_day DECIMAL(5, 4) DEFAULT 0,
    retention_30_day DECIMAL(5, 4) DEFAULT 0,
    churn_rate DECIMAL(5, 4) DEFAULT 0,
    user_lifetime_value DECIMAL(20, 8) DEFAULT 0,
    customer_acquisition_cost DECIMAL(20, 8) DEFAULT 0,
    ltv_cac_ratio DECIMAL(10, 4) DEFAULT 0,
    growth_rate DECIMAL(10, 6) DEFAULT 0
);

SELECT create_hypertable('metrics_daily_users', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_users_time ON metrics_daily_users (time DESC);

-- Hourly User Metrics (real-time)
CREATE TABLE IF NOT EXISTS metrics_hourly_users (
    time TIMESTAMPTZ NOT NULL,
    active_users INTEGER DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    verified_users INTEGER DEFAULT 0,
    avg_session_duration DECIMAL(10, 2) DEFAULT 0
);

SELECT create_hypertable('metrics_hourly_users', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_users_time ON metrics_hourly_users (time DESC);

-- =============================================================================
-- TRADING METRICS
-- =============================================================================

-- Daily Trading Metrics
CREATE TABLE IF NOT EXISTS metrics_daily_trading (
    time TIMESTAMPTZ NOT NULL,
    trading_pair VARCHAR(20),
    total_volume_24h DECIMAL(30, 8) DEFAULT 0,
    total_volume_7d DECIMAL(30, 8) DEFAULT 0,
    total_volume_30d DECIMAL(30, 8) DEFAULT 0,
    number_of_trades INTEGER DEFAULT 0,
    average_trade_size DECIMAL(20, 8) DEFAULT 0,
    maker_volume DECIMAL(30, 8) DEFAULT 0,
    taker_volume DECIMAL(30, 8) DEFAULT 0,
    maker_taker_ratio DECIMAL(10, 6) DEFAULT 0,
    active_traders INTEGER DEFAULT 0,
    new_traders INTEGER DEFAULT 0,
    avg_trades_per_user DECIMAL(10, 4) DEFAULT 0,
    volume_per_user DECIMAL(20, 8) DEFAULT 0
);

SELECT create_hypertable('metrics_daily_trading', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_trading_pair_time ON metrics_daily_trading (trading_pair, time DESC);

-- Hourly Trading Metrics
CREATE TABLE IF NOT EXISTS metrics_hourly_trading (
    time TIMESTAMPTZ NOT NULL,
    trading_pair VARCHAR(20),
    volume DECIMAL(30, 8) DEFAULT 0,
    trade_count INTEGER DEFAULT 0,
    unique_traders INTEGER DEFAULT 0,
    buy_volume DECIMAL(30, 8) DEFAULT 0,
    sell_volume DECIMAL(30, 8) DEFAULT 0
);

SELECT create_hypertable('metrics_hourly_trading', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_trading_pair_time ON metrics_hourly_trading (trading_pair, time DESC);

-- =============================================================================
-- FINANCIAL METRICS
-- =============================================================================

-- Daily Financial Metrics
CREATE TABLE IF NOT EXISTS metrics_daily_financial (
    time TIMESTAMPTZ NOT NULL,
    total_revenue DECIMAL(20, 8) DEFAULT 0,
    trading_fee_revenue DECIMAL(20, 8) DEFAULT 0,
    withdrawal_fee_revenue DECIMAL(20, 8) DEFAULT 0,
    other_fee_revenue DECIMAL(20, 8) DEFAULT 0,
    revenue_by_vip_users DECIMAL(20, 8) DEFAULT 0,
    revenue_by_regular_users DECIMAL(20, 8) DEFAULT 0,
    revenue_growth_rate DECIMAL(10, 6) DEFAULT 0,
    avg_revenue_per_user DECIMAL(20, 8) DEFAULT 0,
    profit_margin DECIMAL(10, 6) DEFAULT 0,
    total_expenses DECIMAL(20, 8) DEFAULT 0,
    net_profit DECIMAL(20, 8) DEFAULT 0,
    break_even_volume DECIMAL(30, 8) DEFAULT 0
);

SELECT create_hypertable('metrics_daily_financial', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_financial_time ON metrics_daily_financial (time DESC);

-- =============================================================================
-- WALLET METRICS
-- =============================================================================

-- Daily Wallet Metrics
CREATE TABLE IF NOT EXISTS metrics_daily_wallet (
    time TIMESTAMPTZ NOT NULL,
    asset VARCHAR(10),
    total_deposits_count INTEGER DEFAULT 0,
    total_deposits_volume DECIMAL(30, 8) DEFAULT 0,
    total_withdrawals_count INTEGER DEFAULT 0,
    total_withdrawals_volume DECIMAL(30, 8) DEFAULT 0,
    net_deposit_flow DECIMAL(30, 8) DEFAULT 0,
    avg_deposit_size DECIMAL(20, 8) DEFAULT 0,
    avg_withdrawal_size DECIMAL(20, 8) DEFAULT 0,
    assets_under_management DECIMAL(30, 8) DEFAULT 0,
    unique_depositors INTEGER DEFAULT 0,
    unique_withdrawers INTEGER DEFAULT 0
);

SELECT create_hypertable('metrics_daily_wallet', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_wallet_asset_time ON metrics_daily_wallet (asset, time DESC);

-- Wallet Balance Distribution
CREATE TABLE IF NOT EXISTS wallet_balance_distribution (
    snapshot_id SERIAL PRIMARY KEY,
    measured_at TIMESTAMPTZ NOT NULL,
    balance_range VARCHAR(50) NOT NULL, -- e.g., '0-100', '100-1000', etc.
    user_count INTEGER DEFAULT 0,
    total_balance DECIMAL(30, 8) DEFAULT 0,
    percentage DECIMAL(5, 4) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wallet_balance_time ON wallet_balance_distribution (measured_at DESC);

-- =============================================================================
-- LIQUIDITY METRICS
-- =============================================================================

-- Hourly Liquidity Metrics (expanded)
CREATE TABLE IF NOT EXISTS metrics_hourly_liquidity (
    time TIMESTAMPTZ NOT NULL,
    trading_pair VARCHAR(20) NOT NULL,
    order_book_depth DECIMAL(30, 8) DEFAULT 0,
    bid_ask_spread DECIMAL(10, 8) DEFAULT 0,
    spread_percentage DECIMAL(10, 6) DEFAULT 0,
    bid_liquidity DECIMAL(30, 8) DEFAULT 0,
    ask_liquidity DECIMAL(30, 8) DEFAULT 0,
    market_maker_orders INTEGER DEFAULT 0,
    market_maker_volume DECIMAL(30, 8) DEFAULT 0,
    slippage_1pct DECIMAL(10, 6) DEFAULT 0,
    slippage_5pct DECIMAL(10, 6) DEFAULT 0
);

SELECT create_hypertable('metrics_hourly_liquidity', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_liquidity_pair_time ON metrics_hourly_liquidity (trading_pair, time DESC);

-- =============================================================================
-- ENGAGEMENT METRICS
-- =============================================================================

-- Daily Engagement Metrics
CREATE TABLE IF NOT EXISTS metrics_daily_engagement (
    time TIMESTAMPTZ NOT NULL,
    avg_session_duration DECIMAL(10, 2) DEFAULT 0,
    avg_pages_per_session DECIMAL(10, 4) DEFAULT 0,
    bounce_rate DECIMAL(5, 4) DEFAULT 0,
    feature_adoption_trading DECIMAL(5, 4) DEFAULT 0,
    feature_adoption_staking DECIMAL(5, 4) DEFAULT 0,
    feature_adoption_defi DECIMAL(5, 4) DEFAULT 0,
    social_features_users INTEGER DEFAULT 0,
    copy_trading_participants INTEGER DEFAULT 0,
    defi_active_users INTEGER DEFAULT 0,
    nft_marketplace_users INTEGER DEFAULT 0,
    total_events_tracked BIGINT DEFAULT 0
);

SELECT create_hypertable('metrics_daily_engagement', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_engagement_time ON metrics_daily_engagement (time DESC);

-- Feature Adoption Tracking
CREATE TABLE IF NOT EXISTS feature_adoption (
    feature_id SERIAL PRIMARY KEY,
    measured_at TIMESTAMPTZ NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    adoption_rate DECIMAL(5, 4) DEFAULT 0,
    avg_usage_per_user DECIMAL(10, 4) DEFAULT 0,
    retention_rate DECIMAL(5, 4) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_feature_adoption_time ON feature_adoption (measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_adoption_name ON feature_adoption (feature_name);

-- =============================================================================
-- OPERATIONAL METRICS
-- =============================================================================

-- Hourly Operational Metrics
CREATE TABLE IF NOT EXISTS metrics_hourly_operational (
    time TIMESTAMPTZ NOT NULL,
    system_uptime_pct DECIMAL(5, 4) DEFAULT 100.0,
    avg_api_response_time DECIMAL(10, 4) DEFAULT 0,
    max_api_response_time DECIMAL(10, 4) DEFAULT 0,
    api_requests_total BIGINT DEFAULT 0,
    api_requests_success BIGINT DEFAULT 0,
    api_requests_error BIGINT DEFAULT 0,
    order_matching_latency DECIMAL(10, 4) DEFAULT 0,
    database_query_time DECIMAL(10, 4) DEFAULT 0,
    error_rate DECIMAL(5, 4) DEFAULT 0,
    cache_hit_rate DECIMAL(5, 4) DEFAULT 0,
    cpu_usage DECIMAL(5, 4) DEFAULT 0,
    memory_usage DECIMAL(5, 4) DEFAULT 0,
    disk_usage DECIMAL(5, 4) DEFAULT 0
);

SELECT create_hypertable('metrics_hourly_operational', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_hourly_operational_time ON metrics_hourly_operational (time DESC);

-- Support Tickets
CREATE TABLE IF NOT EXISTS metrics_daily_support (
    time TIMESTAMPTZ NOT NULL,
    tickets_created INTEGER DEFAULT 0,
    tickets_resolved INTEGER DEFAULT 0,
    tickets_open INTEGER DEFAULT 0,
    avg_resolution_time DECIMAL(10, 2) DEFAULT 0,
    avg_first_response_time DECIMAL(10, 2) DEFAULT 0,
    customer_satisfaction DECIMAL(5, 4) DEFAULT 0,
    tickets_by_priority_high INTEGER DEFAULT 0,
    tickets_by_priority_medium INTEGER DEFAULT 0,
    tickets_by_priority_low INTEGER DEFAULT 0
);

SELECT create_hypertable('metrics_daily_support', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_support_time ON metrics_daily_support (time DESC);

-- =============================================================================
-- SECURITY METRICS
-- =============================================================================

-- Daily Security Metrics
CREATE TABLE IF NOT EXISTS metrics_daily_security (
    time TIMESTAMPTZ NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    suspicious_transactions INTEGER DEFAULT 0,
    fraud_cases_detected INTEGER DEFAULT 0,
    fraud_amount_prevented DECIMAL(30, 8) DEFAULT 0,
    kyc_submissions INTEGER DEFAULT 0,
    kyc_approvals INTEGER DEFAULT 0,
    kyc_rejections INTEGER DEFAULT 0,
    kyc_completion_rate DECIMAL(5, 4) DEFAULT 0,
    twofa_enabled_users INTEGER DEFAULT 0,
    twofa_adoption_rate DECIMAL(5, 4) DEFAULT 0,
    security_incidents INTEGER DEFAULT 0,
    blocked_ips INTEGER DEFAULT 0,
    blocked_accounts INTEGER DEFAULT 0
);

SELECT create_hypertable('metrics_daily_security', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_security_time ON metrics_daily_security (time DESC);

-- =============================================================================
-- MARKETING METRICS
-- =============================================================================

-- Daily Marketing Metrics
CREATE TABLE IF NOT EXISTS metrics_daily_marketing (
    time TIMESTAMPTZ NOT NULL,
    website_visits INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    traffic_source_organic INTEGER DEFAULT 0,
    traffic_source_paid INTEGER DEFAULT 0,
    traffic_source_referral INTEGER DEFAULT 0,
    traffic_source_social INTEGER DEFAULT 0,
    traffic_source_direct INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 4) DEFAULT 0,
    email_sent INTEGER DEFAULT 0,
    email_opened INTEGER DEFAULT 0,
    email_clicked INTEGER DEFAULT 0,
    email_open_rate DECIMAL(5, 4) DEFAULT 0,
    email_click_rate DECIMAL(5, 4) DEFAULT 0,
    social_media_followers INTEGER DEFAULT 0,
    social_media_engagement INTEGER DEFAULT 0,
    referral_signups INTEGER DEFAULT 0,
    referral_rewards_paid DECIMAL(20, 8) DEFAULT 0
);

SELECT create_hypertable('metrics_daily_marketing', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_marketing_time ON metrics_daily_marketing (time DESC);

-- Campaign ROI Tracking
CREATE TABLE IF NOT EXISTS campaign_roi (
    campaign_id VARCHAR(100) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    campaign_spend DECIMAL(20, 2) DEFAULT 0,
    campaign_revenue DECIMAL(20, 8) DEFAULT 0,
    campaign_signups INTEGER DEFAULT 0,
    campaign_conversions INTEGER DEFAULT 0,
    campaign_roi DECIMAL(10, 4) DEFAULT 0,
    campaign_cac DECIMAL(20, 8) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_campaign_roi_id_time ON campaign_roi (campaign_id, measured_at DESC);

-- =============================================================================
-- COMPLIANCE METRICS
-- =============================================================================

-- Daily Compliance Metrics
CREATE TABLE IF NOT EXISTS metrics_daily_compliance (
    time TIMESTAMPTZ NOT NULL,
    pending_kyc_reviews INTEGER DEFAULT 0,
    kyc_approval_rate DECIMAL(5, 4) DEFAULT 0,
    avg_kyc_review_time DECIMAL(10, 2) DEFAULT 0,
    suspicious_activity_reports INTEGER DEFAULT 0,
    aml_alerts INTEGER DEFAULT 0,
    compliance_incidents INTEGER DEFAULT 0,
    regulatory_reports_submitted INTEGER DEFAULT 0,
    audit_logs_generated BIGINT DEFAULT 0,
    data_requests_received INTEGER DEFAULT 0,
    data_requests_fulfilled INTEGER DEFAULT 0
);

SELECT create_hypertable('metrics_daily_compliance', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_compliance_time ON metrics_daily_compliance (time DESC);

-- =============================================================================
-- ALERT CONFIGURATION
-- =============================================================================

-- Metric Alerts Configuration
CREATE TABLE IF NOT EXISTS metric_alerts (
    alert_id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50) NOT NULL,
    threshold_type VARCHAR(20) NOT NULL, -- above, below, percentage_change
    threshold_value DECIMAL(20, 8) NOT NULL,
    comparison_period VARCHAR(20), -- hour, day, week, month
    severity VARCHAR(20) NOT NULL, -- info, warning, critical
    enabled BOOLEAN DEFAULT TRUE,
    alert_channels JSONB, -- email, slack, sms
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metric_alerts_enabled ON metric_alerts (enabled, metric_category);

-- Alert History
CREATE TABLE IF NOT EXISTS alert_history (
    history_id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES metric_alerts(alert_id),
    triggered_at TIMESTAMPTZ NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    current_value DECIMAL(20, 8),
    threshold_value DECIMAL(20, 8),
    severity VARCHAR(20) NOT NULL,
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alert_history_time ON alert_history (triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history (alert_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_acknowledged ON alert_history (acknowledged, resolved);

-- =============================================================================
-- DASHBOARD CONFIGURATION
-- =============================================================================

-- Dashboard Layouts
CREATE TABLE IF NOT EXISTS dashboard_layouts (
    layout_id SERIAL PRIMARY KEY,
    dashboard_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(50), -- executive, trader, analyst, admin, etc.
    layout_config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_name ON dashboard_layouts (dashboard_name);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_role ON dashboard_layouts (user_role);

-- User Dashboard Preferences
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    dashboard_name VARCHAR(100) NOT NULL,
    preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, dashboard_name)
);

CREATE INDEX IF NOT EXISTS idx_user_dashboard_prefs_user ON user_dashboard_preferences (user_id);

-- =============================================================================
-- CONTINUOUS AGGREGATES FOR PERFORMANCE
-- =============================================================================

-- Hourly User Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_user_summary
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    AVG(daily_active_users) AS avg_dau,
    AVG(weekly_active_users) AS avg_wau,
    AVG(monthly_active_users) AS avg_mau,
    SUM(new_registrations) AS total_new_users
FROM metrics_daily_users
GROUP BY bucket;

-- Hourly Trading Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_trading_summary
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    trading_pair,
    SUM(volume) AS total_volume,
    SUM(trade_count) AS total_trades,
    AVG(unique_traders) AS avg_traders
FROM metrics_hourly_trading
GROUP BY bucket, trading_pair;

-- Daily Financial Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_financial_summary
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    SUM(total_revenue) AS total_revenue,
    SUM(trading_fee_revenue) AS trading_fees,
    SUM(withdrawal_fee_revenue) AS withdrawal_fees,
    AVG(profit_margin) AS avg_profit_margin
FROM metrics_daily_financial
GROUP BY bucket;

-- =============================================================================
-- REFRESH POLICIES
-- =============================================================================

SELECT add_continuous_aggregate_policy('hourly_user_summary',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('hourly_trading_summary',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '30 minutes',
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('daily_financial_summary',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE);

-- =============================================================================
-- DATA RETENTION POLICIES
-- =============================================================================

SELECT add_retention_policy('metrics_hourly_users', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('metrics_hourly_trading', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('metrics_hourly_liquidity', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('metrics_hourly_operational', INTERVAL '90 days', if_not_exists => TRUE);
SELECT add_retention_policy('alert_history', INTERVAL '1 year', if_not_exists => TRUE);

-- =============================================================================
-- INITIAL ALERT CONFIGURATIONS
-- =============================================================================

-- Insert default alert configurations
INSERT INTO metric_alerts (metric_name, metric_category, threshold_type, threshold_value, severity, alert_channels) VALUES
('system_uptime_pct', 'operational', 'below', 99.9, 'critical', '["email", "slack", "sms"]'),
('error_rate', 'operational', 'above', 1.0, 'warning', '["email", "slack"]'),
('daily_active_users', 'user', 'percentage_change', -10.0, 'warning', '["email"]'),
('total_volume_24h', 'trading', 'percentage_change', -20.0, 'warning', '["email", "slack"]'),
('fraud_cases_detected', 'security', 'above', 10, 'critical', '["email", "slack", "sms"]'),
('failed_login_attempts', 'security', 'above', 1000, 'warning', '["email", "slack"]'),
('pending_kyc_reviews', 'compliance', 'above', 100, 'warning', '["email"]'),
('avg_api_response_time', 'operational', 'above', 1000, 'warning', '["email", "slack"]');

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE metrics_daily_users IS 'Comprehensive daily user metrics including DAU, MAU, retention, churn, LTV, CAC';
COMMENT ON TABLE metrics_daily_trading IS 'Daily trading metrics by pair including volume, trades, maker/taker ratios';
COMMENT ON TABLE metrics_daily_financial IS 'Financial KPIs including revenue, costs, profit margins, ARPU';
COMMENT ON TABLE metrics_daily_wallet IS 'Wallet activity metrics including deposits, withdrawals, AUM';
COMMENT ON TABLE metrics_hourly_liquidity IS 'Liquidity metrics including order book depth, spreads, slippage';
COMMENT ON TABLE metrics_daily_engagement IS 'User engagement metrics including session duration, feature adoption';
COMMENT ON TABLE metrics_hourly_operational IS 'System performance metrics including uptime, latency, error rates';
COMMENT ON TABLE metrics_daily_security IS 'Security metrics including fraud detection, 2FA adoption, incidents';
COMMENT ON TABLE metrics_daily_marketing IS 'Marketing performance including traffic, conversions, campaign ROI';
COMMENT ON TABLE metrics_daily_compliance IS 'Compliance metrics including KYC, AML, regulatory reporting';
COMMENT ON TABLE metric_alerts IS 'Alert configuration for automated monitoring of metric thresholds';
COMMENT ON TABLE alert_history IS 'Historical record of triggered alerts and their resolution status';
