-- Seed Test Races
-- Run this in Supabase SQL Editor to populate races table with test data
-- This resolves the foreign key constraint error when saving predictions

-- Clear existing test races (optional - only if you want to reset)
-- DELETE FROM races WHERE id LIKE 'race-%';

-- Insert test races matching the mock data IDs
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year) VALUES
  -- Race 1: Anaheim 1 (Supercross Round 1)
  (
    'race-1',
    'Anaheim 1',
    'supercross',
    'Angel Stadium',
    'Anaheim, CA',
    '2025-01-11T19:00:00Z',
    1,
    2025
  ),

  -- Race 2: Glendale (Supercross Round 2)
  (
    'race-2',
    'Glendale',
    'supercross',
    'State Farm Stadium',
    'Glendale, AZ',
    '2025-01-25T19:00:00Z',
    2,
    2025
  ),

  -- Race 3: San Diego (Supercross Round 3)
  (
    'race-3',
    'San Diego',
    'supercross',
    'Snapdragon Stadium',
    'San Diego, CA',
    '2025-02-01T19:00:00Z',
    3,
    2025
  ),

  -- Race 4: Glendale (Supercross Round 4)
  (
    'race-4',
    'Glendale 2',
    'supercross',
    'State Farm Stadium',
    'Glendale, AZ',
    '2025-02-08T19:00:00Z',
    4,
    2025
  ),

  -- Race 5: Tampa (Supercross Round 5)
  (
    'race-5',
    'Tampa',
    'supercross',
    'Raymond James Stadium',
    'Tampa, FL',
    '2025-02-15T19:00:00Z',
    5,
    2025
  ),

  -- Race 6: Arlington (Supercross Round 6)
  (
    'race-6',
    'Arlington',
    'supercross',
    'AT&T Stadium',
    'Arlington, TX',
    '2025-02-22T19:00:00Z',
    6,
    2025
  ),

  -- Race 7: Daytona (Supercross Round 7)
  (
    'race-7',
    'Daytona',
    'supercross',
    'Daytona International Speedway',
    'Daytona Beach, FL',
    '2025-03-08T19:00:00Z',
    7,
    2025
  ),

  -- Race 8: Indianapolis (Supercross Round 8)
  (
    'race-8',
    'Indianapolis',
    'supercross',
    'Lucas Oil Stadium',
    'Indianapolis, IN',
    '2025-03-15T19:00:00Z',
    8,
    2025
  ),

  -- Race 9: St. Louis (Supercross Round 9)
  (
    'race-9',
    'St. Louis',
    'supercross',
    'The Dome at America's Center',
    'St. Louis, MO',
    '2025-03-29T19:00:00Z',
    9,
    2025
  ),

  -- Race 10: Seattle (Supercross Round 10)
  (
    'race-10',
    'Seattle',
    'supercross',
    'Lumen Field',
    'Seattle, WA',
    '2025-04-05T19:00:00Z',
    10,
    2025
  ),

  -- Race 11: Pala (Motocross Round 1)
  (
    'race-11',
    'Fox Raceway - Pala',
    'motocross',
    'Fox Raceway',
    'Pala, CA',
    '2025-05-24T10:00:00Z',
    1,
    2025
  ),

  -- Race 12: Hangtown (Motocross Round 2)
  (
    'race-12',
    'Hangtown',
    'motocross',
    'Hangtown MX Park',
    'Sacramento, CA',
    '2025-05-31T10:00:00Z',
    2,
    2025
  ),

  -- Race 13: Thunder Valley (Motocross Round 3)
  (
    'race-13',
    'Thunder Valley',
    'motocross',
    'Thunder Valley Motocross Park',
    'Lakewood, CO',
    '2025-06-07T10:00:00Z',
    3,
    2025
  ),

  -- Race 14: High Point (Motocross Round 4)
  (
    'race-14',
    'High Point',
    'motocross',
    'High Point Raceway',
    'Mt. Morris, PA',
    '2025-06-14T10:00:00Z',
    4,
    2025
  ),

  -- Race 15: Southwick (Motocross Round 5)
  (
    'race-15',
    'Southwick',
    'motocross',
    'Southwick MX',
    'Southwick, MA',
    '2025-06-28T10:00:00Z',
    5,
    2025
  )
ON CONFLICT (id) DO NOTHING;

-- Verify the data was inserted
DO $$
DECLARE
  race_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO race_count FROM races WHERE id LIKE 'race-%';
  RAISE NOTICE '✅ Inserted % test races', race_count;
  RAISE NOTICE 'You can now save predictions for race IDs: race-1 through race-15';
  RAISE NOTICE '';
  RAISE NOTICE 'To view the races:';
  RAISE NOTICE 'SELECT id, name, series, round, date FROM races ORDER BY date;';
END $$;
