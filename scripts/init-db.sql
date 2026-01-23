-- Initialize Exchange Database
-- This script runs on first PostgreSQL container start

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create schemas for better organization
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS wallets;
CREATE SCHEMA IF NOT EXISTS trading;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS compliance;
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS admin;

-- Grant permissions
GRANT ALL ON SCHEMA users TO exchange_user;
GRANT ALL ON SCHEMA wallets TO exchange_user;
GRANT ALL ON SCHEMA trading TO exchange_user;
GRANT ALL ON SCHEMA notifications TO exchange_user;
GRANT ALL ON SCHEMA compliance TO exchange_user;
GRANT ALL ON SCHEMA security TO exchange_user;
GRANT ALL ON SCHEMA admin TO exchange_user;

-- Insert default super admin (password: Admin@123456)
-- Password hash generated with bcrypt rounds=10
INSERT INTO admin.admins (email, password_hash, full_name, role, is_active) VALUES
    ('admin@exchange.com', '$2b$10$rW8eXhKqPXfKvQzQ5qQBbOXJ7Z7fHGqZvXKqZvXKqZvXKqZvXKqZve', 'Super Admin', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- Insert default settings
INSERT INTO admin.settings (key, value, description, type) VALUES
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode', 'boolean'),
    ('trading_enabled', 'true', 'Enable/disable trading', 'boolean'),
    ('withdrawal_enabled', 'true', 'Enable/disable withdrawals', 'boolean'),
    ('deposit_enabled', 'true', 'Enable/disable deposits', 'boolean'),
    ('max_withdrawal_per_day', '100000', 'Maximum withdrawal amount per day in USD', 'number'),
    ('min_withdrawal_amount', '10', 'Minimum withdrawal amount in USD', 'number')
ON CONFLICT (key) DO NOTHING;