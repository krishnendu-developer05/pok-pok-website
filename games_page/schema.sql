-- ==========================================
-- POK-POK WEBSITE - DATABASE SCHEMA (POSTGRESQL)
-- Component: Games Page & Users Integrated Relational Schema
-- ==========================================

-- Enable pgcrypto for gen_random_uuid() support (UUID generation)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. CORE COMPONENT: USER MANAGEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    avatar_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user searches
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- ==========================================
-- 2. COMPONENT: GAMEBOX WIDGET (GAMES & LEADERBOARDS)
-- ==========================================

CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    play_link TEXT DEFAULT NULL,
    image_url TEXT DEFAULT './assets/cyberpunk.png',
    mode VARCHAR(20) DEFAULT 'view' CHECK (mode IN ('view', 'edit', 'published')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable if player is a guest
    player_name VARCHAR(50) NOT NULL,                     -- Text display (allows registered or guest names)
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure a unique ranking record per player name per game (avoids duplicate scores)
    UNIQUE (game_id, player_name)
);

-- Index to fetch leaderboards sorted by high scores rapidly
CREATE INDEX IF NOT EXISTS idx_leaderboards_game_scores ON leaderboards (game_id, points DESC);

-- ==========================================
-- 3. COMPONENT: VOTING WIDGET (POLLS & DYNAMIC VOTING)
-- ==========================================

CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL DEFAULT 'Enter Title for Vote',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_text VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction table to track individual user votes (WhatsApp Poll format: multi-select support)
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint guarantees a user can vote for a specific option only once (prevents double voting)
    UNIQUE (user_id, option_id)
);

-- Index for counting votes per option quickly
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes (option_id);

-- ==========================================
-- 4. UTILITY HIGH-PERFORMANCE VIEWS & ANALYTICS
-- ==========================================

-- View to compute option vote counts and dynamic percentages in real-time
CREATE OR REPLACE VIEW view_poll_results AS
SELECT 
    po.id AS option_id,
    po.poll_id,
    po.option_text,
    COUNT(pv.id) AS votes_count,
    COALESCE(
        ROUND(
            (COUNT(pv.id)::numeric / NULLIF(SUM(COUNT(pv.id)) OVER (PARTITION BY po.poll_id), 0)) * 100
        ), 
        0
    ) AS vote_percentage
FROM poll_options po
LEFT JOIN poll_votes pv ON po.id = pv.option_id
GROUP BY po.id, po.option_text, po.poll_id;

-- ==========================================
-- 5. TRIGGER FOR UPDATED_AT AUTOSYNC
-- ==========================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE OR REPLACE TRIGGER update_games_modtime BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE OR REPLACE TRIGGER update_polls_modtime BEFORE UPDATE ON polls FOR EACH ROW EXECUTE FUNCTION update_modified_column();
