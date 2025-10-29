-- Fix Supercross Schedule: Remove duplicates and add missing rounds
-- Run this in the Supabase SQL Editor

-- Step 1: Delete the 3 manually added duplicates (the ones with UUID IDs)
DELETE FROM races WHERE id = 'bb0a1250-19a9-4e65-a621-127d4a32cb85'; -- Duplicate Anaheim 1
DELETE FROM races WHERE id = '64081859-c6c6-4ac4-b717-338fcbead75b'; -- Duplicate San Diego R2
DELETE FROM races WHERE id = '027bb1be-47a0-4cc1-b680-a1d9f732af24'; -- Duplicate Anaheim 2

-- Step 2: Update race-2 (Glendale) from Round 2 to Round 3
-- This fixes the round numbering conflict
UPDATE races SET round = 3 WHERE id = 'race-2';

-- Step 3: Update race-3 (San Diego) from Round 3 to Round 4
-- And all subsequent races
UPDATE races SET round = 4 WHERE id = 'race-3';  -- San Diego
UPDATE races SET round = 5 WHERE id = 'race-4';  -- Glendale 2
UPDATE races SET round = 6 WHERE id = 'race-5';  -- Tampa
UPDATE races SET round = 7 WHERE id = 'race-6';  -- Arlington
UPDATE races SET round = 8 WHERE id = 'race-7';  -- Daytona
UPDATE races SET round = 9 WHERE id = 'race-8';  -- Indianapolis
UPDATE races SET round = 10 WHERE id = 'race-9'; -- St. Louis
UPDATE races SET round = 11 WHERE id = 'race-10'; -- Seattle

-- Step 4: Add Round 2 (San Diego) - Missing from original schedule
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
VALUES (
  'race-sx-2',
  'San Diego',
  'supercross',
  'Snapdragon Stadium',
  'San Diego, CA',
  '2025-01-18T19:00:00Z',
  2,
  2025,
  'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564',
  true
);

-- Step 5: Add the missing Supercross Rounds 12-17
-- Round 12: Detroit
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
VALUES (
  'race-sx-12',
  'Detroit',
  'supercross',
  'Ford Field',
  'Detroit, MI',
  '2025-04-12T19:00:00Z',
  12,
  2025,
  'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564',
  true
);

-- Round 13: Nashville
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
VALUES (
  'race-sx-13',
  'Nashville',
  'supercross',
  'Nissan Stadium',
  'Nashville, TN',
  '2025-04-19T19:00:00Z',
  13,
  2025,
  'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564',
  true
);

-- Round 14: Foxborough
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
VALUES (
  'race-sx-14',
  'Foxborough',
  'supercross',
  'Gillette Stadium',
  'Foxborough, MA',
  '2025-04-26T19:00:00Z',
  14,
  2025,
  'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564',
  true
);

-- Round 15: Denver
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
VALUES (
  'race-sx-15',
  'Denver',
  'supercross',
  'Empower Field at Mile High',
  'Denver, CO',
  '2025-05-03T19:00:00Z',
  15,
  2025,
  'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564',
  true
);

-- Round 16: Las Vegas
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
VALUES (
  'race-sx-16',
  'Las Vegas',
  'supercross',
  'Allegiant Stadium',
  'Las Vegas, NV',
  '2025-05-10T19:00:00Z',
  16,
  2025,
  'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564',
  true
);

-- Round 17: Salt Lake City (Finale)
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
VALUES (
  'race-sx-17',
  'Salt Lake City',
  'supercross',
  'Rice-Eccles Stadium',
  'Salt Lake City, UT',
  '2025-05-17T19:00:00Z',
  17,
  2025,
  'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564',
  true
);

-- Verification query - Run this to check results
SELECT id, name, round, date, track_name
FROM races
WHERE series = 'supercross'
ORDER BY round;
