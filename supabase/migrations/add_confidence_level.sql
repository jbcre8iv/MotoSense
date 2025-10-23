-- Migration: Add confidence_level column to predictions table
-- Description: Adds support for 1-5 star confidence levels on predictions
-- Date: 2025-10-23

-- Add confidence_level column to predictions table
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS confidence_level INTEGER DEFAULT 3 CHECK (confidence_level >= 1 AND confidence_level <= 5);

-- Add comment explaining the column
COMMENT ON COLUMN predictions.confidence_level IS
  'User confidence level (1-5):
   1 = Very Unsure (0.5x multiplier, 50% points)
   2 = Somewhat Unsure (0.75x multiplier, 75% points)
   3 = Neutral (1.0x multiplier, 100% points) - DEFAULT
   4 = Confident (1.5x multiplier, 150% points)
   5 = Very Confident (2.0x multiplier, 200% points)';

-- Create index for confidence level queries (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_predictions_confidence_level
  ON predictions(confidence_level);

-- Update any existing NULL values to default (3)
UPDATE predictions
SET confidence_level = 3
WHERE confidence_level IS NULL;
