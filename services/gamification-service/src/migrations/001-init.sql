-- Gamification Service Database Schema

-- User Levels Table
CREATE TABLE IF NOT EXISTS user_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    level INTEGER NOT NULL DEFAULT 1,
    current_xp BIGINT NOT NULL DEFAULT 0,
    total_xp BIGINT NOT NULL DEFAULT 0,
    next_level_xp BIGINT NOT NULL DEFAULT 100,
    lifetime_xp BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX idx_user_levels_level ON user_levels(level DESC, total_xp DESC);

-- XP Transactions Table
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX idx_xp_transactions_user_created ON xp_transactions(user_id, created_at DESC);

-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(255),
    rarity VARCHAR(20) NOT NULL DEFAULT 'common',
    category VARCHAR(20) NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    token_reward DECIMAL(18, 8) NOT NULL DEFAULT 0,
    criteria JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_badges_code ON badges(code);
CREATE INDEX idx_badges_active ON badges(is_active);

-- User Badges Table
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL REFERENCES badges(id),
    earned_at TIMESTAMP NOT NULL,
    progress DECIMAL(5, 2) NOT NULL DEFAULT 100,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_earned_at ON user_badges(earned_at DESC);

-- Missions Table
CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    category VARCHAR(20) NOT NULL,
    target_value INTEGER NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    token_reward DECIMAL(18, 8) NOT NULL DEFAULT 0,
    requirements JSONB,
    icon_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_missions_code ON missions(code);
CREATE INDEX idx_missions_type ON missions(type);
CREATE INDEX idx_missions_active ON missions(is_active);

-- User Missions Table
CREATE TABLE IF NOT EXISTS user_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    mission_id UUID NOT NULL REFERENCES missions(id),
    progress INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    claimed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX idx_user_missions_status ON user_missions(status);
CREATE INDEX idx_user_missions_user_mission ON user_missions(user_id, mission_id, status);

-- Challenges Table
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    rules JSONB NOT NULL,
    rewards JSONB NOT NULL,
    max_participants INTEGER,
    entry_fee DECIMAL(18, 8) NOT NULL DEFAULT 0,
    prize_pool DECIMAL(18, 8) NOT NULL DEFAULT 0,
    banner_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date);

-- Challenge Participants Table
CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id),
    user_id UUID NOT NULL,
    team_id UUID,
    score DECIMAL(18, 8) NOT NULL DEFAULT 0,
    rank INTEGER,
    stats JSONB,
    joined_at TIMESTAMP NOT NULL,
    is_disqualified BOOLEAN NOT NULL DEFAULT FALSE,
    disqualification_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_leaderboard ON challenge_participants(challenge_id, score DESC);

-- Rewards Table
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(18, 8),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    source_type VARCHAR(50) NOT NULL,
    source_id UUID,
    metadata JSONB,
    expires_at TIMESTAMP,
    distributed_at TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rewards_user_id ON rewards(user_id);
CREATE INDEX idx_rewards_status ON rewards(status);
CREATE INDEX idx_rewards_user_status ON rewards(user_id, status);

-- Mini Games Table
CREATE TABLE IF NOT EXISTS mini_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    game_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    data JSONB NOT NULL,
    result JSONB,
    score INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    tokens_earned DECIMAL(18, 8) NOT NULL DEFAULT 0,
    is_win BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mini_games_user_id ON mini_games(user_id);
CREATE INDEX idx_mini_games_type ON mini_games(game_type);
CREATE INDEX idx_mini_games_user_type_created ON mini_games(user_id, game_type, created_at DESC);

-- Login Streaks Table
CREATE TABLE IF NOT EXISTS login_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_login_date DATE,
    total_logins INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_streaks_user_id ON login_streaks(user_id);

-- Fraud Detections Table
CREATE TABLE IF NOT EXISTS fraud_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(30) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB NOT NULL,
    risk_score DECIMAL(5, 2) NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_detections_user_id ON fraud_detections(user_id);
CREATE INDEX idx_fraud_detections_resolved ON fraud_detections(is_resolved);
CREATE INDEX idx_fraud_detections_user_created ON fraud_detections(user_id, created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_levels_updated_at BEFORE UPDATE ON user_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON missions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_missions_updated_at BEFORE UPDATE ON user_missions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_participants_updated_at BEFORE UPDATE ON challenge_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mini_games_updated_at BEFORE UPDATE ON mini_games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_login_streaks_updated_at BEFORE UPDATE ON login_streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
