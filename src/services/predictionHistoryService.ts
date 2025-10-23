/**
 * Prediction History Service
 *
 * Manages user prediction history with detailed comparisons
 * - Fetch all predictions with results
 * - Compare predictions vs actual results
 * - Filter by season, track, date
 * - Calculate accuracy and points breakdown
 */

import { supabase } from './supabase';

export interface PredictionHistoryItem {
  predictionId: string;
  raceId: string;
  raceName: string;
  raceDate: string;
  trackName: string;
  trackLocation: string;
  seriesType: string;
  userPredictions: string[];
  actualResults: string[] | null;
  pointsEarned: number;
  bonusPoints: number;
  holeshotCorrect: boolean;
  fastestLapCorrect: boolean;
  perfectPrediction: boolean;
  accuracyPercentage: number;
  comparison: PredictionComparison[];
}

export interface PredictionComparison {
  position: number;
  predictedRiderId: string;
  predictedRiderName: string;
  predictedRiderNumber: string;
  actualRiderId: string | null;
  actualRiderName: string | null;
  actualRiderNumber: string | null;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface HistoryFilters {
  season?: string;
  trackName?: string;
  seriesType?: string;
  dateFrom?: string;
  dateTo?: string;
  perfectOnly?: boolean;
}

/**
 * Get user's complete prediction history
 */
export const getPredictionHistory = async (
  userId: string,
  filters?: HistoryFilters
): Promise<PredictionHistoryItem[]> => {
  try {
    let query = supabase
      .from('predictions')
      .select(`
        id,
        predictions,
        race_id,
        race:races(
          id,
          name,
          date,
          track_name,
          track_location,
          series_type
        )
      `)
      .eq('user_id', userId)
      .order('race.date', { ascending: false });

    // Apply filters
    if (filters?.dateFrom) {
      query = query.gte('race.date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('race.date', filters.dateTo);
    }

    const { data: predictions, error: predError } = await query;

    if (predError || !predictions) {
      console.error('Error fetching predictions:', predError);
      return [];
    }

    // Get all race results
    const raceIds = predictions.map(p => p.race_id);
    const { data: results } = await supabase
      .from('race_results')
      .select('race_id, results')
      .in('race_id', raceIds);

    const resultsMap = new Map(results?.map(r => [r.race_id, r.results]) || []);

    // Get prediction scores
    const { data: scores } = await supabase
      .from('prediction_scores')
      .select('*')
      .eq('user_id', userId)
      .in('race_id', raceIds);

    const scoresMap = new Map(scores?.map(s => [s.race_id, s]) || []);

    // Get all unique rider IDs
    const allRiderIds = new Set<string>();
    predictions.forEach(pred => {
      const top5 = pred.predictions?.top5 || [];
      top5.forEach((id: string) => allRiderIds.add(id));
    });
    results?.forEach(res => {
      if (Array.isArray(res.results)) {
        res.results.forEach(id => allRiderIds.add(id));
      }
    });

    // Fetch rider details
    const { data: riders } = await supabase
      .from('riders')
      .select('id, name, number')
      .in('id', Array.from(allRiderIds));

    const ridersMap = new Map(riders?.map(r => [r.id, r]) || []);

    // Build history items
    const history: PredictionHistoryItem[] = predictions
      .filter(pred => pred.race) // Only include if race data exists
      .map(pred => {
        const race = pred.race;
        const userPredictions = pred.predictions?.top5 || [];
        const actualResults = resultsMap.get(pred.race_id) || null;
        const score = scoresMap.get(pred.race_id);

        // Calculate comparison
        const comparison: PredictionComparison[] = userPredictions.map((predictedId: string, index: number) => {
          const predictedRider = ridersMap.get(predictedId);
          const actualId = actualResults?.[index] || null;
          const actualRider = actualId ? ridersMap.get(actualId) : null;
          const isCorrect = predictedId === actualId;

          let pointsEarned = 0;
          if (actualResults && Array.isArray(actualResults)) {
            const actualPosition = actualResults.indexOf(predictedId);
            if (actualPosition === index) {
              pointsEarned = 10; // Exact match
            } else if (actualPosition >= 0 && actualPosition < 5) {
              pointsEarned = 3; // In top 5 but wrong position
            }
          }

          return {
            position: index + 1,
            predictedRiderId: predictedId,
            predictedRiderName: predictedRider?.name || 'Unknown',
            predictedRiderNumber: predictedRider?.number || '?',
            actualRiderId: actualId,
            actualRiderName: actualRider?.name || null,
            actualRiderNumber: actualRider?.number || null,
            isCorrect,
            pointsEarned,
          };
        });

        const correctCount = comparison.filter(c => c.isCorrect).length;
        const accuracyPercentage = (correctCount / 5) * 100;
        const isPerfect = correctCount === 5;

        return {
          predictionId: pred.id,
          raceId: pred.race_id,
          raceName: race.name,
          raceDate: race.date,
          trackName: race.track_name || race.name,
          trackLocation: race.track_location || 'Unknown',
          seriesType: race.series_type || 'Unknown',
          userPredictions,
          actualResults,
          pointsEarned: score?.points_earned || 0,
          bonusPoints: score?.bonus_points || 0,
          holeshotCorrect: score?.holeshot_correct || false,
          fastestLapCorrect: score?.fastest_lap_correct || false,
          perfectPrediction: isPerfect,
          accuracyPercentage,
          comparison,
        };
      });

    // Apply client-side filters
    let filtered = history;

    if (filters?.trackName) {
      filtered = filtered.filter(h => h.trackName.toLowerCase().includes(filters.trackName!.toLowerCase()));
    }

    if (filters?.seriesType) {
      filtered = filtered.filter(h => h.seriesType === filters.seriesType);
    }

    if (filters?.perfectOnly) {
      filtered = filtered.filter(h => h.perfectPrediction);
    }

    return filtered;
  } catch (error) {
    console.error('Error in getPredictionHistory:', error);
    return [];
  }
};

/**
 * Get prediction history summary stats
 */
export const getHistorySummary = async (userId: string) => {
  try {
    const { data: scores, error } = await supabase
      .from('prediction_scores')
      .select('points_earned, bonus_points')
      .eq('user_id', userId);

    if (error || !scores) return null;

    const totalRaces = scores.length;
    const totalPoints = scores.reduce((sum, s) => sum + (s.points_earned || 0), 0);
    const totalBonusPoints = scores.reduce((sum, s) => sum + (s.bonus_points || 0), 0);
    const averagePoints = totalPoints / totalRaces;

    // Get perfect predictions count
    const perfectCount = scores.filter(s => s.points_earned >= 50).length;

    return {
      totalRaces,
      totalPoints,
      totalBonusPoints,
      averagePoints,
      perfectPredictions: perfectCount,
      perfectPercentage: (perfectCount / totalRaces) * 100,
    };
  } catch (error) {
    console.error('Error in getHistorySummary:', error);
    return null;
  }
};

/**
 * Get available seasons for filtering
 */
export const getAvailableSeasons = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('race:races(date)')
      .eq('user_id', userId);

    if (error || !data) return [];

    const years = new Set<string>();
    data.forEach(item => {
      if (item.race?.date) {
        const year = new Date(item.race.date).getFullYear().toString();
        years.add(year);
      }
    });

    return Array.from(years).sort((a, b) => b.localeCompare(a));
  } catch (error) {
    console.error('Error getting available seasons:', error);
    return [];
  }
};

/**
 * Get unique tracks from prediction history
 */
export const getAvailableTracks = async (userId: string): Promise<Array<{ name: string; location: string }>> => {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('race:races(track_name, track_location)')
      .eq('user_id', userId);

    if (error || !data) return [];

    const tracksMap = new Map<string, string>();
    data.forEach(item => {
      if (item.race?.track_name) {
        tracksMap.set(item.race.track_name, item.race.track_location || 'Unknown');
      }
    });

    return Array.from(tracksMap.entries()).map(([name, location]) => ({ name, location }));
  } catch (error) {
    console.error('Error getting available tracks:', error);
    return [];
  }
};

/**
 * Compare two predictions (for "what if" scenarios)
 */
export const comparePredictions = (
  original: string[],
  modified: string[],
  actualResults: string[]
): { originalPoints: number; modifiedPoints: number; difference: number } => {
  const calculatePoints = (predictions: string[]) => {
    let points = 0;
    predictions.forEach((riderId, index) => {
      const actualPosition = actualResults.indexOf(riderId);
      if (actualPosition === index) {
        points += 10; // Exact match
      } else if (actualPosition >= 0 && actualPosition < 5) {
        points += 3; // In top 5
      }
    });
    return points;
  };

  const originalPoints = calculatePoints(original);
  const modifiedPoints = calculatePoints(modified);

  return {
    originalPoints,
    modifiedPoints,
    difference: modifiedPoints - originalPoints,
  };
};
