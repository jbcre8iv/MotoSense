-- Race Results System Migration
-- Run this in Supabase SQL Editor

-- 1. Add is_admin field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Create race_results table
CREATE TABLE IF NOT EXISTS race_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 20),
  rider_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one rider per position per race
  UNIQUE(race_id, position),
  -- Ensure a rider can't appear multiple times in same race
  UNIQUE(race_id, rider_id)
);

-- Index for fast lookups by race
CREATE INDEX IF NOT EXISTS idx_race_results_race_id ON race_results(race_id);

-- Row Level Security
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;

-- Everyone can view race results
CREATE POLICY "Race results are viewable by everyone"
  ON race_results FOR SELECT
  USING (true);

-- Only admins can insert race results
CREATE POLICY "Admins can insert race results"
  ON race_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can update race results
CREATE POLICY "Admins can update race results"
  ON race_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can delete race results
CREATE POLICY "Admins can delete race results"
  ON race_results FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_race_results_updated_at
  BEFORE UPDATE ON race_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Create prediction_scores table to cache calculated scores
CREATE TABLE IF NOT EXISTS prediction_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  race_id TEXT NOT NULL,
  points_earned INTEGER DEFAULT 0,
  exact_matches INTEGER DEFAULT 0,
  position_matches INTEGER DEFAULT 0,
  rider_matches INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One score per user per race
  UNIQUE(user_id, race_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_prediction_scores_user ON prediction_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_scores_race ON prediction_scores(race_id);

-- Row Level Security
ALTER TABLE prediction_scores ENABLE ROW LEVEL SECURITY;

-- Users can view their own scores
CREATE POLICY "Users can view own prediction scores"
  ON prediction_scores FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view all scores (for leaderboards)
CREATE POLICY "All prediction scores are viewable"
  ON prediction_scores FOR SELECT
  USING (true);

-- Only the system can insert/update scores (via service role)
-- These policies allow authenticated users to view but restrict writes

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Race results system created successfully!';
  RAISE NOTICE 'To make a user an admin, run: UPDATE profiles SET is_admin = true WHERE id = ''<user_id>'';';
END $$;
