-- Migration: Remove auth.users dependencies for anonymous access
-- Run this AFTER 001_create_party_system.sql

-- ============================================================================
-- 1. DROP FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Drop foreign key from parties table
ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_created_by_fkey;

-- Drop foreign key from party_members table
ALTER TABLE party_members DROP CONSTRAINT IF EXISTS party_members_user_id_fkey;

-- Drop foreign key from user_swipes table
ALTER TABLE user_swipes DROP CONSTRAINT IF EXISTS user_swipes_user_id_fkey;

-- ============================================================================
-- 2. DROP RLS POLICIES FIRST (they depend on the columns we're changing)
-- ============================================================================

-- Drop ALL policies that might reference the columns we're changing
-- Parties policies
DROP POLICY IF EXISTS "Users can create parties" ON parties;
DROP POLICY IF EXISTS "Creators can update parties" ON parties;

-- Party members policies
DROP POLICY IF EXISTS "Users can view their party memberships" ON party_members;
DROP POLICY IF EXISTS "Users can join parties" ON party_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON party_members;
DROP POLICY IF EXISTS "Hosts can update members" ON party_members;

-- Party movies policies (might reference user_id indirectly)
DROP POLICY IF EXISTS "Party members can view movies" ON party_movies;

-- User swipes policies
DROP POLICY IF EXISTS "Users can view their swipes" ON user_swipes;
DROP POLICY IF EXISTS "Users can create their swipes" ON user_swipes;

-- ============================================================================
-- 3. CHANGE USER_ID COLUMNS TO TEXT (for anonymous session IDs)
-- ============================================================================

-- Update parties table
ALTER TABLE parties ALTER COLUMN created_by TYPE TEXT;

-- Update party_members table
ALTER TABLE party_members ALTER COLUMN user_id TYPE TEXT;

-- Update user_swipes table
ALTER TABLE user_swipes ALTER COLUMN user_id TYPE TEXT;

-- ============================================================================
-- 4. CREATE NEW RLS POLICIES (for anonymous access)
-- ============================================================================

-- New policies for anonymous access
-- Parties policies
CREATE POLICY "Anyone can create parties"
  ON parties FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update parties"
  ON parties FOR UPDATE
  USING (true);

-- Party members policies
CREATE POLICY "Anyone can view party members"
  ON party_members FOR SELECT
  USING (true);

CREATE POLICY "Anyone can join parties"
  ON party_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update party members"
  ON party_members FOR UPDATE
  USING (true);

-- Party movies policies
CREATE POLICY "Anyone can view movies"
  ON party_movies FOR SELECT
  USING (true);

-- User swipes policies
CREATE POLICY "Anyone can view swipes"
  ON user_swipes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create swipes"
  ON user_swipes FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- After this migration:
-- - All user_id fields are now TEXT (anonymous session IDs)
-- - No authentication required
-- - RLS policies allow anonymous access
-- - Application code should validate ownership when needed
-- - Consider adding a "display_name" field to party_members for user-friendly names

