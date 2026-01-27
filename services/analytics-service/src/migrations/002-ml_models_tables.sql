-- ML Models and Advanced Analytics Tables

-- User Segments (from K-means clustering)
CREATE TABLE IF NOT EXISTS user_segments (
    segment_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    segment_number INTEGER NOT NULL,
    segment_name VARCHAR(100), -- e.g., "VIP Active Traders", "Dormant High Value"
    rfm_score INTEGER,
    recency_score INTEGER,
    frequency_score INTEGER,
    monetary_score INTEGER,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    features JSONB
);

CREATE INDEX IF NOT EXISTS idx_segments_user ON user_segments (user_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_segments_name ON user_segments (segment_name, assigned_at DESC);

-- User Engagement Metrics
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
    metric_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    measured_date DATE NOT NULL,
    event_count INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    active_days INTEGER DEFAULT 0,
    primary_device VARCHAR(50),
    avg_session_duration DECIMAL(10, 2) DEFAULT 0,
    engagement_score DECIMAL(5, 2) DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, measured_date)
);

CREATE INDEX IF NOT EXISTS idx_engagement_user_date ON user_engagement_metrics (user_id, measured_date DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_score ON user_engagement_metrics (engagement_score DESC);

-- At Risk Users (from churn prediction)
CREATE TABLE IF NOT EXISTS at_risk_users (
    user_id VARCHAR(100) PRIMARY KEY,
    churn_risk_score INTEGER NOT NULL,
    engagement_score DECIMAL(5, 2),
    identified_at TIMESTAMPTZ NOT NULL,
    action_taken BOOLEAN DEFAULT FALSE,
    action_type VARCHAR(50),
    action_date TIMESTAMPTZ,
    outcome VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_at_risk_score ON at_risk_users (churn_risk_score DESC, identified_at DESC);
CREATE INDEX IF NOT EXISTS idx_at_risk_action ON at_risk_users (action_taken, identified_at DESC);

-- ML Model Predictions Log
CREATE TABLE IF NOT EXISTS ml_predictions (
    prediction_id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    entity_id VARCHAR(100) NOT NULL, -- user_id, transaction_id, etc.
    entity_type VARCHAR(50) NOT NULL, -- user, transaction, etc.
    prediction_type VARCHAR(50) NOT NULL, -- churn, fraud, price, etc.
    prediction_value JSONB NOT NULL,
    confidence_score DECIMAL(5, 4),
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    actual_outcome VARCHAR(50),
    outcome_recorded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_predictions_model ON ml_predictions (model_name, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_entity ON ml_predictions (entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON ml_predictions (prediction_type, predicted_at DESC);

-- ML Model Performance Metrics
CREATE TABLE IF NOT EXISTS ml_model_performance (
    metric_id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    evaluation_date DATE NOT NULL,
    metric_name VARCHAR(50) NOT NULL, -- auc, precision, recall, f1, mape, etc.
    metric_value DECIMAL(10, 6) NOT NULL,
    dataset_type VARCHAR(20) NOT NULL, -- train, test, validation, production
    sample_size INTEGER,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_model_perf_name_date ON ml_model_performance (model_name, evaluation_date DESC);
CREATE INDEX IF NOT EXISTS idx_model_perf_metric ON ml_model_performance (metric_name, evaluation_date DESC);

-- Price Predictions
CREATE TABLE IF NOT EXISTS price_predictions (
    prediction_id SERIAL PRIMARY KEY,
    trading_pair VARCHAR(20) NOT NULL,
    predicted_at TIMESTAMPTZ NOT NULL,
    prediction_horizon INTEGER NOT NULL, -- hours ahead
    current_price DECIMAL(20, 8) NOT NULL,
    predicted_price DECIMAL(20, 8) NOT NULL,
    lower_bound DECIMAL(20, 8),
    upper_bound DECIMAL(20, 8),
    confidence DECIMAL(5, 4),
    actual_price DECIMAL(20, 8),
    price_recorded_at TIMESTAMPTZ,
    error_pct DECIMAL(10, 4)
);

CREATE INDEX IF NOT EXISTS idx_price_pred_pair_time ON price_predictions (trading_pair, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_pred_horizon ON price_predictions (prediction_horizon, predicted_at DESC);

-- Fraud Scores (from fraud detection model)
CREATE TABLE IF NOT EXISTS fraud_scores (
    score_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    transaction_id VARCHAR(100),
    fraud_score DECIMAL(5, 4) NOT NULL,
    risk_level VARCHAR(20) NOT NULL, -- Low, Medium, High
    anomaly_score DECIMAL(5, 4),
    pattern_score DECIMAL(5, 4),
    risk_factors JSONB,
    scored_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed BOOLEAN DEFAULT FALSE,
    review_outcome VARCHAR(50),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fraud_scores_user ON fraud_scores (user_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_scores_level ON fraud_scores (risk_level, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_scores_reviewed ON fraud_scores (reviewed, risk_level);

-- Trading Metrics Hourly (from Airflow ETL)
CREATE TABLE IF NOT EXISTS trading_metrics_hourly (
    metric_id SERIAL PRIMARY KEY,
    trading_pair VARCHAR(20) NOT NULL,
    hour INTEGER NOT NULL,
    order_count INTEGER DEFAULT 0,
    total_amount DECIMAL(20, 8) DEFAULT 0,
    total_executed DECIMAL(20, 8) DEFAULT 0,
    total_fees DECIMAL(20, 8) DEFAULT 0,
    avg_slippage DECIMAL(10, 6) DEFAULT 0,
    avg_fill_rate DECIMAL(5, 4) DEFAULT 0,
    date DATE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    UNIQUE(trading_pair, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_trading_metrics_pair_time ON trading_metrics_hourly (trading_pair, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trading_metrics_date ON trading_metrics_hourly (date DESC);

-- Maker/Taker Ratios
CREATE TABLE IF NOT EXISTS maker_taker_ratios (
    ratio_id SERIAL PRIMARY KEY,
    trading_pair VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    maker_ratio DECIMAL(5, 4) NOT NULL,
    taker_ratio DECIMAL(5, 4) NOT NULL,
    UNIQUE(trading_pair, date)
);

CREATE INDEX IF NOT EXISTS idx_maker_taker_pair_date ON maker_taker_ratios (trading_pair, date DESC);

-- Trading Pair Metrics (VWAP, etc.)
CREATE TABLE IF NOT EXISTS trading_pair_metrics (
    metric_id SERIAL PRIMARY KEY,
    trading_pair VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    vwap DECIMAL(20, 8), -- Volume Weighted Average Price
    total_volume DECIMAL(20, 8) DEFAULT 0,
    UNIQUE(trading_pair, date)
);

CREATE INDEX IF NOT EXISTS idx_pair_metrics_pair_date ON trading_pair_metrics (trading_pair, date DESC);

-- Price Volatility
CREATE TABLE IF NOT EXISTS price_volatility (
    volatility_id SERIAL PRIMARY KEY,
    trading_pair VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    volatility DECIMAL(10, 6),
    price_range DECIMAL(20, 8),
    UNIQUE(trading_pair, date)
);

CREATE INDEX IF NOT EXISTS idx_volatility_pair_date ON price_volatility (trading_pair, date DESC);

-- Order Book Snapshots
CREATE TABLE IF NOT EXISTS order_book_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    trading_pair VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    bid_volume DECIMAL(20, 8) DEFAULT 0,
    ask_volume DECIMAL(20, 8) DEFAULT 0,
    spread_bps INTEGER, -- spread in basis points
    depth_usd DECIMAL(20, 2), -- total depth in USD
    snapshot_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_orderbook_pair_time ON order_book_snapshots (trading_pair, timestamp DESC);

-- A/B Test Results
CREATE TABLE IF NOT EXISTS ab_test_results (
    test_id VARCHAR(100) PRIMARY KEY,
    test_name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    variant_a_name VARCHAR(100) DEFAULT 'Control',
    variant_b_name VARCHAR(100) DEFAULT 'Treatment',
    variant_a_size INTEGER DEFAULT 0,
    variant_b_size INTEGER DEFAULT 0,
    variant_a_conversions INTEGER DEFAULT 0,
    variant_b_conversions INTEGER DEFAULT 0,
    variant_a_conversion_rate DECIMAL(5, 4),
    variant_b_conversion_rate DECIMAL(5, 4),
    statistical_significance DECIMAL(5, 4),
    winner VARCHAR(100),
    test_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_test_dates ON ab_test_results (start_date, end_date);

-- Feature Adoption Tracking
CREATE TABLE IF NOT EXISTS feature_adoption (
    adoption_id SERIAL PRIMARY KEY,
    feature_name VARCHAR(100) NOT NULL,
    measured_date DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    adopted_users INTEGER DEFAULT 0,
    adoption_rate DECIMAL(5, 4),
    avg_time_to_adoption INTERVAL,
    UNIQUE(feature_name, measured_date)
);

CREATE INDEX IF NOT EXISTS idx_feature_adoption_name_date ON feature_adoption (feature_name, measured_date DESC);

-- Custom Reports Cache
CREATE TABLE IF NOT EXISTS report_cache (
    report_id VARCHAR(100) PRIMARY KEY,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    parameters JSONB,
    result_data JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    generated_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_report_cache_expires ON report_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_report_cache_type ON report_cache (report_type, generated_at DESC);

-- Data Quality Checks
CREATE TABLE IF NOT EXISTS data_quality_checks (
    check_id SERIAL PRIMARY KEY,
    check_name VARCHAR(200) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    check_type VARCHAR(50) NOT NULL, -- null_check, range_check, consistency_check
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    passed BOOLEAN NOT NULL,
    records_checked INTEGER,
    records_failed INTEGER,
    failure_details JSONB
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_table ON data_quality_checks (table_name, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_checks_passed ON data_quality_checks (passed, executed_at DESC);

-- Comments
COMMENT ON TABLE user_segments IS 'User segmentation results from K-means clustering and RFM analysis';
COMMENT ON TABLE ml_predictions IS 'Log of all ML model predictions for tracking and analysis';
COMMENT ON TABLE ml_model_performance IS 'Performance metrics for ML models over time';
COMMENT ON TABLE price_predictions IS 'Price predictions from LSTM model with actual outcomes';
COMMENT ON TABLE fraud_scores IS 'Fraud detection scores for users and transactions';
COMMENT ON TABLE data_quality_checks IS 'Log of data quality validation checks';
