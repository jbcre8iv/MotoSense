# Confidence & Scoring System Integration Guide

## Overview

This guide explains the complete confidence-based prediction system and advanced scoring engine that have been implemented in MotoSense.

## What's Been Built

### 1. **Confidence System** (Complete ✅)

#### Components
- **`src/utils/confidenceUtils.ts`** - Confidence calculations and utilities
- **`src/components/ConfidenceSelector.tsx`** - Interactive UI for selecting confidence levels
- **`src/types/index.ts`** - Type definitions for ConfidenceLevel (1-5)

#### Features
- 5-level confidence system with variable multipliers:
  - Level 1 (Very Unsure): 0.5x multiplier - 50% points
  - Level 2 (Somewhat Unsure): 0.75x multiplier - 75% points
  - Level 3 (Neutral): 1.0x multiplier - 100% points (default)
  - Level 4 (Confident): 1.5x multiplier - 150% points
  - Level 5 (Very Confident): 2.0x multiplier - 200% points

- Visual indicators:
  - Emoji stars: P (1 star) to PPPPP (5 stars)
  - Color coding: Gray → Cyan → Orange → Red (by risk level)
  - Real-time point calculation preview
  - Risk level descriptions

#### Integration Status
- ✅ Integrated into `InlinePredictionCard` for prediction flow
- ✅ Saved to database with predictions (`confidence_level` field)
- ✅ Display on existing predictions (view mode)
- ⏳ Database column needs to be added (see Database Migration section)

---

### 2. **Advanced Scoring Engine** (Complete ✅)

#### Components
- **`src/services/scoringService.ts`** - Comprehensive scoring calculation engine
- **`src/components/ScoreBreakdown.tsx`** - Visual score breakdown display

#### Scoring Structure

**Base Points (by position accuracy):**
- Exact match: 100 points
- One position off: 50 points
- Two positions off: 25 points
- Three positions off: 10 points
- Four+ positions off: 5 points

**Bonuses & Multipliers:**
- **Confidence Multiplier**: 0.5x to 2.0x (applied to base points)
- **Perfect Prediction Bonus**: +500 points (all 5 positions exact)
- **Streak Multiplier**: Up to 3.0x additional multiplier
  - 3 days: 1.1x
  - 7 days: 1.25x
  - 14 days: 1.5x
  - 30 days: 2.0x
  - 60 days: 2.5x
  - 100+ days: 3.0x

#### Calculation Flow
```
1. Calculate base points for each rider prediction
2. Apply confidence multiplier → Subtotal
3. Check for perfect prediction → Add +500 if perfect
4. Apply streak multiplier → Final total
```

#### Key Functions

**`calculatePredictionScore()`**
- Complete score calculation with all bonuses
- Returns detailed `PredictionScore` object with full breakdown

**`calculateRiderScore()`**
- Individual rider prediction scoring
- Returns position diff, base points, and final points

**`getPerformanceRating()`**
- Performance badge based on accuracy
- Returns rating, color, and emoji

**`compareResults()`**
- Analytics on prediction accuracy
- Returns counts of exact matches, close calls, etc.

---

### 3. **Visual Components** (Complete ✅)

#### ConfidenceSelector
- Interactive 5-button selector
- Real-time point calculation
- Risk level visualization
- Pro tips and guidance

#### ScoreBreakdown
- Expandable score display card
- Individual rider scoring details
- Step-by-step calculation visualization
- Confidence and streak bonus display
- Perfect prediction badge
- Color-coded accuracy indicators

---

## Integration Steps

### Step 1: Database Migration

Add the `confidence_level` column to your Supabase `predictions` table:

```sql
-- Add confidence_level column to predictions table
ALTER TABLE predictions
ADD COLUMN confidence_level INTEGER DEFAULT 3 CHECK (confidence_level >= 1 AND confidence_level <= 5);

-- Add comment explaining the column
COMMENT ON COLUMN predictions.confidence_level IS
  'User confidence level (1-5): 1=Very Unsure (0.5x), 2=Somewhat Unsure (0.75x), 3=Neutral (1.0x), 4=Confident (1.5x), 5=Very Confident (2.0x)';
```

### Step 2: Update Results Service (Optional)

You have two options for integrating the new scoring system:

#### Option A: Replace Existing Scoring
Replace the simple scoring in `src/services/resultsService.ts` with the advanced scoring system:

```typescript
import { calculatePredictionScore } from './scoringService';
import { getPredictionForRace } from './predictionsService';

// In calculateScoresForRace function:
const userPredictions = await getPredictionForRace(userId, raceId);
if (!userPredictions) continue;

// Get user's current streak
const userProfile = await getUserProfile(userId);

// Calculate score with new system
const score = calculatePredictionScore(
  raceId,
  userId,
  Object.entries(userPredictions.predictions).map(([pos, riderId]) => ({
    riderId,
    predictedPosition: parseInt(pos)
  })),
  actualResults.map(r => ({ riderId: r.rider_id, position: r.position })),
  userPredictions.confidence_level,
  userProfile.currentStreak
);

// Save to database
await supabase.from('prediction_scores').upsert({
  user_id: userId,
  race_id: raceId,
  points_earned: score.totalPoints,
  exact_matches: score.riderScores.filter(r => r.positionDiff === 0).length,
  // ... additional fields
});
```

#### Option B: Parallel Systems (Recommended During Transition)
Keep both systems running:
- Old system: Continue using for existing data/backwards compatibility
- New system: Use for new predictions with confidence levels
- Gradually migrate old predictions to new scoring

### Step 3: Update Results Screen

Replace the simple score display in `ResultsScreen.tsx` with the new `ScoreBreakdown` component:

```typescript
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { calculatePredictionScore } from '../services/scoringService';
import { useAuth } from '../contexts/AuthContext';

// In the component:
const { profile } = useAuth(); // Get user profile for streak

// Calculate detailed score
const detailedScore = useMemo(() => {
  if (!existingPrediction || !results.length || !profile) return null;

  return calculatePredictionScore(
    race.id,
    user.id,
    Object.entries(existingPrediction.predictions).map(([pos, riderId]) => ({
      riderId,
      predictedPosition: parseInt(pos)
    })),
    results.map(r => ({ riderId: r.rider_id, position: r.position })),
    existingPrediction.confidence_level,
    profile.currentStreak
  );
}, [existingPrediction, results, profile]);

// Replace the old score section with:
{detailedScore && (
  <ScoreBreakdown score={detailedScore} showDetails={true} />
)}
```

### Step 4: Update Points Calculation Throughout App

Update any components that display or calculate points to use the confidence-aware functions:

```typescript
import { calculateDisplayPoints } from '../services/scoringService';

// When showing potential points:
const { totalPoints, breakdown } = calculateDisplayPoints(
  basePoints,
  selectedConfidenceLevel,
  userStreakDays
);
```

---

## Testing

### 1. Test Confidence Selection
1. Navigate to an upcoming race
2. Click "Make Prediction"
3. Select all 5 riders
4. Adjust confidence level slider
5. Observe point calculation changes
6. Submit and verify confidence is saved

### 2. Test Score Calculation
1. As admin, enter race results
2. Navigate to Results screen
3. Expand your prediction
4. Verify score breakdown shows:
   - Base points for each rider
   - Confidence multiplier applied
   - Streak bonus (if applicable)
   - Perfect prediction bonus (if applicable)
   - Correct total

### 3. Test Streak Integration
1. Make predictions on consecutive days
2. Check that streak counter increments
3. Verify streak bonus appears in score breakdown
4. Confirm correct multiplier applied

---

## Database Schema

### New/Modified Tables

#### `predictions` table
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  race_id TEXT NOT NULL,
  predictions JSONB NOT NULL, -- {1: "rider_id", 2: "rider_id", ...}
  confidence_level INTEGER DEFAULT 3 CHECK (confidence_level >= 1 AND confidence_level <= 5),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, race_id)
);
```

#### `prediction_scores` table (if using new scoring system)
```sql
CREATE TABLE prediction_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  race_id TEXT NOT NULL,
  base_points INTEGER NOT NULL,
  confidence_multiplier DECIMAL(3,2) NOT NULL,
  confidence_bonus INTEGER NOT NULL,
  subtotal_after_confidence INTEGER NOT NULL,
  streak_days INTEGER DEFAULT 0,
  streak_multiplier DECIMAL(3,2) DEFAULT 1.0,
  streak_bonus INTEGER DEFAULT 0,
  perfect_prediction_bonus INTEGER DEFAULT 0,
  total_points INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  exact_matches INTEGER NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, race_id)
);
```

---

## API/Service Reference

### Confidence Utils
```typescript
// Get multiplier for a confidence level
getConfidenceMultiplier(level?: ConfidenceLevel): number

// Calculate points with confidence applied
calculateConfidencePoints(basePoints: number, level?: ConfidenceLevel): number

// Get visual representation
getConfidenceEmoji(level?: ConfidenceLevel): string
getConfidenceColor(level?: ConfidenceLevel): string

// Format for display
formatConfidenceLevel(level?: ConfidenceLevel): string
getConfidenceBonus(level?: ConfidenceLevel): string

// Get recommended level based on user performance
getRecommendedConfidence(accuracy: number, streak: number): ConfidenceLevel
```

### Scoring Service
```typescript
// Calculate complete score with all bonuses
calculatePredictionScore(
  raceId: string,
  userId: string,
  predictions: Array<{riderId: string, predictedPosition: number}>,
  actualResults: Array<{riderId: string, position: number}>,
  confidenceLevel?: ConfidenceLevel,
  streakDays?: number
): PredictionScore

// Calculate individual rider score
calculateRiderScore(
  riderId: string,
  predicted: number,
  actual: number,
  confidence?: ConfidenceLevel
): RiderScore

// Get performance rating
getPerformanceRating(accuracy: number): {
  rating: string,
  color: string,
  emoji: string
}

// Compare predictions vs results
compareResults(predictions, actualResults): {
  exactMatches: number,
  oneOff: number,
  twoOff: number,
  threeOrMore: number,
  notInTop5: number
}
```

---

## Future Enhancements

### Potential Additions
1. **Confidence Analytics**
   - Track accuracy by confidence level
   - Show users their performance at each confidence tier
   - Recommend optimal confidence based on historical data

2. **Dynamic Multipliers**
   - Adjust multipliers based on race difficulty
   - Higher multipliers for harder-to-predict races
   - Lower multipliers for obvious outcomes

3. **Confidence Badges**
   - Achievements for bold predictions that paid off
   - "Risk Taker" badge for consistent Level 5 predictions
   - "Calculated" badge for optimal confidence usage

4. **Leaderboard Integration**
   - Separate leaderboards by confidence level
   - "High Risk, High Reward" leaderboard
   - "Consistent Performer" leaderboard

5. **AI Confidence Suggestions**
   - ML model suggests confidence level
   - Based on user history, race conditions, rider form
   - "Claude thinks you should be 4/5 confident"

---

## Troubleshooting

### Confidence not saving
- Check database has `confidence_level` column
- Verify `savePredictionToSupabase` includes confidence parameter
- Check browser console for errors

### Score calculation incorrect
- Verify all parameters passed to `calculatePredictionScore`
- Check streak days is accurate
- Confirm race results are correct
- Test with simple example (all exact matches)

### UI not showing confidence
- Verify ConfidenceSelector is imported correctly
- Check that existing predictions have confidence_level field
- Ensure proper conditional rendering for view vs edit mode

---

## Summary

The confidence system adds strategic depth to predictions by allowing users to risk more points for higher rewards. The advanced scoring system provides transparent, detailed breakdowns of how points are calculated, integrating confidence multipliers, streak bonuses, and perfect prediction rewards.

All core functionality is complete and ready for integration. The main remaining steps are:
1. Add database column
2. Integrate into results calculation
3. Test end-to-end flow
4. Deploy and monitor

For questions or issues, refer to the inline documentation in each service file.
