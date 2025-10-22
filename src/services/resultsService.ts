import { supabase } from './supabase';

export interface RaceResult {
  id: string;
  race_id: string;
  position: number;
  rider_id: string;
  created_at: string;
  updated_at: string;
}

export interface PredictionScore {
  id: string;
  user_id: string;
  race_id: string;
  points_earned: number;
  exact_matches: number;
  position_matches: number;
  rider_matches: number;
  calculated_at: string;
}

/**
 * Scoring System:
 * - Exact match (right rider in right position): 10 points
 * - Position match (right position, wrong rider): 3 points
 * - Rider match (rider in top 5, wrong position): 2 points
 */

/**
 * Check if current user is an admin
 */
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.is_admin || false;
  } catch (error: any) {
    console.error('❌ [IS ADMIN] Error:', error.message);
    return false;
  }
};

/**
 * Save race results (top 5 finishers)
 */
export const saveRaceResults = async (
  raceId: string,
  results: { position: number; riderId: string }[]
): Promise<boolean> => {
  try {
    console.log('💾 [SAVE RESULTS] Saving results for race:', raceId);

    // Delete existing results for this race
    await supabase
      .from('race_results')
      .delete()
      .eq('race_id', raceId);

    // Insert new results
    const resultsToInsert = results.map(result => ({
      race_id: raceId,
      position: result.position,
      rider_id: result.riderId,
    }));

    const { error } = await supabase
      .from('race_results')
      .insert(resultsToInsert);

    if (error) throw error;

    console.log('✅ [SAVE RESULTS] Results saved successfully');

    // Calculate scores for all predictions
    await calculateScoresForRace(raceId);

    return true;
  } catch (error: any) {
    console.error('❌ [SAVE RESULTS] Error:', error.message);
    throw error;
  }
};

/**
 * Get race results for a specific race
 */
export const getRaceResults = async (raceId: string): Promise<RaceResult[]> => {
  try {
    const { data, error } = await supabase
      .from('race_results')
      .select('*')
      .eq('race_id', raceId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ [GET RESULTS] Error:', error.message);
    return [];
  }
};

/**
 * Check if results exist for a race
 */
export const hasRaceResults = async (raceId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('race_results')
      .select('id')
      .eq('race_id', raceId)
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  } catch (error: any) {
    console.error('❌ [HAS RESULTS] Error:', error.message);
    return false;
  }
};

/**
 * Calculate points for a single prediction against race results
 */
function calculatePredictionPoints(
  prediction: { [position: number]: string },
  results: RaceResult[]
): { points: number; exactMatches: number; positionMatches: number; riderMatches: number } {
  let points = 0;
  let exactMatches = 0;
  let positionMatches = 0;
  let riderMatches = 0;

  // Create a map of results for easy lookup
  const resultsMap: { [position: number]: string } = {};
  const riderPositions: { [riderId: string]: number } = {};

  results.forEach(result => {
    resultsMap[result.position] = result.rider_id;
    riderPositions[result.rider_id] = result.position;
  });

  // Check each prediction
  for (let position = 1; position <= 5; position++) {
    const predictedRiderId = prediction[position];
    if (!predictedRiderId) continue;

    const actualRiderId = resultsMap[position];

    if (predictedRiderId === actualRiderId) {
      // Exact match: right rider in right position
      points += 10;
      exactMatches++;
    } else if (riderPositions[predictedRiderId]) {
      // Rider is in top 5, but wrong position
      points += 2;
      riderMatches++;
    }
  }

  return { points, exactMatches, positionMatches, riderMatches };
}

/**
 * Calculate scores for all predictions for a specific race
 */
export const calculateScoresForRace = async (raceId: string): Promise<void> => {
  try {
    console.log('🧮 [CALCULATE SCORES] Calculating scores for race:', raceId);

    // Get race results
    const results = await getRaceResults(raceId);
    if (results.length === 0) {
      console.log('⚠️ [CALCULATE SCORES] No results found for race');
      return;
    }

    // Get all predictions for this race
    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('*')
      .eq('race_id', raceId);

    if (predictionsError) throw predictionsError;
    if (!predictions || predictions.length === 0) {
      console.log('⚠️ [CALCULATE SCORES] No predictions found for race');
      return;
    }

    // Calculate score for each prediction
    const scores = predictions.map(prediction => {
      const { points, exactMatches, positionMatches, riderMatches } =
        calculatePredictionPoints(prediction.predictions, results);

      return {
        user_id: prediction.user_id,
        race_id: raceId,
        points_earned: points,
        exact_matches: exactMatches,
        position_matches: positionMatches,
        rider_matches: riderMatches,
      };
    });

    // Delete existing scores for this race
    await supabase
      .from('prediction_scores')
      .delete()
      .eq('race_id', raceId);

    // Insert new scores
    const { error: insertError } = await supabase
      .from('prediction_scores')
      .insert(scores);

    if (insertError) throw insertError;

    console.log(`✅ [CALCULATE SCORES] Calculated scores for ${scores.length} predictions`);
  } catch (error: any) {
    console.error('❌ [CALCULATE SCORES] Error:', error.message);
    throw error;
  }
};

/**
 * Get prediction score for a specific user and race
 */
export const getPredictionScore = async (
  userId: string,
  raceId: string
): Promise<PredictionScore | null> => {
  try {
    const { data, error } = await supabase
      .from('prediction_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('race_id', raceId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ [GET SCORE] Error:', error.message);
    return null;
  }
};

/**
 * Get all scores for a user
 */
export const getUserScores = async (userId: string): Promise<PredictionScore[]> => {
  try {
    const { data, error } = await supabase
      .from('prediction_scores')
      .select('*')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ [GET USER SCORES] Error:', error.message);
    return [];
  }
};

/**
 * Delete race results (admin only)
 */
export const deleteRaceResults = async (raceId: string): Promise<boolean> => {
  try {
    console.log('🗑️ [DELETE RESULTS] Deleting results for race:', raceId);

    // Delete results
    const { error: resultsError } = await supabase
      .from('race_results')
      .delete()
      .eq('race_id', raceId);

    if (resultsError) throw resultsError;

    // Delete associated scores
    const { error: scoresError } = await supabase
      .from('prediction_scores')
      .delete()
      .eq('race_id', raceId);

    if (scoresError) throw scoresError;

    console.log('✅ [DELETE RESULTS] Results deleted successfully');
    return true;
  } catch (error: any) {
    console.error('❌ [DELETE RESULTS] Error:', error.message);
    throw error;
  }
};
