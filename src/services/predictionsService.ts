import { supabase } from './supabase';
import { Prediction, ConfidenceLevel } from '../types';

export interface SupabasePrediction {
  id: string;
  user_id: string;
  race_id: string;
  predictions: Record<number, string>; // position -> riderId
  submitted_at: string;
  confidence_level?: ConfidenceLevel; // 1-5 confidence level
}

/**
 * Save a prediction to Supabase
 */
export const savePredictionToSupabase = async (
  userId: string,
  raceId: string,
  predictions: Record<number, string>,
  confidenceLevel?: ConfidenceLevel
): Promise<boolean> => {
  try {
    console.log('💾 [SAVE PREDICTION] Saving to Supabase:', { userId, raceId, predictions, confidenceLevel });

    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: userId,
        race_id: raceId,
        predictions,
        confidence_level: confidenceLevel || 3, // Default to level 3 (neutral)
      }, {
        onConflict: 'user_id,race_id'
      });

    if (error) throw error;

    console.log('✅ [SAVE PREDICTION] Saved successfully');
    return true;
  } catch (error: any) {
    console.error('❌ [SAVE PREDICTION] Error:', error.message);
    throw error;
  }
};

/**
 * Get prediction for a specific race
 */
export const getPredictionForRace = async (
  userId: string,
  raceId: string
): Promise<SupabasePrediction | null> => {
  try {
    console.log('🔍 [GET PREDICTION] Checking for race:', { userId, raceId });

    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('race_id', raceId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      console.log('✅ [GET PREDICTION] Found existing prediction:', data.id);
    } else {
      console.log('⭕ [GET PREDICTION] No prediction found');
    }

    return data;
  } catch (error: any) {
    console.error('❌ [GET PREDICTION] Error:', error.message);
    return null;
  }
};

/**
 * Get all predictions for a user
 */
export const getUserPredictions = async (
  userId: string
): Promise<SupabasePrediction[]> => {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error('❌ [GET USER PREDICTIONS] Error:', error.message);
    return [];
  }
};

/**
 * Delete a prediction
 */
export const deletePrediction = async (
  userId: string,
  raceId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', userId)
      .eq('race_id', raceId);

    if (error) throw error;

    console.log('✅ [DELETE PREDICTION] Deleted successfully');
    return true;
  } catch (error: any) {
    console.error('❌ [DELETE PREDICTION] Error:', error.message);
    return false;
  }
};

/**
 * Delete all predictions for a user (for reset)
 */
export const deleteAllUserPredictions = async (userId: string): Promise<boolean> => {
  try {
    console.log('🗑️ [DELETE ALL PREDICTIONS] Starting deletion for user:', userId);

    // First, check how many predictions exist before deletion
    const { data: beforeData, error: beforeError } = await supabase
      .from('predictions')
      .select('id')
      .eq('user_id', userId);

    if (beforeError) throw beforeError;

    console.log('🗑️ [DELETE ALL PREDICTIONS] Found', beforeData?.length || 0, 'predictions to delete');

    // Now delete them
    const { error, count } = await supabase
      .from('predictions')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (error) throw error;

    console.log('✅ [DELETE ALL PREDICTIONS] Deleted', count, 'predictions successfully');
    return true;
  } catch (error: any) {
    console.error('❌ [DELETE ALL PREDICTIONS] Error:', error.message);
    return false;
  }
};
