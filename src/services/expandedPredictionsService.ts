/**
 * Expanded Predictions Service
 *
 * Handles bonus predictions beyond top 5 finishers:
 * - Holeshot winner (first to first turn)
 * - Fastest lap rider
 * - Qualifying top 3
 */

import { supabase } from './supabase';

export interface ExpandedPrediction {
  holeshotWinnerId: string | null;
  fastestLapRiderId: string | null;
  qualifying1Id: string | null;
  qualifying2Id: string | null;
  qualifying3Id: string | null;
}

export interface ExpandedPredictionPoints {
  holeshotPoints: number;
  fastestLapPoints: number;
  qualifyingPoints: number;
  totalBonus: number;
}

/**
 * Save expanded predictions for a race
 */
export const saveExpandedPredictions = async (
  predictionId: string,
  expanded: ExpandedPrediction
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('predictions')
      .update({
        holeshot_winner_id: expanded.holeshotWinnerId,
        fastest_lap_rider_id: expanded.fastestLapRiderId,
        qualifying_1_id: expanded.qualifying1Id,
        qualifying_2_id: expanded.qualifying2Id,
        qualifying_3_id: expanded.qualifying3Id,
      })
      .eq('id', predictionId);

    if (error) {
      console.error('Error saving expanded predictions:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveExpandedPredictions:', error);
    return false;
  }
};

/**
 * Get expanded predictions for a prediction
 */
export const getExpandedPredictions = async (
  predictionId: string
): Promise<ExpandedPrediction | null> => {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select(
        'holeshot_winner_id, fastest_lap_rider_id, qualifying_1_id, qualifying_2_id, qualifying_3_id'
      )
      .eq('id', predictionId)
      .single();

    if (error || !data) {
      console.error('Error fetching expanded predictions:', error);
      return null;
    }

    return {
      holeshotWinnerId: data.holeshot_winner_id,
      fastestLapRiderId: data.fastest_lap_rider_id,
      qualifying1Id: data.qualifying_1_id,
      qualifying2Id: data.qualifying_2_id,
      qualifying3Id: data.qualifying_3_id,
    };
  } catch (error) {
    console.error('Error in getExpandedPredictions:', error);
    return null;
  }
};

/**
 * Calculate bonus points for expanded predictions
 */
export const calculateExpandedPoints = async (
  predictionId: string
): Promise<ExpandedPredictionPoints | null> => {
  try {
    const { data, error } = await supabase.rpc('calculate_expanded_prediction_points', {
      p_prediction_id: predictionId,
    });

    if (error) {
      console.error('Error calculating expanded points:', error);
      return null;
    }

    // Get the updated points from the prediction
    const { data: prediction } = await supabase
      .from('predictions')
      .select('holeshot_points, fastest_lap_points, qualifying_points')
      .eq('id', predictionId)
      .single();

    if (!prediction) {
      return null;
    }

    const totalBonus =
      prediction.holeshot_points +
      prediction.fastest_lap_points +
      prediction.qualifying_points;

    return {
      holeshotPoints: prediction.holeshot_points,
      fastestLapPoints: prediction.fastest_lap_points,
      qualifyingPoints: prediction.qualifying_points,
      totalBonus,
    };
  } catch (error) {
    console.error('Error in calculateExpandedPoints:', error);
    return null;
  }
};

/**
 * Get expanded prediction statistics
 */
export const getExpandedPredictionStats = async (
  userId: string
): Promise<{
  totalBonusPoints: number;
  holeshotAccuracy: number;
  fastestLapAccuracy: number;
  qualifyingAccuracy: number;
} | null> => {
  try {
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select('holeshot_points, fastest_lap_points, qualifying_points')
      .eq('user_id', userId)
      .not('holeshot_winner_id', 'is', null);

    if (error || !predictions) {
      console.error('Error fetching prediction stats:', error);
      return null;
    }

    let totalBonusPoints = 0;
    let holeshotCorrect = 0;
    let fastestLapCorrect = 0;
    let qualifyingCorrect = 0;
    let holeshotTotal = 0;
    let fastestLapTotal = 0;
    let qualifyingTotal = 0;

    predictions.forEach((pred) => {
      totalBonusPoints +=
        pred.holeshot_points + pred.fastest_lap_points + pred.qualifying_points;

      if (pred.holeshot_points > 0) {
        holeshotCorrect++;
      }
      if (pred.holeshot_points >= 0) {
        holeshotTotal++;
      }

      if (pred.fastest_lap_points > 0) {
        fastestLapCorrect++;
      }
      if (pred.fastest_lap_points >= 0) {
        fastestLapTotal++;
      }

      if (pred.qualifying_points > 0) {
        qualifyingCorrect++;
      }
      if (pred.qualifying_points >= 0) {
        qualifyingTotal++;
      }
    });

    return {
      totalBonusPoints,
      holeshotAccuracy: holeshotTotal > 0 ? (holeshotCorrect / holeshotTotal) * 100 : 0,
      fastestLapAccuracy: fastestLapTotal > 0 ? (fastestLapCorrect / fastestLapTotal) * 100 : 0,
      qualifyingAccuracy: qualifyingTotal > 0 ? (qualifyingCorrect / qualifyingTotal) * 100 : 0,
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
      icon: 'flash',
      color: '#ff6b6b',
    });
  }

  if (points.fastestLapPoints > 0) {
    breakdown.push({
      label: 'Fastest Lap',
      points: points.fastestLapPoints,
      icon: 'speedometer',
      color: '#9c27b0',
    });
  }

  if (points.qualifyingPoints > 0) {
    breakdown.push({
      label: 'Qualifying',
      points: points.qualifyingPoints,
      icon: 'ribbon',
      color: '#4caf50',
    });
  }

  return breakdown;
};

/**
 * Validate expanded predictions
 */
export const validateExpandedPredictions = (
  expanded: ExpandedPrediction,
  availableRiders: string[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check for duplicate selections
  const selections = [
    expanded.holeshotWinnerId,
    expanded.fastestLapRiderId,
    expanded.qualifying1Id,
    expanded.qualifying2Id,
    expanded.qualifying3Id,
  ].filter((id) => id !== null);

  const uniqueSelections = new Set(selections);
  if (selections.length !== uniqueSelections.size) {
    errors.push('Cannot select the same rider for multiple categories');
  }

  // Validate qualifying order
  if (
    expanded.qualifying1Id &&
    expanded.qualifying2Id &&
    expanded.qualifying1Id === expanded.qualifying2Id
  ) {
    errors.push('Qualifying positions must have different riders');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate maximum possible bonus points
 */
export const getMaxBonusPoints = (): number => {
  // Holeshot: 15 points
  // Fastest lap: 10 points
  // Qualifying (3 positions × 5 points): 15 points
  // Total: 40 bonus points possible
  return 40;
};

/**
 * Get bonus point descriptions
 */
export const getBonusPointDescriptions = () => {
  return [
    {
      category: 'Holeshot Winner',
      points: 15,
      description: 'First rider to the first turn',
      icon: 'flash',
      color: '#ff6b6b',
    },
    {
      category: 'Fastest Lap',
      points: 10,
      description: 'Rider with the fastest single lap',
      icon: 'speedometer',
      color: '#9c27b0',
    },
    {
      category: 'Qualifying Top 3',
      points: 15,
      description: '5 points for each correct qualifying position',
      icon: 'ribbon',
      color: '#4caf50',
    },
  ];
};
