-- Migration: Add Seasons and Demo Mode Support
-- Description: Adds seasons table, links races to seasons, enables 2025 replay mode
-- Date: 2025-10-23
-- Purpose: Support for historical 2025 season replay AND live 2026 predictions

-- ============================================================================
-- PART 1: Create seasons table
-- ============================================================================

CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('upcoming', 'active', 'demo', 'completed')),
  is_simulation BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE seasons IS 'Racing seasons (e.g., 2025 demo, 2026 live)';
COMMENT ON COLUMN seasons.status IS '
  upcoming  = Not started yet
  active    = Current live season
  demo      = Historical season for practice/replay
  completed = Finished season';
COMMENT ON COLUMN seasons.is_simulation IS 'true = demo/practice mode, false = live season';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seasons_year ON seasons(year);
CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
CREATE INDEX IF NOT EXISTS idx_seasons_is_simulation ON seasons(is_simulation);

-- ============================================================================
-- PART 2: Add season context to races table
-- ============================================================================

ALTER TABLE races
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS actual_results JSONB,
ADD COLUMN IF NOT EXISTS results_revealed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN races.season_id IS 'Links race to a specific season';
COMMENT ON COLUMN races.is_simulation IS 'true = demo mode (2025 replay), false = live race';
COMMENT ON COLUMN races.actual_results IS 'Stores real results for demo mode reveals. Format: {"450": [{"riderId": "...", "position": 1}, ...], "250": [...]}';
COMMENT ON COLUMN races.results_revealed_at IS 'When results were revealed to users (for demo mode tracking)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_races_season_id ON races(season_id);
CREATE INDEX IF NOT EXISTS idx_races_is_simulation ON races(is_simulation);
CREATE INDEX IF NOT EXISTS idx_races_season_date ON races(season_id, date);

-- ============================================================================
-- PART 3: Add season context to predictions table
-- ============================================================================

ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN predictions.season_id IS 'Which season this prediction belongs to';
COMMENT ON COLUMN predictions.is_simulation IS 'true = demo mode prediction, false = live prediction';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_predictions_season_id ON predictions(season_id);
CREATE INDEX IF NOT EXISTS idx_predictions_is_simulation ON predictions(is_simulation);
CREATE INDEX IF NOT EXISTS idx_predictions_user_season ON predictions(user_id, season_id);

-- ============================================================================
-- PART 4: Create default seasons
-- ============================================================================

-- Insert 2025 demo season
INSERT INTO seasons (year, name, description, status, is_simulation, start_date, end_date)
VALUES (
  2025,
  '2025 SuperMotocross World Championship',
  'Complete 2025 season for practice and skill-building. Predict historic races to prepare for 2026!',
  'demo',
  true,
  '2025-01-07'::timestamp,
  '2025-10-12'::timestamp
)
ON CONFLICT (year) DO NOTHING;

-- Insert 2026 live season
INSERT INTO seasons (year, name, description, status, is_simulation, start_date, end_date)
VALUES (
  2026,
  '2026 SuperMotocross World Championship',
  'Live 2026 season - your predictions count for real!',
  'upcoming',
  false,
  '2026-01-11'::timestamp,
  '2026-10-17'::timestamp
)
ON CONFLICT (year) DO NOTHING;

-- ============================================================================
-- PART 5: Update existing data (if any races exist)
-- ============================================================================

-- Link any existing races to 2025 demo season
UPDATE races r
SET
  season_id = s.id,
  is_simulation = true
FROM seasons s
WHERE s.year = 2025
  AND r.season_id IS NULL
  AND EXTRACT(YEAR FROM r.date) = 2025;

-- Link any existing predictions to 2025 demo season
UPDATE predictions p
SET
  season_id = r.season_id,
  is_simulation = r.is_simulation
FROM races r
WHERE p.race_id = r.id
  AND p.season_id IS NULL;

-- ============================================================================
-- PART 6: Create helper functions
-- ============================================================================

-- Function to get active season
CREATE OR REPLACE FUNCTION get_active_season()
RETURNS UUID AS $$
  SELECT id FROM seasons WHERE status = 'active' LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to get demo season
CREATE OR REPLACE FUNCTION get_demo_season()
RETURNS UUID AS $$
  SELECT id FROM seasons WHERE status = 'demo' LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for seasons table
DROP TRIGGER IF EXISTS update_seasons_updated_at ON seasons;
CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 7: Create views for easier querying
-- ============================================================================

-- View for demo (2025) races only
CREATE OR REPLACE VIEW demo_races AS
SELECT r.*, s.year, s.name as season_name
FROM races r
JOIN seasons s ON r.season_id = s.id
WHERE s.is_simulation = true
ORDER BY r.date;

-- View for live races only
CREATE OR REPLACE VIEW live_races AS
SELECT r.*, s.year, s.name as season_name
FROM races r
JOIN seasons s ON r.season_id = s.id
WHERE s.is_simulation = false
ORDER BY r.date;

-- ============================================================================
-- PART 8: Row Level Security (RLS) policies
-- ============================================================================

-- Enable RLS on seasons table
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Everyone can read seasons
CREATE POLICY "Seasons are viewable by everyone"
  ON seasons FOR SELECT
  USING (true);

-- Only admins can modify seasons (you'll need to add admin role separately)
-- For now, leaving this open. TODO: Add admin role and restrict

-- ============================================================================
-- DONE!
-- ============================================================================

-- Verification query (uncomment to test):
-- SELECT * FROM seasons ORDER BY year;
