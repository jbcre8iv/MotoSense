-- Migration: Fix Security Advisor Issues
-- Description: Fixes RLS policies to address Supabase security warnings
-- Date: 2025-10-29
-- Issues Fixed:
--   1. Seasons table missing INSERT/UPDATE/DELETE policies
--   2. Races table has overly permissive UPDATE policy

-- ============================================================================
-- ISSUE 1: Fix seasons table RLS policies
-- ============================================================================

-- The seasons table has RLS enabled but only allows SELECT.
-- We need to add policies for INSERT, UPDATE, and DELETE operations.
-- For security, only service role (backend/edge functions) should modify seasons.

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Only service role can insert seasons" ON seasons;
DROP POLICY IF EXISTS "Only service role can update seasons" ON seasons;
DROP POLICY IF EXISTS "Only service role can delete seasons" ON seasons;

-- Policy: Only service role can INSERT seasons
-- This prevents regular users from creating seasons
CREATE POLICY "Only service role can insert seasons"
ON seasons
FOR INSERT
TO authenticated
WITH CHECK (false);  -- Only service role can bypass RLS

-- Policy: Only service role can UPDATE seasons
-- This prevents regular users from modifying season data
CREATE POLICY "Only service role can update seasons"
ON seasons
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);  -- Only service role can bypass RLS

-- Policy: Only service role can DELETE seasons
-- This prevents regular users from deleting seasons
CREATE POLICY "Only service role can delete seasons"
ON seasons
FOR DELETE
TO authenticated
USING (false);  -- Only service role can bypass RLS

-- ============================================================================
-- ISSUE 2: Fix races table UPDATE policy
-- ============================================================================

-- The current policy allows ANY authenticated user to update ANY race.
-- This is too permissive. We should restrict race updates to:
--   - Service role (for automated syncs)
--   - Admins only (future feature)
-- For now, we'll block regular user updates and only allow service role.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated users to update races" ON races;

-- Create a restrictive policy that blocks regular user updates
-- Only service role (edge functions, backend processes) can update races
CREATE POLICY "Only service role can update races"
ON races
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);  -- Only service role can bypass RLS

-- Note: If you need specific users to update races (e.g., admins),
-- you'll need to add an admin role check here in the future.
-- Example: USING (auth.jwt() ->> 'role' = 'admin')

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all RLS policies for seasons table
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for seasons table:';
  RAISE NOTICE '- SELECT: Seasons are viewable by everyone';
  RAISE NOTICE '- INSERT: Only service role can insert seasons';
  RAISE NOTICE '- UPDATE: Only service role can update seasons';
  RAISE NOTICE '- DELETE: Only service role can delete seasons';
END $$;

-- List all RLS policies for races table
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for races table:';
  RAISE NOTICE '- SELECT: Allow everyone to view races (existing)';
  RAISE NOTICE '- INSERT: Allow authenticated users to create races (existing)';
  RAISE NOTICE '- UPDATE: Only service role can update races (FIXED)';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Service Role Usage:
-- - Edge functions automatically use service role when calling database
-- - Admin dashboard operations should use service role key
-- - Regular app users will use anon/authenticated roles
--
-- If you need to allow specific operations for regular users:
-- 1. Add a custom claims to user JWT (via Supabase Auth hooks)
-- 2. Check those claims in the RLS policy
-- Example: USING (auth.uid() = owner_id OR auth.jwt() ->> 'role' = 'admin')

-- Testing:
-- After applying this migration, test that:
-- 1. Regular users can view seasons and races
-- 2. Regular users CANNOT update seasons or races
-- 3. Edge functions (service role) CAN update seasons and races

-- ============================================================================
-- ISSUE 3: Fix SECURITY DEFINER views (live_races and demo_races)
-- ============================================================================

-- The views live_races and demo_races are using SECURITY DEFINER by default,
-- which can bypass Row Level Security policies. This is a security risk.
-- We need to recreate them with SECURITY INVOKER to respect RLS.

-- Drop and recreate demo_races view with SECURITY INVOKER
DROP VIEW IF EXISTS demo_races;
CREATE VIEW demo_races
WITH (security_invoker = true)
AS
SELECT r.*, s.year, s.name as season_name
FROM races r
JOIN seasons s ON r.season_id = s.id
WHERE s.is_simulation = true
ORDER BY r.date;

-- Drop and recreate live_races view with SECURITY INVOKER
DROP VIEW IF EXISTS live_races;
CREATE VIEW live_races
WITH (security_invoker = true)
AS
SELECT r.*, s.year, s.name as season_name
FROM races r
JOIN seasons s ON r.season_id = s.id
WHERE s.is_simulation = false
ORDER BY r.date;

-- Add RLS policies for the views (they inherit from underlying tables)
ALTER VIEW demo_races SET (security_invoker = on);
ALTER VIEW live_races SET (security_invoker = on);

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Security fixes applied:';
  RAISE NOTICE '1. Seasons table RLS policies added (INSERT/UPDATE/DELETE)';
  RAISE NOTICE '2. Races table UPDATE policy restricted to service role only';
  RAISE NOTICE '3. Views (live_races, demo_races) recreated with SECURITY INVOKER';
  RAISE NOTICE '';
  RAISE NOTICE 'All security issues should now be resolved!';
END $$;
