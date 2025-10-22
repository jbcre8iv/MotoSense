-- ============================================================================
-- MIGRATION 007: PUSH NOTIFICATIONS
-- ============================================================================
-- This migration adds support for push notifications
-- ============================================================================

-- Add push_token column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;

-- Add notification_settings column to store user preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "race_reminders": true,
  "achievements": true,
  "friend_activity": true,
  "results_available": true,
  "streak_reminders": true,
  "challenges": true
}'::jsonb;

-- Verify
DO $$
DECLARE
  push_token_exists BOOLEAN;
  notification_settings_exists BOOLEAN;
BEGIN
  -- Check push_token column
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'push_token'
  ) INTO push_token_exists;

  -- Check notification_settings column
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'notification_settings'
  ) INTO notification_settings_exists;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'NOTIFICATION MIGRATION RESULTS:';
  RAISE NOTICE '==========================================';

  IF push_token_exists THEN
    RAISE NOTICE '✅ profiles.push_token column exists';
  ELSE
    RAISE WARNING '❌ profiles.push_token column NOT FOUND';
  END IF;

  IF notification_settings_exists THEN
    RAISE NOTICE '✅ profiles.notification_settings column exists';
  ELSE
    RAISE WARNING '❌ profiles.notification_settings column NOT FOUND';
  END IF;

  RAISE NOTICE '==========================================';
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
