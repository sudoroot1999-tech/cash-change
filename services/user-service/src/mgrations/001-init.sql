-- Create User Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) UNIQUE,
    phone VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    tier VARCHAR(20) NOT NULL DEFAULT 'BASIC',
    kyc_level INTEGER DEFAULT 0,
    referral_code VARCHAR(20) NOT NULL UNIQUE,
    referred_by UUID,
    two_factor_enabled BOOLEAN DEFAULT TRUE,
    two_factor_secret VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    anti_phishing_code VARCHAR(50),
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    postal_code VARCHAR(20),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_user_profile FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Notification preferences
    notification_email BOOLEAN DEFAULT TRUE,
    notification_sms BOOLEAN DEFAULT FALSE,
    notification_push BOOLEAN DEFAULT TRUE,
    notification_trading_alerts BOOLEAN DEFAULT TRUE,
    notification_price_alerts BOOLEAN DEFAULT TRUE,
    notification_newsletters BOOLEAN DEFAULT FALSE,
    
    -- Trading preferences
    trading_confirmations BOOLEAN DEFAULT TRUE,
    trading_auto_compound BOOLEAN DEFAULT FALSE,
    trading_default_order_type VARCHAR(20) DEFAULT 'LIMIT',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_preferences FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create User Limits Table
CREATE TABLE IF NOT EXISTS user_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    kyc_level VARCHAR(20) DEFAULT 'NONE', -- Stored as string in entity enum but likely varchar in DB
    
    -- Withdrawal limits
    daily_withdrawal_limit DECIMAL(20, 8) DEFAULT 0,
    monthly_withdrawal_limit DECIMAL(20, 8) DEFAULT 0,
    current_daily_withdrawal DECIMAL(20, 8) DEFAULT 0,
    current_monthly_withdrawal DECIMAL(20, 8) DEFAULT 0,
    
    -- Deposit limits
    daily_deposit_limit DECIMAL(20, 8) DEFAULT 0,
    monthly_deposit_limit DECIMAL(20, 8) DEFAULT 0,
    current_daily_deposit DECIMAL(20, 8) DEFAULT 0,
    current_monthly_deposit DECIMAL(20, 8) DEFAULT 0,
    
    -- Trading limits
    daily_trade_limit DECIMAL(20, 8) DEFAULT 0,
    monthly_trade_limit DECIMAL(20, 8) DEFAULT 0,
    current_daily_trade DECIMAL(20, 8) DEFAULT 0,
    current_monthly_trade DECIMAL(20, 8) DEFAULT 0,
    
    -- Reset tracking
    last_reset_daily TIMESTAMP DEFAULT NOW(),
    last_reset_monthly TIMESTAMP DEFAULT NOW(),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_limits FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Referral Codes Table
CREATE TABLE IF NOT EXISTS referral_codes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    code character varying NOT NULL,
    user_id uuid NOT NULL,
    type character varying NOT NULL DEFAULT "standard",
    commission_rate DECIMAL DEFAULT 20,
    usage_count INTEGER DEFAULT 0,
    max_usage_limit INTEGER,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_referral_codes_code" UNIQUE ("code"),
    CONSTRAINT "PK_referral_codes" PRIMARY KEY ("id")
);

-- Create Referral Relationships Table
CREATE TABLE IF NOT EXISTS referral_relationships (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    referrer_id uuid NOT NULL,
    referee_id uuid NOT NULL,
    referral_code_id character varying NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1,
    status character varying NOT NULL DEFAULT 'pending',
    total_commission_earned DECIMAL DEFAULT 0,
    total_trading_volume DECIMAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    has_completed_first_trade BOOLEAN DEFAULT FALSE,
    first_trade_at TIMESTAMP,
    signup_bonus_paid BOOLEAN DEFAULT FALSE,
    first_trade_bonus_paid BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_referral_relationships" PRIMARY KEY ("id"),
    CONSTRAINT "FK_referral_code_id" 
    FOREIGN KEY ("referral_code_id") 
    REFERENCES "referral_codes"("id") 
    ON DELETE CASCADE
);

-- Create Referral Commissions Table
CREATE TABLE IF NOT EXISTS referral_commissions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    referrer_id uuid NOT NULL,
    referree_id uuid NOT NULL,
    relationship_id uuid NOT NULL,
    trade_id uuid,
    type character varying NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1,
    amount numeric NOT NULL,
    trading_fee numeric,
    commission_rate numeric ,
    status character varying NOT NULL DEFAULT 'pending',
    payout_id uuid,
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_referral_commissions" PRIMARY KEY ("id"),
    CONSTRAINT "FK_relationship_id" 
    FOREIGN KEY ("relationship_id") 
    REFERENCES "referral_relationships"("id") 
    ON DELETE CASCADE
);

-- Create Affiliate Campaigns Table
CREATE TABLE IF NOT EXISTS affiliate_campaigns (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    affiliate_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL,
    description TEXT,
    status character varying NOT NULL DEFAULT 'draft',
    commission_rate numeric NOT NULL,
    custom_commission_rates JSONB,
    landing_page_url character,
    tracking_pixel TEXT,
    branded_materials JSONB,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    clicks INTEGER NOT NULL DEFAULT 0,
    signups INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL NOT NULL DEFAULT 0,
    total_commission DECIMAL NOT NULL DEFAULT 0,
    conversion_rate DECIMAL NOT NULL DEFAULT 0,
    target_audience JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_affiliate_campaigns" PRIMARY KEY ("id")
);

-- Create Payout History Table
CREATE TABLE IF NOT EXISTS payout_history (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    amount numeric NOT NULL,
    currency character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'pending',
    payment_method character varying NOT NULL,
    transaction_id character varying,
    commission_count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP NOT NULL DEFAULT now(),
    period_end TIMESTAMP NOT NULL DEFAULT now(),
    fee DECIMAL,
    net_amount DECIMAL,
    payment_details JSONB,
    failure_reason TEXT,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    tax_information JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_payout_history" PRIMARY KEY ("id")
);

-- Create Bonus Campaigns table
CREATE TABLE IF NOT EXISTS bonus_campaigns (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL,
    description TEXT,
    type character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'active',
    bonus_amount DECIMAL,
    bonus_type VARCHAR,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    max_redemptions INTEGER,
    current_redemptions INTEGER NOT NULL DEFAULT 0,
    min_trading_volume DECIMAL,
    max_bonus_per_user DECIMAL,
    eligibility_criteria JSONB,
    conditions JSONB,
    total_distributed DECIMAL NOT NULL DEFAULT 0,
    budget DECIMAL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_bonus_campaigns" PRIMARY KEY ("id")
);

-- Create Fraud Detection Table
CREATE TABLE IF NOT EXISTS fraud_detection (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid,
    referral_relationship_id uuid,
    fraud_type VARCHAR,
    status character varying NOT NULL DEFAULT 'flagged',
    suspicious_activity character varying NOT NULL,
    risk_score DECIMAL NOT NULL,
    reason TEXT,
    evidence JSONB,
    action character varying NOT NULL DEFAULT 'pending',
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by uuid,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_fraud_detection" PRIMARY KEY ("id")
);

-- Create Referral Analytics table
CREATE TABLE IF NOT EXISTS referral_analytics (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    date DATE,
    new_referrals INTEGER DEFAULT 0,
    total_referrals INTEGER NOT NULL DEFAULT 0,
    active_referrals INTEGER NOT NULL DEFAULT 0,
    daily_commissions numeric NOT NULL DEFAULT 0,
    total_commissions numeric NOT NULL DEFAULT 0,
    trading_volume numeric NOT NULL DEFAULT 0,
    total_trades INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL NOT NULL DEFAULT 0,
    tier_breakdown JSONB,
    metadata JSONB,
    metrics JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_referral_analytics" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON user(created_at)
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_limits_user_id ON user_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes (code);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer_id ON referral_relationships (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referee_id ON referral_relationships (referee_id);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_status ON referral_relationships (status);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referral_code_id ON referral_relationships (referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer_id ON referral_commissions (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referee_id ON referral_commissions (referee_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions (status);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_relationship_id ON referral_commissions (relationship_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_trade_id ON referral_commissions (trade_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_payout_id ON referral_commissions (payout_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_affiliate_id ON affiliate_campaigns (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_campaigns_status ON affiliate_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_payout_history_user_id ON payout_history (user_id);
CREATE INDEX IF NOT EXISTS idx_payout_history_status ON payout_history (status);
CREATE INDEX IF NOT EXISTS idx_bonus_campaigns_status ON bonus_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_user_id ON fraud_detection (user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_referral_relationship_id ON fraud_detection (referral_relationship_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_status ON fraud_detection (status);
CREATE INDEX IF NOT EXISTS idx_referral_analytics_user_id ON referral_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_referral_analytics_date ON referral_analytics (date);
