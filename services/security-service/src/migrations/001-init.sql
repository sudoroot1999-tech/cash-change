-- Anti-phishing codes
CREATE TABLE IF NOT EXISTS anti_phishing_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  phishing_code VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Trusted devices
CREATE TABLE IF NOT EXISTS trusted_devices (
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
CREATE TABLE IF NOT EXISTS withdrawal_whitelist (
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
CREATE TABLE IF NOT EXISTS api_keys (
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
CREATE TABLE IF NOT EXISTS login_history (
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
CREATE TABLE IF NOT EXISTS security_events (
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
CREATE TABLE IF NOT EXISTS risk_scores (
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
CREATE TABLE IF NOT EXISTS cold_wallets (
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
CREATE TABLE IF NOT EXISTS proof_of_reserves (
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
CREATE TABLE IF NOT EXISTS insurance_fund_transactions (
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
CREATE TABLE IF NOT EXISTS insurance_fund_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency VARCHAR NOT NULL UNIQUE,
  balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
  last_audit_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Bug bounty
CREATE TABLE IF NOT EXISTS bug_bounty_submissions (
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
CREATE TABLE IF NOT EXISTS incidents (
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
CREATE TABLE IF NOT EXISTS user_sessions (
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

-- Two factors
CREATE TABLE IF NOT EXISTS user_two_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  secret VARCHAR NOT NULL,
  backupCodes JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);


-- Create Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_anti_phishing_user ON anti_phishing_codes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_devices_user_fingerprint ON trusted_devices(fingerprint);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_is_trusted ON trusted_devices(is_trusted);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_last_used_at ON trusted_devices(last_used_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_whitelist_address ON withdrawal_whitelist(address);
CREATE INDEX IF NOT EXISTS idx_withdrawal_whitelist_currency ON withdrawal_whitelist(currency);
CREATE INDEX IF NOT EXISTS idx_withdrawal_whitelist_user_id ON withdrawal_whitelist(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_login_history_status ON login_history(status);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_scores_user ON risk_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_cold_wallets_currency ON cold_wallets(currency);
CREATE INDEX IF NOT EXISTS idx_cold_wallets_status ON cold_wallets(status);
CREATE INDEX IF NOT EXISTS idx_proof_reserves_currency ON proof_of_reserves(currency);
CREATE INDEX IF NOT EXISTS idx_proof_reserves_created_at ON proof_of_reserves(created_at);
CREATE INDEX IF NOT EXISTS idx_insurance_fund_tx_currency ON insurance_fund_transactions(currency);
CREATE INDEX IF NOT EXISTS idx_insurance_fund_tx_created_at ON insurance_fund_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_bug_bounty_status ON bug_bounty_submissions(status);
CREATE INDEX IF NOT EXISTS idx_bug_bounty_reporter_id ON bug_bounty_submissions(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_refresh_token ON user_sessions(refresh_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_two_factors_user ON user_two_factors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_two_factors_enabled ON user_two_factors(is_enabled);
