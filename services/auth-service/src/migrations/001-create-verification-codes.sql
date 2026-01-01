-- Migration: Create verification_codes table
-- This table stores email verification codes for 2FA and registration

CREATE TYPE verification_code_type AS ENUM (
    'email_2fa',
    'login_verification', 
    'registration_verification'
);

CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type verification_code_type NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX idx_verification_codes_type ON verification_codes(type);

-- Composite index for lookups
CREATE INDEX idx_verification_codes_lookup ON verification_codes(email, type, used_at, expires_at);

-- Add comments
COMMENT ON TABLE verification_codes IS 'Stores email verification codes for 2FA and registration';
COMMENT ON COLUMN verification_codes.code IS '6-digit numeric verification code';
COMMENT ON COLUMN verification_codes.type IS 'Type of verification: email_2fa, login_verification, or registration_verification';
COMMENT ON COLUMN verification_codes.expires_at IS 'When the code expires (typically 10 minutes)';
COMMENT ON COLUMN verification_codes.used_at IS 'When the code was used (NULL if unused)';
COMMENT ON COLUMN verification_codes.attempts IS 'Number of failed verification attempts';
COMMENT ON COLUMN verification_codes.max_attempts IS 'Maximum allowed attempts before code is locked';