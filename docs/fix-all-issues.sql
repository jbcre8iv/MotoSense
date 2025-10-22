-- ============================================================================
-- COMPLETE FIX SCRIPT - Run this in Supabase SQL Editor
-- ============================================================================
-- This script will:
-- 1. Reload schema cache (fixes PGRST205 errors)
-- 2. Verify all tables exist
-- 3. Seed test race data (fixes foreign key errors)
-- ============================================================================

-- Step 1: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 2: Verify tables exist
DO $$
DECLARE
  profiles_exists BOOLEAN;
  predictions_exists BOOLEAN;
  races_exists BOOLEAN;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'
  ) INTO profiles_exists;

  SELECT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'predictions'
  ) INTO predictions_exists;

  SELECT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'races'
  ) INTO races_exists;

  -- Report status
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'TABLE VERIFICATION:';
  RAISE NOTICE '==========================================';

  IF profiles_exists THEN
    RAISE NOTICE '✅ profiles table exists';
  ELSE
    RAISE WARNING '❌ profiles table NOT FOUND - run migration-001';
  END IF;

  IF predictions_exists THEN
    RAISE NOTICE '✅ predictions table exists';
  ELSE
    RAISE WARNING '❌ predictions table NOT FOUND - run migration-002';
  END IF;

  IF races_exists THEN
    RAISE NOTICE '✅ races table exists';
  ELSE
    RAISE WARNING '❌ races table NOT FOUND - run migration-002';
  END IF;

  RAISE NOTICE '==========================================';
END $$;

-- Step 3: Seed test races (only if races table exists)
DO $$
BEGIN
  -- Check if races table exists before inserting
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'races') THEN
    -- Insert test races
    INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year) VALUES
      ('race-1', 'Anaheim 1', 'supercross', 'Angel Stadium', 'Anaheim, CA', '2025-01-11T19:00:00Z', 1, 2025),
      ('race-2', 'Glendale', 'supercross', 'State Farm Stadium', 'Glendale, AZ', '2025-01-25T19:00:00Z', 2, 2025),
      ('race-3', 'San Diego', 'supercross', 'Snapdragon Stadium', 'San Diego, CA', '2025-02-01T19:00:00Z', 3, 2025),
      ('race-4', 'Glendale 2', 'supercross', 'State Farm Stadium', 'Glendale, AZ', '2025-02-08T19:00:00Z', 4, 2025),
      ('race-5', 'Tampa', 'supercross', 'Raymond James Stadium', 'Tampa, FL', '2025-02-15T19:00:00Z', 5, 2025),
      ('race-6', 'Arlington', 'supercross', 'AT&T Stadium', 'Arlington, TX', '2025-02-22T19:00:00Z', 6, 2025),
      ('race-7', 'Daytona', 'supercross', 'Daytona International Speedway', 'Daytona Beach, FL', '2025-03-08T19:00:00Z', 7, 2025),
      ('race-8', 'Indianapolis', 'supercross', 'Lucas Oil Stadium', 'Indianapolis, IN', '2025-03-15T19:00:00Z', 8, 2025),
      ('race-9', 'St. Louis', 'supercross', 'The Dome at America''s Center', 'St. Louis, MO', '2025-03-29T19:00:00Z', 9, 2025),
      ('race-10', 'Seattle', 'supercross', 'Lumen Field', 'Seattle, WA', '2025-04-05T19:00:00Z', 10, 2025),
      ('race-11', 'Fox Raceway - Pala', 'motocross', 'Fox Raceway', 'Pala, CA', '2025-05-24T10:00:00Z', 1, 2025),
      ('race-12', 'Hangtown', 'motocross', 'Hangtown MX Park', 'Sacramento, CA', '2025-05-31T10:00:00Z', 2, 2025),
      ('race-13', 'Thunder Valley', 'motocross', 'Thunder Valley Motocross Park', 'Lakewood, CO', '2025-06-07T10:00:00Z', 3, 2025),
      ('race-14', 'High Point', 'motocross', 'High Point Raceway', 'Mt. Morris, PA', '2025-06-14T10:00:00Z', 4, 2025),
      ('race-15', 'Southwick', 'motocross', 'Southwick MX', 'Southwick, MA', '2025-06-28T10:00:00Z', 5, 2025)
    ON CONFLICT (id) DO NOTHING;

    -- Report how many races were inserted
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TEST RACE DATA:';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Seeded test races (race-1 through race-15)';
    RAISE NOTICE '   - 10 Supercross rounds';
    RAISE NOTICE '   - 5 Motocross rounds';
    RAISE NOTICE '==========================================';
  ELSE
    RAISE WARNING '❌ Cannot seed races - races table does not exist!';
    RAISE WARNING '   Please run migration-002-predictions-races.sql first';
  END IF;
END $$;

-- Step 4: Show final status
DO $$
DECLARE
  race_count INTEGER;
BEGIN
  -- Count races
  SELECT COUNT(*) INTO race_count FROM races WHERE id LIKE 'race-%';

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'FINAL STATUS:';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ Schema cache reloaded';
  RAISE NOTICE '✅ % test races available', race_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Restart your Expo dev server';
  RAISE NOTICE '2. Test saving predictions in the app';
  RAISE NOTICE '3. Verify no more PGRST205 errors';
  RAISE NOTICE '==========================================';
END $$;

-- Step 5: Display sample races
SELECT
  id,
  name,
  series,
  round,
  to_char(date::timestamp, 'Mon DD, YYYY') as race_date
FROM races
WHERE id LIKE 'race-%'
ORDER BY date
LIMIT 10;
