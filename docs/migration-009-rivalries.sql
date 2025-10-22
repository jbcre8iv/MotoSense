-- Migration 009: Rivalries System
-- Add support for head-to-head user rivalries and challenge tracking

-- Create rivalries table
CREATE TABLE IF NOT EXISTS rivalries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rival_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- Ensure unique rivalry pairs (prevent duplicates)
  CONSTRAINT unique_rivalry UNIQUE (user_id, rival_id),
  -- Prevent self-rivalries
  CONSTRAINT no_self_rivalry CHECK (user_id != rival_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rivalries_user_id ON rivalries(user_id);
CREATE INDEX IF NOT EXISTS idx_rivalries_rival_id ON rivalries(rival_id);
CREATE INDEX IF NOT EXISTS idx_rivalries_status ON rivalries(status);

-- Create rivalry_stats table for tracking head-to-head records
CREATE TABLE IF NOT EXISTS rivalry_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rivalry_id UUID NOT NULL REFERENCES rivalries(id) ON DELETE CASCADE,
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  user_score INTEGER DEFAULT 0,
  rival_score INTEGER DEFAULT 0,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  result TEXT CHECK (result IN ('win', 'loss', 'tie')),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one stat per rivalry per race
  CONSTRAINT unique_rivalry_race UNIQUE (rivalry_id, race_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rivalry_stats_rivalry_id ON rivalry_stats(rivalry_id);
CREATE INDEX IF NOT EXISTS idx_rivalry_stats_race_id ON rivalry_stats(race_id);
CREATE INDEX IF NOT EXISTS idx_rivalry_stats_winner_id ON rivalry_stats(winner_id);

-- Row Level Security
ALTER TABLE rivalries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rivalry_stats ENABLE ROW LEVEL SECURITY;

-- Users can read their own rivalries and rivalries where they are the rival
CREATE POLICY "Users can read their rivalries"
  ON rivalries
  FOR SELECT
  USING (user_id = auth.uid() OR rival_id = auth.uid());

-- Users can create rivalries where they are the user
CREATE POLICY "Users can create rivalries"
  ON rivalries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own rivalries
CREATE POLICY "Users can update their rivalries"
  ON rivalries
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own rivalries
CREATE POLICY "Users can delete their rivalries"
  ON rivalries
  FOR DELETE
  USING (user_id = auth.uid());

-- Users can read rivalry stats for their rivalries
CREATE POLICY "Users can read rivalry stats"
  ON rivalry_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rivalries
      WHERE rivalries.id = rivalry_stats.rivalry_id
        AND (rivalries.user_id = auth.uid() OR rivalries.rival_id = auth.uid())
    )
  );

-- System can insert rivalry stats (calculated automatically)
CREATE POLICY "System can insert rivalry stats"
  ON rivalry_stats
  FOR INSERT
  WITH CHECK (true);

-- Create view for rivalry summaries
CREATE OR REPLACE VIEW rivalry_summaries AS
SELECT
  r.id as rivalry_id,
  r.user_id,
  r.rival_id,
  r.status,
  r.created_at,
  p1.username as user_username,
  p1.avatar_url as user_avatar,
  p2.username as rival_username,
  p2.avatar_url as rival_avatar,
  COUNT(rs.id) as total_races,
  COUNT(CASE WHEN rs.result = 'win' THEN 1 END) as wins,
  COUNT(CASE WHEN rs.result = 'loss' THEN 1 END) as losses,
  COUNT(CASE WHEN rs.result = 'tie' THEN 1 END) as ties,
  SUM(rs.user_score) as total_user_score,
  SUM(rs.rival_score) as total_rival_score,
  MAX(rs.calculated_at) as last_competed
FROM rivalries r
JOIN profiles p1 ON r.user_id = p1.id
JOIN profiles p2 ON r.rival_id = p2.id
LEFT JOIN rivalry_stats rs ON r.id = rs.rivalry_id
GROUP BY r.id, r.user_id, r.rival_id, r.status, r.created_at,
         p1.username, p1.avatar_url, p2.username, p2.avatar_url;

-- Create function to calculate rivalry stats after race results
CREATE OR REPLACE FUNCTION calculate_rivalry_stats(p_race_id UUID)
RETURNS void AS $$
DECLARE
  v_rivalry RECORD;
  v_user_score INTEGER;
  v_rival_score INTEGER;
  v_winner_id UUID;
  v_result TEXT;
BEGIN
  -- Loop through all active rivalries
  FOR v_rivalry IN
    SELECT id, user_id, rival_id
    FROM rivalries
    WHERE status = 'active'
  LOOP
    -- Get scores for both users
    SELECT points_earned INTO v_user_score
    FROM predictions
    WHERE user_id = v_rivalry.user_id AND race_id = p_race_id;

    SELECT points_earned INTO v_rival_score
    FROM predictions
    WHERE user_id = v_rivalry.rival_id AND race_id = p_race_id;

    -- Skip if either user didn't make a prediction
    IF v_user_score IS NULL OR v_rival_score IS NULL THEN
      CONTINUE;
    END IF;

    -- Determine winner and result
    IF v_user_score > v_rival_score THEN
      v_winner_id := v_rivalry.user_id;
      v_result := 'win';
    ELSIF v_user_score < v_rival_score THEN
      v_winner_id := v_rivalry.rival_id;
      v_result := 'loss';
    ELSE
      v_winner_id := NULL;
      v_result := 'tie';
    END IF;

    -- Insert or update rivalry stat
    INSERT INTO rivalry_stats (
      rivalry_id, race_id, user_score, rival_score, winner_id, result
    ) VALUES (
      v_rivalry.id, p_race_id, v_user_score, v_rival_score, v_winner_id, v_result
    )
    ON CONFLICT (rivalry_id, race_id)
    DO UPDATE SET
      user_score = EXCLUDED.user_score,
      rival_score = EXCLUDED.rival_score,
      winner_id = EXCLUDED.winner_id,
      result = EXCLUDED.result,
      calculated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON rivalry_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rivalries TO authenticated;
GRANT SELECT, INSERT ON rivalry_stats TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE rivalries IS 'Tracks head-to-head rivalries between users';
COMMENT ON TABLE rivalry_stats IS 'Stores historical head-to-head results for each race';
COMMENT ON VIEW rivalry_summaries IS 'Aggregated rivalry statistics with win/loss records';
COMMENT ON FUNCTION calculate_rivalry_stats IS 'Calculate rivalry stats after race results are finalized';
