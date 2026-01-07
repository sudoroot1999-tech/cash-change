-- Create User Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) UNIQUE,
    phone VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    tier VARCHAR(20) NOT NULL DEFAULT 'BASIC',
    kyc_level INT DEFAULT 0,
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

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON user(created_at)
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_limits_user_id ON user_limits(user_id);
