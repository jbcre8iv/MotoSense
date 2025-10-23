-- Migration 009: Activity Feed System
-- Creates tables and functions for tracking user activity and social updates
-- Author: MotoSense Development Team
-- Date: January 2025

-- ============================================================================
-- ACTIVITY FEED TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'prediction_made',
    'race_completed',
    'achievement_unlocked',
    'group_joined',
    'rivalry_created',
    'challenge_won',
    'rank_improved',
    'perfect_prediction'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  related_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  related_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  points_earned INTEGER DEFAULT 0,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_activity_type ON activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_is_read ON activity_feed(is_read);
CREATE INDEX IF NOT EXISTS idx_activity_feed_related_race ON activity_feed(related_race_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_related_group ON activity_feed(related_group_id);

-- Composite index for user's unread activities
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_unread
  ON activity_feed(user_id, is_read, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Users can read their own activities
CREATE POLICY "Users can read own activity feed"
  ON activity_feed
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own activities as read
CREATE POLICY "Users can update own activity read status"
  ON activity_feed
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can insert activity for any user (via service role)
CREATE POLICY "Service can insert activity"
  ON activity_feed
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create prediction activity
CREATE OR REPLACE FUNCTION create_prediction_activity(
  p_user_id UUID,
  p_race_id UUID,
  p_race_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_feed (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create race completion activity
CREATE OR REPLACE FUNCTION create_race_completion_activity(
  p_user_id UUID,
  p_race_id UUID,
  p_race_name TEXT,
  p_points_earned INTEGER,
  p_rank INTEGER
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
  v_description TEXT;
BEGIN
  v_description := 'You earned ' || p_points_earned || ' points and finished #' || p_rank;

  INSERT INTO activity_feed (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create achievement activity
CREATE OR REPLACE FUNCTION create_achievement_activity(
  p_user_id UUID,
  p_achievement_name TEXT,
  p_achievement_description TEXT,
  p_achievement_icon TEXT
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_feed (
    user_id,
    activity_type,
    title,
    description,
    metadata
  ) VALUES (
    p_user_id,
    'achievement_unlocked',
    'Achievement Unlocked: ' || p_achievement_name,
    p_achievement_description,
    jsonb_build_object(
      'name', p_achievement_name,
      'icon', p_achievement_icon
    )
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create rivalry activity
CREATE OR REPLACE FUNCTION create_rivalry_activity(
  p_user_id UUID,
  p_rival_id UUID,
  p_rival_username TEXT
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_feed (
    user_id,
    activity_type,
    title,
    description,
    related_user_id,
    metadata
  ) VALUES (
    p_user_id,
    'rivalry_created',
    'New Rivalry',
    'You started a rivalry with ' || p_rival_username,
    p_rival_id,
    jsonb_build_object('rival_username', p_rival_username)
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up old activity feed entries (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_activities() RETURNS void AS $$
BEGIN
  DELETE FROM activity_feed
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION create_prediction_activity TO authenticated;
GRANT EXECUTE ON FUNCTION create_race_completion_activity TO authenticated;
GRANT EXECUTE ON FUNCTION create_achievement_activity TO authenticated;
GRANT EXECUTE ON FUNCTION create_rivalry_activity TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Migration 009 complete: Activity Feed System ready
