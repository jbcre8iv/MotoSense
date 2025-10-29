-- Add Race Progression System for Beta Testing
-- Run this in the Supabase SQL Editor

-- Add new columns to races table
ALTER TABLE races
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'open', 'completed')),
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_progress_hours INTEGER DEFAULT 48;

-- Add index for querying by status
CREATE INDEX IF NOT EXISTS races_status_idx ON races(status);

-- Add index for auto-progression queries
CREATE INDEX IF NOT EXISTS races_closes_at_idx ON races(closes_at) WHERE status = 'open';

-- Set all existing races to 'upcoming' status
UPDATE races SET status = 'upcoming' WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN races.status IS 'Current state: upcoming (not available), open (predictions active), completed (results revealed)';
COMMENT ON COLUMN races.opened_at IS 'Timestamp when round was opened for predictions';
COMMENT ON COLUMN races.closes_at IS 'Timestamp when round auto-closes (opened_at + auto_progress_hours)';
COMMENT ON COLUMN races.auto_progress_hours IS 'Hours until auto-progression (default 48)';
