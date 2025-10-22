-- ============================================================================
-- FIX MISSING TABLES AND COLUMNS
-- ============================================================================
-- This fixes:
-- 1. Missing is_admin column in profiles table
-- 2. Missing prediction_scores table
-- ============================================================================

-- Step 1: Add is_admin column to profiles (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_admin column to profiles table';
  ELSE
    RAISE NOTICE 'ℹ️ is_admin column already exists';
  END IF;
END $$;

-- Step 2: Create prediction_scores table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS prediction_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  race_id TEXT REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE NOT NULL,
  position_1_correct BOOLEAN DEFAULT false,
  position_2_correct BOOLEAN DEFAULT false,
  position_3_correct BOOLEAN DEFAULT false,
  position_4_correct BOOLEAN DEFAULT false,
  position_5_correct BOOLEAN DEFAULT false,
  exact_matches INTEGER DEFAULT 0,
  positional_points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  bonus_points INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(prediction_id)
);

-- Indexes for prediction_scores
CREATE INDEX IF NOT EXISTS idx_prediction_scores_user ON prediction_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_scores_race ON prediction_scores(race_id);
CREATE INDEX IF NOT EXISTS idx_prediction_scores_points ON prediction_scores(total_points DESC);

-- Row Level Security for prediction_scores
ALTER TABLE prediction_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view own prediction scores" ON prediction_scores;
DROP POLICY IF EXISTS "Anyone can view all prediction scores" ON prediction_scores;

-- Users can view their own scores
CREATE POLICY "Users can view own prediction scores"
  ON prediction_scores FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view all scores (for leaderboards)
CREATE POLICY "Anyone can view all prediction scores"
  ON prediction_scores FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_prediction_scores_updated_at ON prediction_scores;
CREATE TRIGGER update_prediction_scores_updated_at
  BEFORE UPDATE ON prediction_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 3: Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Step 4: Verify everything
DO $$
DECLARE
  is_admin_exists BOOLEAN;
  prediction_scores_exists BOOLEAN;
BEGIN
  -- Check is_admin column
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'is_admin'
  ) INTO is_admin_exists;

  -- Check prediction_scores table
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'prediction_scores'
  ) INTO prediction_scores_exists;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '==========================================';

  IF is_admin_exists THEN
    RAISE NOTICE '✅ profiles.is_admin column exists';
  ELSE
    RAISE WARNING '❌ profiles.is_admin column NOT FOUND';
  END IF;

  IF prediction_scores_exists THEN
    RAISE NOTICE '✅ prediction_scores table exists';
  ELSE
    RAISE WARNING '❌ prediction_scores table NOT FOUND';
  END IF;

  RAISE NOTICE '✅ Schema cache reloaded';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Next step: Restart your Expo dev server';
  RAISE NOTICE '==========================================';
END $$;
