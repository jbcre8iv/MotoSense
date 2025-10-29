-- Fix remaining 2 functions with search path issues

-- Fix create_prediction_activity
-- Drop all versions of this function
DROP FUNCTION IF EXISTS public.create_prediction_activity CASCADE;

CREATE FUNCTION public.create_prediction_activity(
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

-- Fix create_race_completion_activity
-- Drop all versions of this function
DROP FUNCTION IF EXISTS public.create_race_completion_activity CASCADE;

CREATE FUNCTION public.create_race_completion_activity(
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

-- Restore grants
GRANT EXECUTE ON FUNCTION public.create_prediction_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_race_completion_activity TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Fixed remaining 2 functions with search_path';
END $$;
