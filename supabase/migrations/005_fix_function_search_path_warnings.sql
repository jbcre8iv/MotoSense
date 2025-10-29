-- Migration: Fix Function Search Path Warnings
-- Description: Adds secure search_path to all SECURITY DEFINER functions
-- Date: 2025-10-29
-- Issue: Functions with SECURITY DEFINER need explicit search_path to prevent schema injection attacks

-- ============================================================================
-- WHY THIS FIX IS NEEDED
-- ============================================================================
-- Functions with SECURITY DEFINER run with elevated privileges.
-- Without an explicit search_path, attackers could manipulate the schema search
-- to execute malicious code. Setting search_path = '' forces fully-qualified names.
-- ============================================================================

-- 1. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    COALESCE(new.raw_user_meta_data->>'display_name', null)
  );
  RETURN new;
END;
$$;

-- 2. Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. Fix get_active_season
CREATE OR REPLACE FUNCTION public.get_active_season()
RETURNS UUID
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
  SELECT id FROM public.seasons WHERE status = 'active' LIMIT 1;
$$;

-- 4. Fix get_demo_season
CREATE OR REPLACE FUNCTION public.get_demo_season()
RETURNS UUID
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
  SELECT id FROM public.seasons WHERE status = 'demo' LIMIT 1;
$$;

-- 5. Fix cleanup_old_activities
CREATE OR REPLACE FUNCTION public.cleanup_old_activities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.activity_feed
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- 6. Fix create_prediction_activity
CREATE OR REPLACE FUNCTION public.create_prediction_activity(
  p_user_id UUID,
  p_race_id UUID,
  p_race_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    title,
    description,
    related_race_id,
    metadata
  ) VALUES (
    p_user_id,
    'prediction_made',
    'Prediction Submitted',
    'You submitted your prediction for ' || p_race_name,
    p_race_id,
    jsonb_build_object('race_name', p_race_name)
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- 7. Fix create_race_completion_activity
CREATE OR REPLACE FUNCTION public.create_race_completion_activity(
  p_user_id UUID,
  p_race_id UUID,
  p_race_name TEXT,
  p_points_earned INTEGER,
  p_rank INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_activity_id UUID;
  v_description TEXT;
BEGIN
  v_description := 'You earned ' || p_points_earned || ' points and finished #' || p_rank;

  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    title,
    description,
    related_race_id,
    points_earned,
    metadata
  ) VALUES (
    p_user_id,
    'race_completed',
    p_race_name || ' Results',
    v_description,
    p_race_id,
    p_points_earned,
    jsonb_build_object(
      'race_name', p_race_name,
      'points', p_points_earned,
      'rank', p_rank
    )
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- 8. Fix create_achievement_activity
CREATE OR REPLACE FUNCTION public.create_achievement_activity(
  p_user_id UUID,
  p_achievement_name TEXT,
  p_achievement_description TEXT,
  p_achievement_icon TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    title,
    description,
    metadata
  ) VALUES (
    p_user_id,
    'achievement_unlocked',
    'Achievement Unlocked: ' || p_achievement_name,
    p_achievement_description,
    jsonb_build_object(
      'name', p_achievement_name,
      'icon', p_achievement_icon
    )
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- 9. Fix create_rivalry_activity
CREATE OR REPLACE FUNCTION public.create_rivalry_activity(
  p_user_id UUID,
  p_rival_id UUID,
  p_rival_username TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    title,
    description,
    related_user_id,
    metadata
  ) VALUES (
    p_user_id,
    'rivalry_created',
    'New Rivalry',
    'You started a rivalry with ' || p_rival_username,
    p_rival_id,
    jsonb_build_object('rival_username', p_rival_username)
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- 10. Fix calculate_bonus_points
CREATE OR REPLACE FUNCTION public.calculate_bonus_points(
  p_user_id UUID,
  p_race_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
  FROM public.predictions
  WHERE user_id = p_user_id AND race_id = p_race_id;

  IF v_prediction IS NULL THEN
    RETURN 0;
  END IF;

  -- Get race results
  SELECT holeshot_winner_id, fastest_lap_rider_id
  INTO v_holeshot_winner, v_fastest_lap_rider
  FROM public.races
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
$$;

-- 11. Fix recalculate_prediction_score
CREATE OR REPLACE FUNCTION public.recalculate_prediction_score(
  p_user_id UUID,
  p_race_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base_points INTEGER;
  v_bonus_points INTEGER;
  v_total_points INTEGER;
BEGIN
  -- Get existing base points (from standard top-5 predictions)
  SELECT COALESCE(points_earned, 0) - COALESCE(bonus_points, 0)
  INTO v_base_points
  FROM public.prediction_scores
  WHERE user_id = p_user_id AND race_id = p_race_id;

  -- Calculate bonus points
  v_bonus_points := public.calculate_bonus_points(p_user_id, p_race_id);

  -- Calculate total points
  v_total_points := COALESCE(v_base_points, 0) + v_bonus_points;

  -- Update prediction_scores
  UPDATE public.prediction_scores
  SET
    bonus_points = v_bonus_points,
    points_earned = v_total_points,
    holeshot_correct = (
      SELECT (predictions->>'holeshot')::TEXT = holeshot_winner_id
      FROM public.predictions p
      JOIN public.races r ON p.race_id = r.id
      WHERE p.user_id = p_user_id AND p.race_id = p_race_id
    ),
    fastest_lap_correct = (
      SELECT (predictions->>'fastestLap')::TEXT = fastest_lap_rider_id
      FROM public.predictions p
      JOIN public.races r ON p.race_id = r.id
      WHERE p.user_id = p_user_id AND p.race_id = p_race_id
    )
  WHERE user_id = p_user_id AND race_id = p_race_id;
END;
$$;

-- 12. Fix set_holeshot_winner
CREATE OR REPLACE FUNCTION public.set_holeshot_winner(
  p_race_id TEXT,
  p_rider_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Only admins can set holeshot winner';
  END IF;

  -- Update race
  UPDATE public.races
  SET holeshot_winner_id = p_rider_id
  WHERE id = p_race_id;

  -- Recalculate scores for all users who made predictions
  PERFORM public.recalculate_prediction_score(user_id, p_race_id)
  FROM public.predictions
  WHERE race_id = p_race_id;
END;
$$;

-- 13. Fix set_fastest_lap_rider
CREATE OR REPLACE FUNCTION public.set_fastest_lap_rider(
  p_race_id TEXT,
  p_rider_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Only admins can set fastest lap rider';
  END IF;

  -- Update race
  UPDATE public.races
  SET fastest_lap_rider_id = p_rider_id
  WHERE id = p_race_id;

  -- Recalculate scores for all users who made predictions
  PERFORM public.recalculate_prediction_score(user_id, p_race_id)
  FROM public.predictions
  WHERE race_id = p_race_id;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Function search path security fixes applied:';
  RAISE NOTICE '✓ handle_new_user - secured';
  RAISE NOTICE '✓ update_updated_at_column - secured';
  RAISE NOTICE '✓ get_active_season - secured';
  RAISE NOTICE '✓ get_demo_season - secured';
  RAISE NOTICE '✓ cleanup_old_activities - secured';
  RAISE NOTICE '✓ create_prediction_activity - secured';
  RAISE NOTICE '✓ create_race_completion_activity - secured';
  RAISE NOTICE '✓ create_achievement_activity - secured';
  RAISE NOTICE '✓ create_rivalry_activity - secured';
  RAISE NOTICE '✓ calculate_bonus_points - secured';
  RAISE NOTICE '✓ recalculate_prediction_score - secured';
  RAISE NOTICE '✓ set_holeshot_winner - secured';
  RAISE NOTICE '✓ set_fastest_lap_rider - secured';
  RAISE NOTICE '';
  RAISE NOTICE 'All 13 function search path warnings should now be resolved!';
END $$;
