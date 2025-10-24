-- COMPREHENSIVE 2025 SEASON FIX
-- Run this in the Supabase SQL Editor
-- This corrects all date/venue errors and adds missing races

-- ========================================
-- STEP 0: Clean up any conflicts from previous migrations
-- ========================================

-- Delete any duplicate entries from manual entry or old migrations
DELETE FROM races WHERE id IN (
  'bb0a1250-19a9-4e65-a621-127d4a32cb85',
  '64081859-c6c6-4ac4-b717-338fcbead75b',
  '027bb1be-47a0-4cc1-b680-a1d9f732af24',
  'race-sx-2'  -- This may have been added by previous migration
);

-- ========================================
-- STEP 1: Fix Supercross dates and venues
-- ========================================

-- Update existing Supercross races with correct dates/venues
UPDATE races SET date = '2025-01-18T19:00:00Z', name = 'San Diego', track_name = 'Snapdragon Stadium', track_location = 'San Diego, CA', round = 2 WHERE id = 'race-2' AND series = 'supercross';
UPDATE races SET date = '2025-01-25T19:00:00Z', name = 'Anaheim 2', track_name = 'Angel Stadium', track_location = 'Anaheim, CA', round = 3 WHERE id = 'race-3' AND series = 'supercross';
UPDATE races SET date = '2025-02-01T19:00:00Z', name = 'Glendale', track_name = 'State Farm Stadium', track_location = 'Glendale, AZ', round = 4 WHERE id = 'race-4' AND series = 'supercross';
UPDATE races SET date = '2025-02-08T19:00:00Z', name = 'Tampa', track_name = 'Raymond James Stadium', track_location = 'Tampa, FL', round = 5 WHERE id = 'race-5' AND series = 'supercross';
UPDATE races SET date = '2025-02-15T19:00:00Z', name = 'Detroit', track_name = 'Ford Field', track_location = 'Detroit, MI', round = 6 WHERE id = 'race-6' AND series = 'supercross';
UPDATE races SET date = '2025-02-22T19:00:00Z', name = 'Arlington', track_name = 'AT&T Stadium', track_location = 'Arlington, TX', round = 7 WHERE id = 'race-7' AND series = 'supercross';
UPDATE races SET date = '2025-03-01T19:00:00Z', name = 'Daytona', track_name = 'Daytona International Speedway', track_location = 'Daytona Beach, FL', round = 8 WHERE id = 'race-8' AND series = 'supercross';
UPDATE races SET date = '2025-03-08T19:00:00Z', name = 'Indianapolis', track_name = 'Lucas Oil Stadium', track_location = 'Indianapolis, IN', round = 9 WHERE id = 'race-9' AND series = 'supercross';
UPDATE races SET date = '2025-03-29T19:00:00Z', name = 'Seattle', track_name = 'Lumen Field', track_location = 'Seattle, WA', round = 11 WHERE id = 'race-10' AND series = 'supercross';

-- Add missing Supercross Round 10: Birmingham (only if doesn't exist)
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
SELECT 'race-sx-10', 'Birmingham', 'supercross', 'Protective Stadium', 'Birmingham, AL', '2025-03-22T19:00:00Z', 10, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true
WHERE NOT EXISTS (SELECT 1 FROM races WHERE id = 'race-sx-10');

-- Update existing Supercross rounds 12-17 (if they exist from previous migration)
UPDATE races SET name = 'Foxborough', track_name = 'Gillette Stadium', track_location = 'Foxborough, MA', date = '2025-04-05T19:00:00Z', round = 12 WHERE id = 'race-sx-12';
UPDATE races SET name = 'Philadelphia', track_name = 'Lincoln Financial Field', track_location = 'Philadelphia, PA', date = '2025-04-12T19:00:00Z', round = 13 WHERE id = 'race-sx-13';
UPDATE races SET name = 'East Rutherford', track_name = 'MetLife Stadium', track_location = 'East Rutherford, NJ', date = '2025-04-19T19:00:00Z', round = 14 WHERE id = 'race-sx-14';
UPDATE races SET name = 'Pittsburgh', track_name = 'Acrisure Stadium', track_location = 'Pittsburgh, PA', date = '2025-04-26T19:00:00Z', round = 15 WHERE id = 'race-sx-15';
UPDATE races SET name = 'Denver', track_name = 'Empower Field at Mile High', track_location = 'Denver, CO', date = '2025-05-03T19:00:00Z', round = 16 WHERE id = 'race-sx-16';
UPDATE races SET name = 'Salt Lake City', track_name = 'Rice-Eccles Stadium', track_location = 'Salt Lake City, UT', date = '2025-05-10T19:00:00Z', round = 17 WHERE id = 'race-sx-17';

-- Insert only if they don't exist (in case migration wasn't run before)
INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
SELECT
  v.id,
  v.name,
  v.series,
  v.track_name,
  v.track_location,
  v.date::timestamptz,
  v.round,
  v.season_year,
  v.season_id::uuid,
  v.is_simulation
FROM (VALUES
  ('race-sx-12', 'Foxborough', 'supercross', 'Gillette Stadium', 'Foxborough, MA', '2025-04-05T19:00:00Z', 12, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564', true),
  ('race-sx-13', 'Philadelphia', 'supercross', 'Lincoln Financial Field', 'Philadelphia, PA', '2025-04-12T19:00:00Z', 13, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564', true),
  ('race-sx-14', 'East Rutherford', 'supercross', 'MetLife Stadium', 'East Rutherford, NJ', '2025-04-19T19:00:00Z', 14, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564', true),
  ('race-sx-15', 'Pittsburgh', 'supercross', 'Acrisure Stadium', 'Pittsburgh, PA', '2025-04-26T19:00:00Z', 15, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564', true),
  ('race-sx-16', 'Denver', 'supercross', 'Empower Field at Mile High', 'Denver, CO', '2025-05-03T19:00:00Z', 16, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564', true),
  ('race-sx-17', 'Salt Lake City', 'supercross', 'Rice-Eccles Stadium', 'Salt Lake City, UT', '2025-05-10T19:00:00Z', 17, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564', true)
) AS v(id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
WHERE NOT EXISTS (SELECT 1 FROM races WHERE races.id = v.id);

-- ========================================
-- STEP 2: Add missing Motocross rounds 6-11
-- ========================================

INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
VALUES
  ('race-mx-6', 'RedBud', 'motocross', 'RedBud MX Park', 'Buchanan, MI', '2025-07-05T10:00:00Z', 6, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true),
  ('race-mx-7', 'Spring Creek', 'motocross', 'Spring Creek MX Park', 'Millville, MN', '2025-07-12T10:00:00Z', 7, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true),
  ('race-mx-8', 'Washougal', 'motocross', 'Washougal MX Park', 'Washougal, WA', '2025-07-19T10:00:00Z', 8, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true),
  ('race-mx-9', 'Ironman', 'motocross', 'Ironman Raceway', 'Crawfordsville, IN', '2025-08-09T10:00:00Z', 9, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true),
  ('race-mx-10', 'Unadilla', 'motocross', 'Unadilla MX', 'New Berlin, NY', '2025-08-16T10:00:00Z', 10, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true),
  ('race-mx-11', 'Budds Creek', 'motocross', 'Budds Creek MX Park', 'Mechanicsville, MD', '2025-08-23T10:00:00Z', 11, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true);

-- ========================================
-- STEP 3: Add Championship rounds 1-3
-- ========================================

INSERT INTO races (id, name, series, track_name, track_location, date, round, season_year, season_id, is_simulation)
VALUES
  ('race-smx-1', 'SMX Playoff 1 - Concord', 'championship', 'zMAX Dragway', 'Concord, NC', '2025-09-06T19:00:00Z', 1, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true),
  ('race-smx-2', 'SMX Playoff 2 - St. Louis', 'championship', 'The Dome at America''s Center', 'St. Louis, MO', '2025-09-13T19:00:00Z', 2, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true),
  ('race-smx-3', 'SMX World Championship Final', 'championship', 'The Strip at Las Vegas Motor Speedway', 'Las Vegas, NV', '2025-09-20T19:00:00Z', 3, 2025, 'c51e402c-e8ab-4b7b-a2fd-0a0bada4a564'::uuid, true);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check Supercross (should be 17 rounds)
SELECT 'SUPERCROSS' as series, COUNT(*) as total_rounds FROM races WHERE series = 'supercross';
SELECT id, name, round, date, track_name FROM races WHERE series = 'supercross' ORDER BY round;

-- Check Motocross (should be 11 rounds)
SELECT 'MOTOCROSS' as series, COUNT(*) as total_rounds FROM races WHERE series = 'motocross';
SELECT id, name, round, date, track_name FROM races WHERE series = 'motocross' ORDER BY round;

-- Check Championship (should be 3 rounds)
SELECT 'CHAMPIONSHIP' as series, COUNT(*) as total_rounds FROM races WHERE series = 'championship';
SELECT id, name, round, date, track_name FROM races WHERE series = 'championship' ORDER BY round;

-- Overall summary
SELECT series, COUNT(*) as total_rounds FROM races GROUP BY series ORDER BY series;
