/**
 * Expanded Predictions Service
 *
 * Handles bonus predictions beyond top 5 finishers:
 * - Holeshot winner (first to complete lap 1)
 * - Fastest lap rider
 */

import { supabase } from './supabase';

export interface ExpandedPrediction {
  holeshot: string | null;
  fastestLap: string | null;
}

export interface FullPrediction {
  top5: string[];
  holeshot?: string | null;
  fastestLap?: string | null;
}

export interface ExpandedPredictionPoints {
  holeshotPoints: number;
  fastestLapPoints: number;
  totalBonus: number;
}

export interface PredictionScore {
  userId: string;
  raceId: string;
  pointsEarned: number;
  bonusPoints: number;
  holeshotCorrect: boolean;
  fastestLapCorrect: boolean;
}

/**
 * Submit predictions with expanded categories
 * This merges top 5 predictions with bonus predictions into the JSONB field
 */
export const submitPredictionWithBonus = async (
  userId: string,
  raceId: string,
  top5: string[],
  bonusPredictions: ExpandedPrediction
): Promise<boolean> => {
  try {
    const fullPrediction: FullPrediction = {
      top5,
      holeshot: bonusPredictions.holeshot,
      fastestLap: bonusPredictions.fastestLap,
    };

    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: userId,
        race_id: raceId,
        predictions: fullPrediction,
      }, {
        onConflict: 'user_id,race_id'
      });

    if (error) {
      console.error('Error submitting prediction with bonus:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in submitPredictionWithBonus:', error);
    return false;
  }
};

/**
 * Get user's predictions including bonus predictions
 */
export const getUserPrediction = async (
  userId: string,
  raceId: string
): Promise<FullPrediction | null> => {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('predictions')
      .eq('user_id', userId)
      .eq('race_id', raceId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.predictions as FullPrediction;
  } catch (error) {
    console.error('Error in getUserPrediction:', error);
    return null;
  }
};

/**
 * Get prediction score with bonus points breakdown
 */
export const getPredictionScoreWithBonus = async (
  userId: string,
  raceId: string
): Promise<PredictionScore | null> => {
  try {
    const { data, error } = await supabase
      .from('prediction_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('race_id', raceId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      userId: data.user_id,
      raceId: data.race_id,
      pointsEarned: data.points_earned,
      bonusPoints: data.bonus_points || 0,
      holeshotCorrect: data.holeshot_correct || false,
      fastestLapCorrect: data.fastest_lap_correct || false,
    };
  } catch (error) {
    console.error('Error in getPredictionScoreWithBonus:', error);
    return null;
  }
};

/**
 * Get race results including bonus data
 */
export const getRaceWithBonusResults = async (
  raceId: string
): Promise<{
  holeshotWinner: string | null;
  fastestLapRider: string | null;
} | null> => {
  try {
    const { data, error } = await supabase
      .from('races')
      .select('holeshot_winner_id, fastest_lap_rider_id')
      .eq('id', raceId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      holeshotWinner: data.holeshot_winner_id,
      fastestLapRider: data.fastest_lap_rider_id,
    };
  } catch (error) {
    console.error('Error in getRaceWithBonusResults:', error);
    return null;
  }
};

/**
 * Calculate bonus points for a user's prediction (client-side preview)
 */
export const calculateBonusPoints = (
  userPrediction: ExpandedPrediction,
  raceResults: { holeshotWinner: string | null; fastestLapRider: string | null }
): ExpandedPredictionPoints => {
  let holeshotPoints = 0;
  let fastestLapPoints = 0;

  // Award 5 points for correct holeshot prediction
  if (userPrediction.holeshot && userPrediction.holeshot === raceResults.holeshotWinner) {
    holeshotPoints = 5;
  }

  // Award 5 points for correct fastest lap prediction
  if (userPrediction.fastestLap && userPrediction.fastestLap === raceResults.fastestLapRider) {
    fastestLapPoints = 5;
  }

  return {
    holeshotPoints,
    fastestLapPoints,
    totalBonus: holeshotPoints + fastestLapPoints,
  };
};

/**
 * Get user's expanded prediction statistics
 */
export const getExpandedPredictionStats = async (
  userId: string
): Promise<{
  totalBonusPoints: number;
  holeshotAccuracy: number;
  fastestLapAccuracy: number;
  totalPredictions: number;
} | null> => {
  try {
    const { data: scores, error } = await supabase
      .from('prediction_scores')
      .select('bonus_points, holeshot_correct, fastest_lap_correct')
      .eq('user_id', userId)
      .gt('bonus_points', 0);

    if (error) {
      console.error('Error fetching prediction stats:', error);
      return null;
    }

    if (!scores || scores.length === 0) {
      return {
        totalBonusPoints: 0,
        holeshotAccuracy: 0,
        fastestLapAccuracy: 0,
        totalPredictions: 0,
      };
    }

    let totalBonusPoints = 0;
    let holeshotCorrectCount = 0;
    let fastestLapCorrectCount = 0;

    scores.forEach((score) => {
      totalBonusPoints += score.bonus_points || 0;
      if (score.holeshot_correct) holeshotCorrectCount++;
      if (score.fastest_lap_correct) fastestLapCorrectCount++;
    });

    const totalPredictions = scores.length;

    return {
      totalBonusPoints,
      holeshotAccuracy: totalPredictions > 0 ? (holeshotCorrectCount / totalPredictions) * 100 : 0,
      fastestLapAccuracy: totalPredictions > 0 ? (fastestLapCorrectCount / totalPredictions) * 100 : 0,
      totalPredictions,
    };
  } catch (error) {
    console.error('Error in getExpandedPredictionStats:', error);
    return null;
  }
};

/**
 * Get bonus point breakdown for display
 */
export const getBonusPointBreakdown = (points: ExpandedPredictionPoints) => {
  const breakdown = [];

  if (points.holeshotPoints > 0) {
    breakdown.push({
      label: 'Holeshot Winner',
      points: points.holeshotPoints,
      icon: 'flash' as const,
      color: '#ff6b6b',
    });
  }

  if (points.fastestLapPoints > 0) {
    breakdown.push({
      label: 'Fastest Lap',
      points: points.fastestLapPoints,
      icon: 'speedometer' as const,
      color: '#9c27b0',
    });
  }

  return breakdown;
};

/**
 * Validate expanded predictions
 */
export const validateExpandedPredictions = (
  expanded: ExpandedPrediction,
  top5Picks: string[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check if bonus predictions are different from each other
  if (expanded.holeshot && expanded.fastestLap && expanded.holeshot === expanded.fastestLap) {
    // This is actually allowed - same rider can win holeshot and fastest lap
    // So we don't add an error here
  }

  // Check if bonus predictions are riders that exist
  const allPicks = [...top5Picks];
  if (expanded.holeshot) allPicks.push(expanded.holeshot);
  if (expanded.fastestLap) allPicks.push(expanded.fastestLap);

  // Note: We should validate against available riders list in the UI
  // This is just a basic validation

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate maximum possible bonus points
 */
export const getMaxBonusPoints = (): number => {
  // Holeshot: 5 points
  // Fastest lap: 5 points
  // Total: 10 bonus points possible
  return 10;
};

/**
 * Get bonus point descriptions
 */
export const getBonusPointDescriptions = () => {
  return [
    {
      category: 'Holeshot Winner',
      points: 5,
      description: 'First rider to complete the first lap',
      icon: 'flash' as const,
      color: '#ff6b6b',
    },
    {
      category: 'Fastest Lap',
      points: 5,
      description: 'Rider with the fastest single lap time',
      icon: 'speedometer' as const,
      color: '#9c27b0',
    },
  ];
};

/**
 * Admin function: Set holeshot winner and recalculate scores
 */
export const setHoleshotWinner = async (
  raceId: string,
  riderId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('set_holeshot_winner', {
      p_race_id: raceId,
      p_rider_id: riderId,
    });

    if (error) {
      console.error('Error setting holeshot winner:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in setHoleshotWinner:', error);
    return false;
  }
};

/**
 * Admin function: Set fastest lap rider and recalculate scores
 */
export const setFastestLapRider = async (
  raceId: string,
  riderId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('set_fastest_lap_rider', {
      p_race_id: raceId,
      p_rider_id: riderId,
    });

    if (error) {
      console.error('Error setting fastest lap rider:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in setFastestLapRider:', error);
    return false;
  }
};
