-- Migration 010: Expanded Predictions System
-- Adds holeshot, fastest lap, and qualifying predictions
-- Author: MotoSense Development Team
-- Date: January 2025

-- ============================================================================
-- EXTEND RACES TABLE
-- ============================================================================

-- Add bonus prediction result columns to races table
ALTER TABLE races ADD COLUMN IF NOT EXISTS holeshot_winner_id TEXT;
ALTER TABLE races ADD COLUMN IF NOT EXISTS fastest_lap_rider_id TEXT;
ALTER TABLE races ADD COLUMN IF NOT EXISTS qualifying_results JSONB DEFAULT '[]';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_races_holeshot ON races(holeshot_winner_id);
CREATE INDEX IF NOT EXISTS idx_races_fastest_lap ON races(fastest_lap_rider_id);

-- ============================================================================
-- EXTEND PREDICTION_SCORES TABLE
-- ============================================================================

-- Add bonus prediction scoring columns
ALTER TABLE prediction_scores ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;
ALTER TABLE prediction_scores ADD COLUMN IF NOT EXISTS holeshot_correct BOOLEAN DEFAULT FALSE;
ALTER TABLE prediction_scores ADD COLUMN IF NOT EXISTS fastest_lap_correct BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- SCORING FUNCTIONS
-- ============================================================================

-- Function to calculate bonus prediction points
CREATE OR REPLACE FUNCTION calculate_bonus_points(
  p_user_id UUID,
  p_race_id TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_prediction JSONB;
  v_holeshot_winner TEXT;
  v_fastest_lap_rider TEXT;
  v_bonus_points INTEGER := 0;
  v_predicted_holeshot TEXT;
  v_predicted_fastest_lap TEXT;
BEGIN
  -- Get user's prediction
  SELECT predictions INTO v_prediction
  FROM predictions
  WHERE user_id = p_user_id AND race_id = p_race_id;

  IF v_prediction IS NULL THEN
    RETURN 0;
  END IF;

  -- Get race results
  SELECT holeshot_winner_id, fastest_lap_rider_id
  INTO v_holeshot_winner, v_fastest_lap_rider
  FROM races
  WHERE id = p_race_id;

  -- Extract bonus predictions from JSONB
  v_predicted_holeshot := v_prediction->>'holeshot';
  v_predicted_fastest_lap := v_prediction->>'fastestLap';

  -- Award points for correct holeshot prediction (5 points)
  IF v_predicted_holeshot IS NOT NULL AND v_predicted_holeshot = v_holeshot_winner THEN
    v_bonus_points := v_bonus_points + 5;
  END IF;

  -- Award points for correct fastest lap prediction (5 points)
  IF v_predicted_fastest_lap IS NOT NULL AND v_predicted_fastest_lap = v_fastest_lap_rider THEN
    v_bonus_points := v_bonus_points + 5;
  END IF;

  RETURN v_bonus_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate all scores including bonus points
CREATE OR REPLACE FUNCTION recalculate_prediction_score(
  p_user_id UUID,
  p_race_id TEXT
) RETURNS void AS $$
DECLARE
  v_base_points INTEGER;
  v_bonus_points INTEGER;
  v_total_points INTEGER;
  v_holeshot_correct BOOLEAN;
  v_fastest_lap_correct BOOLEAN;
BEGIN
  -- Get existing base points (from standard top-5 predictions)
  SELECT COALESCE(points_earned, 0) - COALESCE(bonus_points, 0)
  INTO v_base_points
  FROM prediction_scores
  WHERE user_id = p_user_id AND race_id = p_race_id;

  -- Calculate bonus points
  v_bonus_points := calculate_bonus_points(p_user_id, p_race_id);

  -- Calculate total points
  v_total_points := COALESCE(v_base_points, 0) + v_bonus_points;

  -- Check holeshot correctness
  WITH prediction_data AS (
    SELECT 
      (predictions->>'holeshot') as pred_holeshot,
      r.holeshot_winner_id
    FROM predictions p
    JOIN races r ON r.id = p.race_id
    WHERE p.user_id = p_user_id AND p.race_id = p_race_id
  )
  SELECT (pred_holeshot = holeshot_winner_id) INTO v_holeshot_correct
  FROM prediction_data;

  -- Check fastest lap correctness
  WITH prediction_data AS (
    SELECT 
      (predictions->>'fastestLap') as pred_fastest,
      r.fastest_lap_rider_id
    FROM predictions p
    JOIN races r ON r.id = p.race_id
    WHERE p.user_id = p_user_id AND p.race_id = p_race_id
  )
  SELECT (pred_fastest = fastest_lap_rider_id) INTO v_fastest_lap_correct
  FROM prediction_data;

  -- Update prediction_scores
  UPDATE prediction_scores
  SET 
    bonus_points = v_bonus_points,
    points_earned = v_total_points,
    holeshot_correct = COALESCE(v_holeshot_correct, FALSE),
    fastest_lap_correct = COALESCE(v_fastest_lap_correct, FALSE),
    calculated_at = NOW()
  WHERE user_id = p_user_id AND race_id = p_race_id;

  -- Insert if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO prediction_scores (
      user_id,
      race_id,
      points_earned,
      bonus_points,
      holeshot_correct,
      fastest_lap_correct
    ) VALUES (
      p_user_id,
      p_race_id,
      v_total_points,
      v_bonus_points,
      COALESCE(v_holeshot_correct, FALSE),
      COALESCE(v_fastest_lap_correct, FALSE)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTIONS FOR ADMINS
-- ============================================================================

-- Function to set holeshot winner
CREATE OR REPLACE FUNCTION set_holeshot_winner(
  p_race_id TEXT,
  p_rider_id TEXT
) RETURNS void AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Only admins can set holeshot winner';
  END IF;

  -- Update race
  UPDATE races
  SET holeshot_winner_id = p_rider_id
  WHERE id = p_race_id;

  -- Recalculate scores for all users who made predictions
  PERFORM recalculate_prediction_score(user_id, p_race_id)
  FROM predictions
  WHERE race_id = p_race_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set fastest lap rider
CREATE OR REPLACE FUNCTION set_fastest_lap_rider(
  p_race_id TEXT,
  p_rider_id TEXT
) RETURNS void AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Only admins can set fastest lap rider';
  END IF;

  -- Update race
  UPDATE races
  SET fastest_lap_rider_id = p_rider_id
  WHERE id = p_race_id;

  -- Recalculate scores for all users who made predictions
  PERFORM recalculate_prediction_score(user_id, p_race_id)
  FROM predictions
  WHERE race_id = p_race_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION calculate_bonus_points TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_prediction_score TO authenticated;
GRANT EXECUTE ON FUNCTION set_holeshot_winner TO authenticated;
GRANT EXECUTE ON FUNCTION set_fastest_lap_rider TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Migration 010 complete: Expanded Predictions System ready
DO $$
BEGIN
  RAISE NOTICE 'Expanded Predictions migration complete!';
  RAISE NOTICE 'New features:';
  RAISE NOTICE '  - Holeshot winner prediction (5 bonus points)';
  RAISE NOTICE '  - Fastest lap prediction (5 bonus points)';
  RAISE NOTICE '  - Admin functions for setting bonus results';
END $$;
