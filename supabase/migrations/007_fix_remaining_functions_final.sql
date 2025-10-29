-- Fix remaining 2 functions with search path issues
-- This version drops ALL overloaded versions

-- Drop all versions of create_prediction_activity
DO $$
DECLARE
  func_signature text;
BEGIN
  FOR func_signature IN
    SELECT pg_get_functiondef(oid)::text
    FROM pg_proc
    WHERE proname = 'create_prediction_activity'
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.create_prediction_activity(' ||
      (SELECT pg_get_function_arguments(oid) FROM pg_proc
       WHERE proname = 'create_prediction_activity'
       AND pronamespace = 'public'::regnamespace LIMIT 1) || ') CASCADE';
  END LOOP;
END $$;

-- Drop all versions of create_race_completion_activity
DO $$
DECLARE
  func_signature text;
BEGIN
  FOR func_signature IN
    SELECT pg_get_functiondef(oid)::text
    FROM pg_proc
    WHERE proname = 'create_race_completion_activity'
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.create_race_completion_activity(' ||
      (SELECT pg_get_function_arguments(oid) FROM pg_proc
       WHERE proname = 'create_race_completion_activity'
       AND pronamespace = 'public'::regnamespace LIMIT 1) || ') CASCADE';
  END LOOP;
END $$;

-- Recreate create_prediction_activity with secure search_path
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

-- Recreate create_race_completion_activity with secure search_path
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
  v_description := 'You earned ' || p_points_earned::text || ' points and finished #' || p_rank::text;

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
GRANT EXECUTE ON FUNCTION public.create_prediction_activity(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_race_completion_activity(UUID, UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Fixed remaining 2 functions with search_path';
END $$;
