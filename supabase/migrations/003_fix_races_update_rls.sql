-- Migration: Fix RLS policy for races table UPDATE operations
-- Issue: Users can INSERT races but cannot UPDATE them (needed for round progression)
-- Solution: Add UPDATE policy for authenticated users

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to update races" ON public.races;

-- Create policy allowing authenticated users to UPDATE races
CREATE POLICY "Allow authenticated users to update races"
ON public.races
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify all policies are in place
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for races table:';
  RAISE NOTICE '- SELECT: Allow everyone to view races';
  RAISE NOTICE '- INSERT: Allow authenticated users to create races';
  RAISE NOTICE '- UPDATE: Allow authenticated users to update races (NEW)';
END $$;
