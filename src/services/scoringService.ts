/**
 * Scoring Service
 *
 * Handles all point calculations for predictions including:
 * - Base point calculations based on position accuracy
 * - Confidence multipliers (0.5x to 2.0x)
 * - Streak bonuses (up to 3.0x)
 * - Achievement integration
 * - Detailed score breakdowns
 */

import { ConfidenceLevel } from '../types';
import { getConfidenceMultiplier } from '../utils/confidenceUtils';
import { calculateStreakBonus } from './achievementsService';

/**
 * Point values for prediction accuracy
 */
export const POINTS_CONFIG = {
  EXACT_MATCH: 100,        // Predicted exact position
  ONE_OFF: 50,             // Off by 1 position
  TWO_OFF: 25,             // Off by 2 positions
  THREE_OFF: 10,           // Off by 3 positions
  FOUR_OFF: 5,             // Off by 4 positions
  WRONG: 0,                // 5+ positions off or not in top 5
  PERFECT_PREDICTION: 500, // Bonus for all 5 positions exact
};

/**
 * Individual rider prediction score
 */
export interface RiderScore {
  riderId: string;
  predictedPosition: number;
  actualPosition: number;
  positionDiff: number;
  basePoints: number;
  confidenceMultiplier: number;
  pointsEarned: number;
}

/**
 * Complete prediction score breakdown
 */
export interface PredictionScore {
  raceId: string;
  userId: string;
  riderScores: RiderScore[];
  baseTotal: number;
  confidenceLevel?: ConfidenceLevel;
  confidenceMultiplier: number;
  confidenceBonus: number;
  subtotalAfterConfidence: number;
  streakDays: number;
  streakMultiplier: number;
  streakBonus: number;
  perfectPredictionBonus: number;
  totalPoints: number;
  accuracy: number;
  isPerfectPrediction: boolean;
}

/**
 * Calculate base points for a single rider prediction
 */
export const calculateRiderBasePoints = (
  predictedPosition: number,
  actualPosition: number
): number => {
  const diff = Math.abs(predictedPosition - actualPosition);

  switch (diff) {
    case 0:
      return POINTS_CONFIG.EXACT_MATCH;
    case 1:
      return POINTS_CONFIG.ONE_OFF;
    case 2:
      return POINTS_CONFIG.TWO_OFF;
    case 3:
      return POINTS_CONFIG.THREE_OFF;
    case 4:
      return POINTS_CONFIG.FOUR_OFF;
    default:
      return POINTS_CONFIG.WRONG;
  }
};

/**
 * Calculate score for individual rider prediction with confidence
 */
export const calculateRiderScore = (
  riderId: string,
  predictedPosition: number,
  actualPosition: number,
  confidenceLevel?: ConfidenceLevel
): RiderScore => {
  const positionDiff = Math.abs(predictedPosition - actualPosition);
  const basePoints = calculateRiderBasePoints(predictedPosition, actualPosition);
  const confidenceMultiplier = getConfidenceMultiplier(confidenceLevel);
  const pointsEarned = Math.round(basePoints * confidenceMultiplier);

  return {
    riderId,
    predictedPosition,
    actualPosition,
    positionDiff,
    basePoints,
    confidenceMultiplier,
    pointsEarned,
  };
};

/**
 * Calculate complete prediction score with all bonuses
 */
export const calculatePredictionScore = (
  raceId: string,
  userId: string,
  predictions: Array<{ riderId: string; predictedPosition: number }>,
  actualResults: Array<{ riderId: string; position: number }>,
  confidenceLevel?: ConfidenceLevel,
  streakDays: number = 0
): PredictionScore => {
  // Calculate individual rider scores
  const riderScores: RiderScore[] = predictions.map((pred) => {
    const actual = actualResults.find((r) => r.riderId === pred.riderId);
    const actualPosition = actual?.position || 999; // Large number if not found
    return calculateRiderScore(
      pred.riderId,
      pred.predictedPosition,
      actualPosition,
      confidenceLevel
    );
  });

  // Calculate base total (sum of all base points before multipliers)
  const baseTotal = riderScores.reduce((sum, score) => sum + score.basePoints, 0);

  // Apply confidence multiplier
  const confidenceMultiplier = getConfidenceMultiplier(confidenceLevel);
  const subtotalAfterConfidence = riderScores.reduce(
    (sum, score) => sum + score.pointsEarned,
    0
  );
  const confidenceBonus = subtotalAfterConfidence - baseTotal;

  // Check for perfect prediction
  const isPerfectPrediction = riderScores.every((score) => score.positionDiff === 0);
  const perfectPredictionBonus = isPerfectPrediction
    ? POINTS_CONFIG.PERFECT_PREDICTION
    : 0;

  // Apply streak multiplier
  const streakMultiplier = streakDays > 0 ? calculateStreakBonus(100, streakDays) / 100 : 1.0;
  const streakBonus = Math.round(
    (subtotalAfterConfidence + perfectPredictionBonus) * (streakMultiplier - 1)
  );

  // Calculate final total
  const totalPoints = subtotalAfterConfidence + perfectPredictionBonus + streakBonus;

  // Calculate accuracy percentage
  const maxPossiblePoints = predictions.length * POINTS_CONFIG.EXACT_MATCH;
  const accuracy = maxPossiblePoints > 0 ? (baseTotal / maxPossiblePoints) * 100 : 0;

  return {
    raceId,
    userId,
    riderScores,
    baseTotal,
    confidenceLevel,
    confidenceMultiplier,
    confidenceBonus,
    subtotalAfterConfidence,
    streakDays,
    streakMultiplier,
    streakBonus,
    perfectPredictionBonus,
    totalPoints,
    accuracy,
    isPerfectPrediction,
  };
};

/**
 * Calculate potential points range for a prediction
 */
export const calculatePointsRange = (
  numPredictions: number = 5
): {
  minPoints: number;
  maxPoints: number;
  averagePoints: number;
} => {
  const maxBasePoints = numPredictions * POINTS_CONFIG.EXACT_MATCH;

  // Min: All wrong with lowest confidence (0.5x)
  const minPoints = 0;

  // Max: Perfect prediction with highest confidence (2.0x) + perfect bonus
  const maxPoints = maxBasePoints * 2.0 + POINTS_CONFIG.PERFECT_PREDICTION;

  // Average: Half points with neutral confidence (1.0x)
  const averagePoints = (maxBasePoints / 2) * 1.0;

  return {
    minPoints,
    maxPoints,
    averagePoints,
  };
};

/**
 * Calculate points with confidence and streak for display purposes
 */
export const calculateDisplayPoints = (
  basePoints: number,
  confidenceLevel?: ConfidenceLevel,
  streakDays: number = 0
): {
  basePoints: number;
  afterConfidence: number;
  afterStreak: number;
  totalPoints: number;
  breakdown: string[];
} => {
  const confidenceMultiplier = getConfidenceMultiplier(confidenceLevel);
  const afterConfidence = Math.round(basePoints * confidenceMultiplier);

  const streakMultiplier = streakDays > 0 ? calculateStreakBonus(100, streakDays) / 100 : 1.0;
  const afterStreak = Math.round(afterConfidence * streakMultiplier);
  const totalPoints = afterStreak;

  const breakdown: string[] = [`Base: ${basePoints} pts`];

  if (confidenceMultiplier !== 1.0) {
    breakdown.push(`Confidence: ${confidenceMultiplier}x = ${afterConfidence} pts`);
  }

  if (streakMultiplier > 1.0) {
    breakdown.push(`Streak: ${streakMultiplier.toFixed(2)}x = ${afterStreak} pts`);
  }

  return {
    basePoints,
    afterConfidence,
    afterStreak,
    totalPoints,
    breakdown,
  };
};

/**
 * Format score breakdown for display
 */
export const formatScoreBreakdown = (score: PredictionScore): string => {
  let breakdown = `Base Points: ${score.baseTotal}\n`;

  if (score.confidenceBonus !== 0) {
    breakdown += `Confidence (${score.confidenceMultiplier}x): ${
      score.confidenceBonus > 0 ? '+' : ''
    }${score.confidenceBonus}\n`;
  }

  if (score.perfectPredictionBonus > 0) {
    breakdown += `Perfect Prediction: +${score.perfectPredictionBonus}\n`;
  }

  if (score.streakBonus > 0) {
    breakdown += `Streak Bonus (${score.streakMultiplier.toFixed(2)}x): +${
      score.streakBonus
    }\n`;
  }

  breakdown += `─────────────────\n`;
  breakdown += `Total: ${score.totalPoints} points`;

  return breakdown;
};

/**
 * Get performance rating based on accuracy
 */
export const getPerformanceRating = (
  accuracy: number
): {
  rating: 'Perfect' | 'Excellent' | 'Great' | 'Good' | 'Fair' | 'Poor';
  color: string;
  emoji: string;
} => {
  if (accuracy === 100) {
    return { rating: 'Perfect', color: '#ffd700', emoji: '🏆' };
  } else if (accuracy >= 80) {
    return { rating: 'Excellent', color: '#00ff00', emoji: '🔥' };
  } else if (accuracy >= 60) {
    return { rating: 'Great', color: '#00d9ff', emoji: '💪' };
  } else if (accuracy >= 40) {
    return { rating: 'Good', color: '#ffa726', emoji: '👍' };
  } else if (accuracy >= 20) {
    return { rating: 'Fair', color: '#ff9800', emoji: '📈' };
  } else {
    return { rating: 'Poor', color: '#ff6b6b', emoji: '📉' };
  }
};

/**
 * Compare predicted vs actual results for analysis
 */
export const compareResults = (
  predictions: Array<{ riderId: string; predictedPosition: number }>,
  actualResults: Array<{ riderId: string; position: number }>
): {
  exactMatches: number;
  oneOff: number;
  twoOff: number;
  threeOrMore: number;
  notInTop5: number;
} => {
  let exactMatches = 0;
  let oneOff = 0;
  let twoOff = 0;
  let threeOrMore = 0;
  let notInTop5 = 0;

  predictions.forEach((pred) => {
    const actual = actualResults.find((r) => r.riderId === pred.riderId);

    if (!actual || actual.position > 5) {
      notInTop5++;
      return;
    }

    const diff = Math.abs(pred.predictedPosition - actual.position);

    if (diff === 0) exactMatches++;
    else if (diff === 1) oneOff++;
    else if (diff === 2) twoOff++;
    else threeOrMore++;
  });

  return {
    exactMatches,
    oneOff,
    twoOff,
    threeOrMore,
    notInTop5,
  };
};
