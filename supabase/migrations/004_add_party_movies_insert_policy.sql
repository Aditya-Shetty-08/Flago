-- Migration: Add INSERT policy for party_movies table
-- This allows anonymous users to insert movies (ownership is validated in application code)

-- Add INSERT policy for party_movies
DROP POLICY IF EXISTS "Anyone can insert movies" ON party_movies;
CREATE POLICY "Anyone can insert movies"
  ON party_movies FOR INSERT
  WITH CHECK (true);

-- Also add UPDATE policy in case we need to update movie ratings
DROP POLICY IF EXISTS "Anyone can update movies" ON party_movies;
CREATE POLICY "Anyone can update movies"
  ON party_movies FOR UPDATE
  USING (true);

