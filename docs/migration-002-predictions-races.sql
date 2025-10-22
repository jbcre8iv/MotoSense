-- MotoSense Predictions and Races Migration
-- Run this in Supabase SQL Editor after migration-001

-- 1. Races table
CREATE TABLE races (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  series TEXT NOT NULL,
  track_name TEXT NOT NULL,
  track_location TEXT NOT NULL,
  date TEXT NOT NULL,
  round INTEGER NOT NULL,
  season_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_races_date ON races(date);
CREATE INDEX idx_races_series ON races(series);
CREATE INDEX idx_races_round ON races(round, season_year);

-- 2. Predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  race_id TEXT REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  predictions JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, race_id)
);

CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_race ON predictions(race_id);
CREATE INDEX idx_predictions_submitted ON predictions(submitted_at DESC);

-- Enable Row Level Security
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Races policies (everyone can view races)
CREATE POLICY "Races are viewable by everyone"
  ON races FOR SELECT USING (true);

-- Predictions policies
CREATE POLICY "Users can view own predictions"
  ON predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions"
  ON predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions"
  ON predictions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Predictions and races tables created successfully!';
END $$;
