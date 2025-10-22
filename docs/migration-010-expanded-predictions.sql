-- Migration 010: Expanded Predictions
-- Add support for additional prediction categories beyond top 5 finishers

-- Add new columns to predictions table for expanded predictions
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS holeshot_winner_id UUID REFERENCES riders(id) ON DELETE SET NULL;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS fastest_lap_rider_id UUID REFERENCES riders(id) ON DELETE SET NULL;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS qualifying_1_id UUID REFERENCES riders(id) ON DELETE SET NULL;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS qualifying_2_id UUID REFERENCES riders(id) ON DELETE SET NULL;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS qualifying_3_id UUID REFERENCES riders(id) ON DELETE SET NULL;

-- Add bonus points columns
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS holeshot_points INTEGER DEFAULT 0;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS fastest_lap_points INTEGER DEFAULT 0;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS qualifying_points INTEGER DEFAULT 0;

-- Create indexes for expanded predictions
CREATE INDEX IF NOT EXISTS idx_predictions_holeshot ON predictions(holeshot_winner_id);
CREATE INDEX IF NOT EXISTS idx_predictions_fastest_lap ON predictions(fastest_lap_rider_id);
CREATE INDEX IF NOT EXISTS idx_predictions_qualifying_1 ON predictions(qualifying_1_id);

-- Add new columns to race_results table for tracking actual results
ALTER TABLE race_results ADD COLUMN IF NOT EXISTS was_holeshot_winner BOOLEAN DEFAULT FALSE;
ALTER TABLE race_results ADD COLUMN IF NOT EXISTS had_fastest_lap BOOLEAN DEFAULT FALSE;
ALTER TABLE race_results ADD COLUMN IF NOT EXISTS qualifying_position INTEGER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_race_results_holeshot ON race_results(was_holeshot_winner);
CREATE INDEX IF NOT EXISTS idx_race_results_fastest_lap ON race_results(had_fastest_lap);
CREATE INDEX IF NOT EXISTS idx_race_results_qualifying ON race_results(qualifying_position);

-- Create function to calculate expanded prediction points
CREATE OR REPLACE FUNCTION calculate_expanded_prediction_points(p_prediction_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_prediction RECORD;
  v_race_id UUID;
  v_holeshot_points INTEGER := 0;
  v_fastest_lap_points INTEGER := 0;
  v_qualifying_points INTEGER := 0;
  v_total_bonus INTEGER := 0;
BEGIN
  -- Get prediction details
  SELECT * INTO v_prediction
  FROM predictions
  WHERE id = p_prediction_id;

  IF v_prediction IS NULL THEN
    RETURN 0;
  END IF;

  v_race_id := v_prediction.race_id;

  -- Check holeshot winner (15 bonus points)
  IF v_prediction.holeshot_winner_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM race_results
      WHERE race_id = v_race_id
        AND rider_id = v_prediction.holeshot_winner_id
        AND was_holeshot_winner = TRUE
    ) THEN
      v_holeshot_points := 15;
    END IF;
  END IF;

  -- Check fastest lap (10 bonus points)
  IF v_prediction.fastest_lap_rider_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM race_results
      WHERE race_id = v_race_id
        AND rider_id = v_prediction.fastest_lap_rider_id
        AND had_fastest_lap = TRUE
    ) THEN
      v_fastest_lap_points := 10;
    END IF;
  END IF;

  -- Check qualifying predictions (5 points each for correct position)
  DECLARE
    v_qual_1_pos INTEGER;
    v_qual_2_pos INTEGER;
    v_qual_3_pos INTEGER;
  BEGIN
    -- Get actual qualifying positions
    IF v_prediction.qualifying_1_id IS NOT NULL THEN
      SELECT qualifying_position INTO v_qual_1_pos
      FROM race_results
      WHERE race_id = v_race_id AND rider_id = v_prediction.qualifying_1_id;

      IF v_qual_1_pos = 1 THEN
        v_qualifying_points := v_qualifying_points + 5;
      END IF;
    END IF;

    IF v_prediction.qualifying_2_id IS NOT NULL THEN
      SELECT qualifying_position INTO v_qual_2_pos
      FROM race_results
      WHERE race_id = v_race_id AND rider_id = v_prediction.qualifying_2_id;

      IF v_qual_2_pos = 2 THEN
        v_qualifying_points := v_qualifying_points + 5;
      END IF;
    END IF;

    IF v_prediction.qualifying_3_id IS NOT NULL THEN
      SELECT qualifying_position INTO v_qual_3_pos
      FROM race_results
      WHERE race_id = v_race_id AND rider_id = v_prediction.qualifying_3_id;

      IF v_qual_3_pos = 3 THEN
        v_qualifying_points := v_qualifying_points + 5;
      END IF;
    END IF;
  END;

  -- Update prediction with bonus points
  UPDATE predictions
  SET holeshot_points = v_holeshot_points,
      fastest_lap_points = v_fastest_lap_points,
      qualifying_points = v_qualifying_points
  WHERE id = p_prediction_id;

  v_total_bonus := v_holeshot_points + v_fastest_lap_points + v_qualifying_points;

  RETURN v_total_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION calculate_expanded_prediction_points IS 'Calculate bonus points for expanded predictions (holeshot, fastest lap, qualifying)';

-- Grant permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON COLUMN predictions.holeshot_winner_id IS 'Predicted holeshot winner (first to first turn)';
COMMENT ON COLUMN predictions.fastest_lap_rider_id IS 'Predicted fastest lap rider';
COMMENT ON COLUMN predictions.qualifying_1_id IS 'Predicted 1st place in qualifying';
COMMENT ON COLUMN predictions.qualifying_2_id IS 'Predicted 2nd place in qualifying';
COMMENT ON COLUMN predictions.qualifying_3_id IS 'Predicted 3rd place in qualifying';
COMMENT ON COLUMN predictions.holeshot_points IS 'Bonus points earned from holeshot prediction';
COMMENT ON COLUMN predictions.fastest_lap_points IS 'Bonus points earned from fastest lap prediction';
COMMENT ON COLUMN predictions.qualifying_points IS 'Bonus points earned from qualifying predictions';

COMMENT ON COLUMN race_results.was_holeshot_winner IS 'Whether this rider won the holeshot';
COMMENT ON COLUMN race_results.had_fastest_lap IS 'Whether this rider had the fastest lap';
COMMENT ON COLUMN race_results.qualifying_position IS 'Riders position in qualifying';
