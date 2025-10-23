/**
 * Confidence Utilities
 *
 * Handles confidence level multipliers and calculations for predictions.
 * Higher confidence = higher rewards but also higher risk.
 */

import { ConfidenceLevel, ConfidenceMultiplier } from '../types';

/**
 * Confidence multipliers for each level
 */
export const CONFIDENCE_MULTIPLIERS: ConfidenceMultiplier[] = [
  {
    level: 1,
    multiplier: 0.5,
    label: 'Very Unsure',
    description: '50% points - Low risk, low reward',
  },
  {
    level: 2,
    multiplier: 0.75,
    label: 'Somewhat Unsure',
    description: '75% points - Below average confidence',
  },
  {
    level: 3,
    multiplier: 1.0,
    label: 'Neutral',
    description: '100% points - Standard confidence',
  },
  {
    level: 4,
    multiplier: 1.5,
    label: 'Confident',
    description: '150% points - High risk, high reward',
  },
  {
    level: 5,
    multiplier: 2.0,
    label: 'Very Confident',
    description: '200% points - Maximum risk, maximum reward',
  },
];

/**
 * Get confidence multiplier for a given level
 */
export const getConfidenceMultiplier = (level?: ConfidenceLevel): number => {
  if (!level) return 1.0; // Default to neutral if no confidence set

  const config = CONFIDENCE_MULTIPLIERS.find(c => c.level === level);
  return config?.multiplier || 1.0;
};

/**
 * Get confidence configuration for a given level
 */
export const getConfidenceConfig = (level: ConfidenceLevel): ConfidenceMultiplier => {
  const config = CONFIDENCE_MULTIPLIERS.find(c => c.level === level);
  return config || CONFIDENCE_MULTIPLIERS[2]; // Default to level 3 (neutral)
};

/**
 * Calculate points with confidence multiplier applied
 */
export const calculateConfidencePoints = (
  basePoints: number,
  confidenceLevel?: ConfidenceLevel
): number => {
  const multiplier = getConfidenceMultiplier(confidenceLevel);
  return Math.round(basePoints * multiplier);
};

/**
 * Calculate potential points range for a prediction
 */
export const getPointsRange = (basePoints: number): {
  min: number;
  max: number;
  standard: number;
} => {
  return {
    min: calculateConfidencePoints(basePoints, 1),
    max: calculateConfidencePoints(basePoints, 5),
    standard: basePoints,
  };
};

/**
 * Get confidence level emoji representation
 */
export const getConfidenceEmoji = (level?: ConfidenceLevel): string => {
  if (!level) return 'PPP';

  switch (level) {
    case 1:
      return 'P';
    case 2:
      return 'PP';
    case 3:
      return 'PPP';
    case 4:
      return 'PPPP';
    case 5:
      return 'PPPPP';
    default:
      return 'PPP';
  }
};

/**
 * Get confidence level color
 */
export const getConfidenceColor = (level?: ConfidenceLevel): string => {
  if (!level) return '#00d9ff'; // Default cyan

  switch (level) {
    case 1:
      return '#8892b0'; // Gray
    case 2:
      return '#64b5f6'; // Light blue
    case 3:
      return '#00d9ff'; // Cyan
    case 4:
      return '#ffa726'; // Orange
    case 5:
      return '#ff6b6b'; // Red
    default:
      return '#00d9ff';
  }
};

/**
 * Validate confidence level
 */
export const isValidConfidenceLevel = (level: any): level is ConfidenceLevel => {
  return typeof level === 'number' && level >= 1 && level <= 5;
};

/**
 * Get recommended confidence level based on user stats
 */
export const getRecommendedConfidence = (
  userAccuracy: number,
  recentStreak: number
): ConfidenceLevel => {
  // High accuracy and good streak = recommend higher confidence
  if (userAccuracy >= 80 && recentStreak >= 5) {
    return 5;
  } else if (userAccuracy >= 70 && recentStreak >= 3) {
    return 4;
  } else if (userAccuracy >= 60) {
    return 3;
  } else if (userAccuracy >= 50) {
    return 2;
  } else {
    return 1;
  }
};

/**
 * Calculate risk level description
 */
export const getRiskDescription = (level: ConfidenceLevel): {
  risk: 'low' | 'medium' | 'high' | 'very-high';
  description: string;
} => {
  switch (level) {
    case 1:
      return {
        risk: 'low',
        description: 'Playing it safe with reduced potential points',
      };
    case 2:
      return {
        risk: 'low',
        description: 'Slightly conservative approach',
      };
    case 3:
      return {
        risk: 'medium',
        description: 'Balanced risk and reward',
      };
    case 4:
      return {
        risk: 'high',
        description: 'Bold prediction with significant upside',
      };
    case 5:
      return {
        risk: 'very-high',
        description: 'Maximum risk for maximum reward',
      };
  }
};

/**
 * Format confidence level for display
 */
export const formatConfidenceLevel = (level?: ConfidenceLevel): string => {
  if (!level) return 'Standard';

  const config = getConfidenceConfig(level);
  return `${config.label} (${config.multiplier}x)`;
};

/**
 * Calculate confidence bonus percentage
 */
export const getConfidenceBonus = (level?: ConfidenceLevel): string => {
  if (!level || level === 3) return '+0%';

  const multiplier = getConfidenceMultiplier(level);
  const bonus = (multiplier - 1) * 100;

  return bonus > 0 ? `+${bonus}%` : `${bonus}%`;
};
