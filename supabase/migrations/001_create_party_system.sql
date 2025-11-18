-- Migration: Create Party System Tables
-- Run this in Supabase SQL Editor
-- Make sure you're connected to the correct project

-- ============================================================================
-- 1. ENABLE EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. CREATE TABLES
-- ============================================================================

-- Parties table
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'collecting_preferences', 'swiping', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Party settings
  max_members INTEGER DEFAULT 10,
  min_members INTEGER DEFAULT 1,
  
  -- Aggregated preferences (stored as JSONB for flexibility)
  aggregated_preferences JSONB,
  
  -- Generated movies (stored as JSONB array)
  movies JSONB,
  
  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb
);

-- Party members table
CREATE TABLE IF NOT EXISTS party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('host', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed')),
  
  -- User's individual preferences for this party
  preferences JSONB,
  spotify_urls TEXT[],
  
  -- Progress tracking
  has_submitted_preferences BOOLEAN DEFAULT FALSE,
  has_completed_swiping BOOLEAN DEFAULT FALSE,
  swipes_completed INTEGER DEFAULT 0,
  
  UNIQUE(party_id, user_id)
);

-- Party movies table
CREATE TABLE IF NOT EXISTS party_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL,
  title TEXT NOT NULL,
  genres TEXT[] NOT NULL,
  expected_score NUMERIC(3,2) NOT NULL CHECK (expected_score >= 0 AND expected_score <= 1),
  
  -- Aggregated ELO rating
  elo_rating NUMERIC(6,2) DEFAULT 1200.0,
  
  -- Statistics
  total_swipes INTEGER DEFAULT 0,
  right_swipes INTEGER DEFAULT 0,
  left_swipes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(party_id, movie_id)
);

-- User swipes table
CREATE TABLE IF NOT EXISTS user_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  elo_change NUMERIC(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(party_id, user_id, movie_id)
);

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

-- Parties indexes
CREATE INDEX IF NOT EXISTS idx_parties_slug ON parties(slug);
CREATE INDEX IF NOT EXISTS idx_parties_created_by ON parties(created_by);
CREATE INDEX IF NOT EXISTS idx_parties_status ON parties(status);

-- Party members indexes
CREATE INDEX IF NOT EXISTS idx_party_members_party_id ON party_members(party_id);
CREATE INDEX IF NOT EXISTS idx_party_members_user_id ON party_members(user_id);
CREATE INDEX IF NOT EXISTS idx_party_members_status ON party_members(status);

-- Party movies indexes
CREATE INDEX IF NOT EXISTS idx_party_movies_party_id ON party_movies(party_id);
CREATE INDEX IF NOT EXISTS idx_party_movies_elo ON party_movies(party_id, elo_rating DESC);

-- User swipes indexes
CREATE INDEX IF NOT EXISTS idx_user_swipes_party_user ON user_swipes(party_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_swipes_party_movie ON user_swipes(party_id, movie_id);

-- ============================================================================
-- 4. CREATE FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate party preferences
CREATE OR REPLACE FUNCTION aggregate_party_preferences(party_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  aggregated JSONB := '{}'::jsonb;
BEGIN
  SELECT jsonb_object_agg(key, value)
  INTO aggregated
  FROM (
    SELECT 
      key,
      jsonb_agg(DISTINCT value) FILTER (WHERE value IS NOT NULL) as value
    FROM party_members pm,
    LATERAL jsonb_each(pm.preferences)
    WHERE pm.party_id = party_uuid
    AND pm.status = 'active'
    AND pm.has_submitted_preferences = true
    GROUP BY key
  ) sub;
  
  RETURN COALESCE(aggregated, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to update movie ELO after swipe
CREATE OR REPLACE FUNCTION update_movie_elo_after_swipe()
RETURNS TRIGGER AS $$
DECLARE
  movie_record RECORD;
  k_factor NUMERIC := 32;
  actual_score NUMERIC;
  expected_score NUMERIC;
  elo_change NUMERIC;
  new_elo NUMERIC;
BEGIN
  -- Get movie details
  SELECT * INTO movie_record
  FROM party_movies
  WHERE party_id = NEW.party_id AND movie_id = NEW.movie_id;
  
  -- If movie not found, return (shouldn't happen, but safety check)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Calculate ELO change
  actual_score := CASE WHEN NEW.direction = 'right' THEN 1.0 ELSE 0.0 END;
  expected_score := movie_record.expected_score;
  elo_change := k_factor * (actual_score - expected_score);
  new_elo := movie_record.elo_rating + elo_change;
  
  -- Update movie ELO and statistics
  UPDATE party_movies
  SET 
    elo_rating = new_elo,
    total_swipes = total_swipes + 1,
    right_swipes = right_swipes + CASE WHEN NEW.direction = 'right' THEN 1 ELSE 0 END,
    left_swipes = left_swipes + CASE WHEN NEW.direction = 'left' THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE party_id = NEW.party_id AND movie_id = NEW.movie_id;
  
  -- Store ELO change in swipe record
  NEW.elo_change := elo_change;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on parties
DROP TRIGGER IF EXISTS update_parties_updated_at ON parties;
CREATE TRIGGER update_parties_updated_at
  BEFORE UPDATE ON parties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on party_movies
DROP TRIGGER IF EXISTS update_party_movies_updated_at ON party_movies;
CREATE TRIGGER update_party_movies_updated_at
  BEFORE UPDATE ON party_movies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update movie ELO after swipe
DROP TRIGGER IF EXISTS trigger_update_movie_elo ON user_swipes;
CREATE TRIGGER trigger_update_movie_elo
  BEFORE INSERT ON user_swipes
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_elo_after_swipe();

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_swipes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. CREATE RLS POLICIES
-- ============================================================================

-- Parties policies
DROP POLICY IF EXISTS "Anyone can view parties" ON parties;
CREATE POLICY "Anyone can view parties"
  ON parties FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create parties" ON parties;
CREATE POLICY "Users can create parties"
  ON parties FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Creators can update parties" ON parties;
CREATE POLICY "Creators can update parties"
  ON parties FOR UPDATE
  USING (auth.uid() = created_by);

-- Party members policies
DROP POLICY IF EXISTS "Users can view their party memberships" ON party_members;
CREATE POLICY "Users can view their party memberships"
  ON party_members FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM party_members pm 
      WHERE pm.party_id = party_members.party_id 
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join parties" ON party_members;
CREATE POLICY "Users can join parties"
  ON party_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own membership" ON party_members;
CREATE POLICY "Users can update their own membership"
  ON party_members FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts can update members" ON party_members;
CREATE POLICY "Hosts can update members"
  ON party_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM party_members pm
      WHERE pm.party_id = party_members.party_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'host'
    )
  );

-- Party movies policies
DROP POLICY IF EXISTS "Party members can view movies" ON party_movies;
CREATE POLICY "Party members can view movies"
  ON party_movies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM party_members pm
      WHERE pm.party_id = party_movies.party_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
    )
  );

-- User swipes policies
DROP POLICY IF EXISTS "Users can view their swipes" ON user_swipes;
CREATE POLICY "Users can view their swipes"
  ON user_swipes FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM party_members pm 
      WHERE pm.party_id = user_swipes.party_id 
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their swipes" ON user_swipes;
CREATE POLICY "Users can create their swipes"
  ON user_swipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. NOTES FOR MANUAL STEPS
-- ============================================================================

-- IMPORTANT: After running this migration, you need to enable Realtime in Supabase Dashboard:
-- 
-- 1. Go to Database > Replication in Supabase Dashboard
-- 2. Enable replication for these tables:
--    - parties
--    - party_members
--    - party_movies
--    - user_swipes
--
-- OR run these SQL commands (if you have permissions):
-- 
-- ALTER PUBLICATION supabase_realtime ADD TABLE parties;
-- ALTER PUBLICATION supabase_realtime ADD TABLE party_members;
-- ALTER PUBLICATION supabase_realtime ADD TABLE party_movies;
-- ALTER PUBLICATION supabase_realtime ADD TABLE user_swipes;

