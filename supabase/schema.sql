-- Board Game Leaderboard Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table (board games, not individual matches)
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE,
    image_url TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    complexity DECIMAL(3,2) NOT NULL DEFAULT 2.0,
    is_coop BOOLEAN NOT NULL DEFAULT FALSE,
    is_team BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table (individual game sessions)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_number SERIAL, -- Auto-incrementing match ID for easy reference
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    date_played DATE NOT NULL,
    notes TEXT, -- Optional notes about the match
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match results table (player placements in each match)
CREATE TABLE match_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    placement INTEGER NOT NULL CHECK (placement >= 1 AND placement <= 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Each player can only have one result per match
    UNIQUE(match_id, player_id)
);

-- Badges table (achievements)
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL,
    badge_year INTEGER, -- For annual badges
    game_id UUID REFERENCES games(id) ON DELETE CASCADE, -- For game-specific badges
    description TEXT NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate badges
    UNIQUE(player_id, badge_type, badge_year, game_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_matches_game_id ON matches(game_id);
CREATE INDEX idx_matches_date_played ON matches(date_played DESC);
CREATE INDEX idx_match_results_match_id ON match_results(match_id);
CREATE INDEX idx_match_results_player_id ON match_results(player_id);
CREATE INDEX idx_badges_player_id ON badges(player_id);

-- ============================================
-- VIEWS
-- ============================================

-- View for match details with game and player info
CREATE OR REPLACE VIEW match_details AS
SELECT 
    m.id AS match_id,
    m.match_number,
    m.date_played,
    m.notes,
    g.id AS game_id,
    g.name AS game_name,
    g.image_url AS game_image,
    g.duration_minutes,
    g.complexity,
    g.is_coop,
    g.is_team,
    mr.player_id,
    p.name AS player_name,
    p.avatar_url AS player_avatar,
    mr.placement,
    (SELECT COUNT(*) FROM match_results WHERE match_id = m.id) AS player_count
FROM matches m
JOIN games g ON m.game_id = g.id
JOIN match_results mr ON m.id = mr.match_id
JOIN players p ON mr.player_id = p.id;

-- View for player statistics
CREATE OR REPLACE VIEW player_stats AS
SELECT 
    p.id AS player_id,
    p.name AS player_name,
    p.avatar_url,
    COUNT(DISTINCT mr.match_id) AS total_games,
    COUNT(CASE WHEN mr.placement = 1 THEN 1 END) AS wins,
    ROUND(AVG(mr.placement)::numeric, 2) AS avg_placement,
    MIN(m.date_played) AS first_game,
    MAX(m.date_played) AS last_game
FROM players p
LEFT JOIN match_results mr ON p.id = mr.player_id
LEFT JOIN matches m ON mr.match_id = m.id
GROUP BY p.id, p.name, p.avatar_url;

-- View for game statistics
CREATE OR REPLACE VIEW game_stats AS
SELECT 
    g.id AS game_id,
    g.name AS game_name,
    g.image_url,
    g.duration_minutes,
    g.complexity,
    g.is_coop,
    g.is_team,
    COUNT(DISTINCT m.id) AS times_played,
    MIN(m.date_played) AS first_played,
    MAX(m.date_played) AS last_played
FROM games g
LEFT JOIN matches m ON g.id = m.game_id
GROUP BY g.id, g.name, g.image_url, g.duration_minutes, g.complexity, g.is_coop, g.is_team;

-- ============================================
-- ROW LEVEL SECURITY (Optional - for public access)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public read access on games" ON games FOR SELECT USING (true);
CREATE POLICY "Allow public read access on matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public read access on match_results" ON match_results FOR SELECT USING (true);
CREATE POLICY "Allow public read access on badges" ON badges FOR SELECT USING (true);

-- Allow public insert/update (since no auth required)
CREATE POLICY "Allow public insert on players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on match_results" ON match_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on badges" ON badges FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on players" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow public update on games" ON games FOR UPDATE USING (true);
CREATE POLICY "Allow public update on matches" ON matches FOR UPDATE USING (true);
CREATE POLICY "Allow public update on match_results" ON match_results FOR UPDATE USING (true);

-- ============================================
-- INITIAL DATA - Your 5 Players
-- ============================================

INSERT INTO players (name) VALUES 
    ('Aaron'),
    ('Bren'),
    ('Darryn'),
    ('Laura'),
    ('Tessa');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
