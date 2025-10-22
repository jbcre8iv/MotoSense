-- ============================================================================
-- ADD MISSING calculated_at COLUMN TO prediction_scores
-- ============================================================================
-- This adds the calculated_at column that the app expects for sorting scores
-- ============================================================================

-- Add calculated_at column (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'prediction_scores'
    AND column_name = 'calculated_at'
  ) THEN
    ALTER TABLE prediction_scores ADD COLUMN calculated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added calculated_at column to prediction_scores table';
  ELSE
    RAISE NOTICE 'ℹ️ calculated_at column already exists';
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
DO $$
DECLARE
  calculated_at_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'prediction_scores'
    AND column_name = 'calculated_at'
  ) INTO calculated_at_exists;

  RAISE NOTICE '==========================================';
  IF calculated_at_exists THEN
    RAISE NOTICE '✅ prediction_scores.calculated_at column exists';
  ELSE
    RAISE WARNING '❌ prediction_scores.calculated_at column NOT FOUND';
  END IF;
  RAISE NOTICE '✅ Schema cache reloaded';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Next step: Reload your app';
  RAISE NOTICE '==========================================';
END $$;
