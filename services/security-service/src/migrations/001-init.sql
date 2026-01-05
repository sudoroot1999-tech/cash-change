-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Anti-phishing codes
CREATE TABLE anti_phishing_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  phishing_code VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Trusted devices
CREATE TABLE trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  device_name VARCHAR,
  fingerprint VARCHAR NOT NULL,
  metadata JSONB,
  ip_address VARCHAR,
  location VARCHAR,
  country_code VARCHAR,
  city VARCHAR,
  is_trusted BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Withdrawal whitelist
CREATE TABLE withdrawal_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  address VARCHAR NOT NULL,
  currency VARCHAR NOT NULL,
  label VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'PENDING',
  activated_at TIMESTAMP,
  cooling_period_hours INTEGER DEFAULT 24,
  created_by_ip VARCHAR,
  confirmed_via_email BOOLEAN DEFAULT FALSE,
  confirmed_via_sms BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- API keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  key_name VARCHAR NOT NULL,
  api_key VARCHAR NOT NULL UNIQUE,
  secret_hash VARCHAR NOT NULL,
  permissions TEXT NOT NULL, -- simple-array stored as text usually
  ip_whitelist TEXT, -- simple-array
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  last_rotated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Login history
CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  status VARCHAR NOT NULL,
  ip_address VARCHAR NOT NULL,
  location VARCHAR,
  country_code VARCHAR,
  city VARCHAR,
  latitude VARCHAR,
  longitude VARCHAR,
  device_fingerprint VARCHAR,
  user_agent TEXT,
  metadata JSONB,
  failure_reason VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);

-- Security events
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  event_type VARCHAR NOT NULL,
  risk_level VARCHAR NOT NULL DEFAULT 'LOW',
  ip_address VARCHAR,
  device_fingerprint VARCHAR,
  details JSONB NOT NULL,
  action_taken VARCHAR,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

-- Risk scores
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  score NUMERIC(5, 2) DEFAULT 0,
  risk_level VARCHAR NOT NULL DEFAULT 'LOW',
  factors JSONB,
  last_calculated_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Cold wallets
CREATE TABLE cold_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency VARCHAR NOT NULL,
  address VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'ACTIVE',
  multi_sig_config JSONB,
  balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
  location VARCHAR,
  last_audit_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Proof of reserves
CREATE TABLE proof_of_reserves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency VARCHAR NOT NULL,
  totalReserves NUMERIC(36, 18) NOT NULL,
  totalLiabilities NUMERIC(36, 18) NOT NULL,
  reserveRatio NUMERIC(10, 2) NOT NULL,
  merkle_root VARCHAR NOT NULL,
  audit_file_url VARCHAR,
  auditor_name VARCHAR,
  block_height VARCHAR,
  walletAddresses JSONB,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Insurance fund transactions
CREATE TABLE insurance_fund_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  amount NUMERIC(36, 18) NOT NULL,
  balanceAfter NUMERIC(36, 18) NOT NULL,
  description TEXT,
  related_incident_id VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Insurance fund balances
CREATE TABLE insurance_fund_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency VARCHAR NOT NULL UNIQUE,
  balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
  last_audit_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Bug bounty
CREATE TABLE bug_bounty_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL,
  reporter_email VARCHAR NOT NULL,
  reporter_name VARCHAR,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'SUBMITTED',
  rewardAmount NUMERIC(10, 2),
  reward_currency VARCHAR,
  poc_url VARCHAR,
  attachments JSONB,
  internalNotes TEXT,
  resolved_at TIMESTAMP,
  rewarded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Incidents
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR NOT NULL,
  severity VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'DETECTED',
  affected_users TEXT, -- simple-array
  affected_systems TEXT, -- simple-array
  detected_by VARCHAR,
  assigned_to VARCHAR,
  evidence JSONB,
  actions JSONB,
  root_cause TEXT,
  resolution_notes TEXT,
  post_mortem_url VARCHAR,
  detected_at TIMESTAMP NOT NULL,
  contained_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- User sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  session_token VARCHAR NOT NULL UNIQUE,
  refresh_token VARCHAR UNIQUE,
  device_fingerprint VARCHAR,
  ip_address VARCHAR NOT NULL,
  user_agent TEXT,
  metadata JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create Indexes
CREATE UNIQUE INDEX idx_anti_phishing_user ON anti_phishing_codes(user_id);
CREATE UNIQUE INDEX idx_trusted_devices_user_fingerprint ON trusted_devices(user_id, fingerprint);
CREATE INDEX idx_trusted_devices_user ON trusted_devices(user_id);
CREATE INDEX idx_withdrawal_whitelist_user_addr_curr ON withdrawal_whitelist(user_id, address, currency);
CREATE INDEX idx_withdrawal_whitelist_user ON withdrawal_whitelist(user_id);
CREATE INDEX idx_api_keys_user_active ON api_keys(user_id, is_active);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE UNIQUE INDEX idx_api_keys_key ON api_keys(api_key);
CREATE INDEX idx_login_history_user_created ON login_history(user_id, created_at);
CREATE INDEX idx_login_history_user ON login_history(user_id);
CREATE INDEX idx_login_history_created ON login_history(created_at);
CREATE INDEX idx_security_events_user_type_created ON security_events(user_id, event_type, created_at);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_created ON security_events(created_at);
CREATE UNIQUE INDEX idx_risk_scores_user ON risk_scores(user_id);
CREATE INDEX idx_cold_wallets_currency_status ON cold_wallets(currency, status);
CREATE INDEX idx_proof_reserves_currency_created ON proof_of_reserves(currency, created_at);
CREATE INDEX idx_insurance_fund_tx_currency_created ON insurance_fund_transactions(currency, created_at);
CREATE INDEX idx_bug_bounty_reporter_status ON bug_bounty_submissions(reporter_id, status);
CREATE INDEX idx_bug_bounty_reporter ON bug_bounty_submissions(reporter_id);
CREATE INDEX idx_incidents_status_severity_created ON incidents(status, severity, created_at);
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
