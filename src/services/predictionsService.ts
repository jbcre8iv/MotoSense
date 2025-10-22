import { supabase } from './supabase';
import { Prediction } from '../types';

export interface SupabasePrediction {
  id: string;
  user_id: string;
  race_id: string;
  predictions: Record<number, string>; // position -> riderId
  submitted_at: string;
}

/**
 * Save a prediction to Supabase
 */
export const savePredictionToSupabase = async (
  userId: string,
  raceId: string,
  predictions: Record<number, string>
): Promise<boolean> => {
  try {
    console.log('💾 [SAVE PREDICTION] Saving to Supabase:', { userId, raceId, predictions });

    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: userId,
        race_id: raceId,
        predictions,
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
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('race_id', raceId)
      .maybeSingle();

    if (error) throw error;

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
    const { error } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    console.log('✅ [DELETE ALL PREDICTIONS] Deleted successfully');
    return true;
  } catch (error: any) {
    console.error('❌ [DELETE ALL PREDICTIONS] Error:', error.message);
    return false;
  }
};
