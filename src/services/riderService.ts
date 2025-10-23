/**
 * Rider Service
 *
 * Manages rider data and statistics:
 * - Fetch rider details
 * - Get rider season stats
 * - Get rider race history
 * - User prediction performance with riders
 */

import { supabase } from './supabase';
import { Rider } from '../types';

export interface RiderStats {
  riderId: string;
  season: string;
  races: number;
  wins: number;
  podiums: number;
  top5Finishes: number;
  averageFinish: number;
  points: number;
  championshipPosition: number | null;
}

export interface RiderRaceResult {
  raceId: string;
  raceName: string;
  raceDate: string;
  trackName: string;
  position: number;
  points: number;
  seriesType: string;
}

export interface UserRiderPredictionStats {
  riderId: string;
  timesPredicted: number;
  timesCorrect: number;
  accuracy: number;
  averagePositionDiff: number;
  bestPrediction: {
    raceId: string;
    raceName: string;
    predicted: number;
    actual: number;
  } | null;
}

/**
 * Get rider by ID
 */
export const getRiderById = async (riderId: string): Promise<Rider | null> => {
  try {
    console.log('🏍️ [RIDER SERVICE] Fetching rider:', riderId);

    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('id', riderId)
      .single();

    if (error) throw error;

    if (!data) return null;

    // Map database fields to Rider interface
    const rider: Rider = {
      id: data.id,
      name: data.name,
      number: data.number,
      team: data.team || 'Unknown Team',
      bike: data.bike || 'Unknown Bike',
      careerWins: data.career_wins || 0,
      careerPodiums: data.career_podiums || 0,
      championships: data.championships || 0,
      bio: data.bio || undefined,
      imageUrl: data.image_url || undefined,
      socialMedia: {
        instagram: data.instagram || undefined,
        twitter: data.twitter || undefined,
      },
    };

    console.log('✅ [RIDER SERVICE] Rider fetched:', rider.name);
    return rider;
  } catch (error) {
    console.error('❌ [RIDER SERVICE] Error fetching rider:', error);
    return null;
  }
};

/**
 * Get all riders
 */
export const getAllRiders = async (): Promise<Rider[]> => {
  try {
    console.log('🏍️ [RIDER SERVICE] Fetching all riders');

    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .order('number', { ascending: true });

    if (error) throw error;

    const riders: Rider[] = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      number: r.number,
      team: r.team || 'Unknown Team',
      bike: r.bike || 'Unknown Bike',
      careerWins: r.career_wins || 0,
      careerPodiums: r.career_podiums || 0,
      championships: r.championships || 0,
      bio: r.bio || undefined,
      imageUrl: r.image_url || undefined,
      socialMedia: {
        instagram: r.instagram || undefined,
        twitter: r.twitter || undefined,
      },
    }));

    console.log('✅ [RIDER SERVICE] Fetched', riders.length, 'riders');
    return riders;
  } catch (error) {
    console.error('❌ [RIDER SERVICE] Error fetching riders:', error);
    return [];
  }
};

/**
 * Get rider season stats
 */
export const getRiderSeasonStats = async (
  riderId: string,
  season?: string
): Promise<RiderStats | null> => {
  try {
    const currentYear = season || new Date().getFullYear().toString();
    console.log('📊 [RIDER SERVICE] Fetching season stats for rider:', riderId, 'season:', currentYear);

    // Get all race results for this rider in the season
    const { data: results, error } = await supabase
      .from('race_results')
      .select(`
        race_id,
        results,
        race:races(
          id,
          name,
          date,
          series_type
        )
      `)
      .gte('race.date', `${currentYear}-01-01`)
      .lte('race.date', `${currentYear}-12-31`);

    if (error) throw error;

    if (!results || results.length === 0) {
      return {
        riderId,
        season: currentYear,
        races: 0,
        wins: 0,
        podiums: 0,
        top5Finishes: 0,
        averageFinish: 0,
        points: 0,
        championshipPosition: null,
      };
    }

    // Parse results to find rider's positions
    const riderResults: number[] = [];
    results.forEach((result: any) => {
      const results_array = result.results;
      if (Array.isArray(results_array)) {
        const position = results_array.indexOf(riderId);
        if (position >= 0) {
          riderResults.push(position + 1); // Convert to 1-indexed position
        }
      }
    });

    const races = riderResults.length;
    const wins = riderResults.filter(pos => pos === 1).length;
    const podiums = riderResults.filter(pos => pos <= 3).length;
    const top5Finishes = riderResults.filter(pos => pos <= 5).length;
    const averageFinish = races > 0
      ? riderResults.reduce((sum, pos) => sum + pos, 0) / races
      : 0;

    // Calculate points (simplified: 25 for 1st, 22 for 2nd, 20 for 3rd, etc.)
    const pointsArray = [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const points = riderResults.reduce((sum, pos) => {
      const posPoints = pos <= 20 ? pointsArray[pos - 1] : 0;
      return sum + posPoints;
    }, 0);

    const stats: RiderStats = {
      riderId,
      season: currentYear,
      races,
      wins,
      podiums,
      top5Finishes,
      averageFinish: Math.round(averageFinish * 10) / 10,
      points,
      championshipPosition: null, // Would need full championship calculation
    };

    console.log('✅ [RIDER SERVICE] Season stats calculated:', stats);
    return stats;
  } catch (error) {
    console.error('❌ [RIDER SERVICE] Error fetching season stats:', error);
    return null;
  }
};

/**
 * Get rider race history
 */
export const getRiderRaceHistory = async (
  riderId: string,
  limit: number = 10
): Promise<RiderRaceResult[]> => {
  try {
    console.log('📜 [RIDER SERVICE] Fetching race history for rider:', riderId);

    const { data: results, error } = await supabase
      .from('race_results')
      .select(`
        race_id,
        results,
        race:races(
          id,
          name,
          date,
          track_name,
          series_type
        )
      `)
      .order('race.date', { ascending: false })
      .limit(limit * 2); // Fetch more than needed since we'll filter

    if (error) throw error;

    if (!results || results.length === 0) return [];

    // Parse results and filter for this rider
    const raceHistory: RiderRaceResult[] = [];
    for (const result of results) {
      const results_array = result.results;
      if (Array.isArray(results_array) && result.race) {
        const position = results_array.indexOf(riderId);
        if (position >= 0) {
          const pos = position + 1;
          const pointsArray = [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
          const points = pos <= 20 ? pointsArray[pos - 1] : 0;

          raceHistory.push({
            raceId: result.race.id,
            raceName: result.race.name,
            raceDate: result.race.date,
            trackName: result.race.track_name || result.race.name,
            position: pos,
            points,
            seriesType: result.race.series_type || 'Unknown',
          });

          if (raceHistory.length >= limit) break;
        }
      }
    }

    console.log('✅ [RIDER SERVICE] Race history fetched:', raceHistory.length, 'races');
    return raceHistory;
  } catch (error) {
    console.error('❌ [RIDER SERVICE] Error fetching race history:', error);
    return [];
  }
};

/**
 * Get user's prediction performance with a specific rider
 */
export const getUserRiderPredictionStats = async (
  userId: string,
  riderId: string
): Promise<UserRiderPredictionStats | null> => {
  try {
    console.log('🎯 [RIDER SERVICE] Fetching user prediction stats for rider:', riderId);

    // Get all user predictions that included this rider
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select(`
        id,
        predictions,
        race_id,
        race:races(
          id,
          name,
          date
        )
      `)
      .eq('user_id', userId);

    if (predError) throw predError;

    if (!predictions || predictions.length === 0) {
      return {
        riderId,
        timesPredicted: 0,
        timesCorrect: 0,
        accuracy: 0,
        averagePositionDiff: 0,
        bestPrediction: null,
      };
    }

    // Filter predictions that included this rider
    const riderPredictions = predictions.filter((pred: any) => {
      const top5 = pred.predictions?.top5 || [];
      return top5.includes(riderId);
    });

    // Get actual results for these races
    const raceIds = riderPredictions.map((p: any) => p.race_id);
    const { data: results } = await supabase
      .from('race_results')
      .select('race_id, results')
      .in('race_id', raceIds);

    const resultsMap = new Map(results?.map(r => [r.race_id, r.results]) || []);

    let timesCorrect = 0;
    let positionDiffs: number[] = [];
    let bestPrediction: any = null;
    let bestDiff = Infinity;

    riderPredictions.forEach((pred: any) => {
      const top5 = pred.predictions?.top5 || [];
      const predictedPosition = top5.indexOf(riderId);

      if (predictedPosition >= 0) {
        const actualResults = resultsMap.get(pred.race_id);
        if (actualResults && Array.isArray(actualResults)) {
          const actualPosition = actualResults.indexOf(riderId);

          if (actualPosition >= 0) {
            const diff = Math.abs(predictedPosition - actualPosition);
            positionDiffs.push(diff);

            if (predictedPosition === actualPosition) {
              timesCorrect++;
            }

            if (diff < bestDiff) {
              bestDiff = diff;
              bestPrediction = {
                raceId: pred.race_id,
                raceName: pred.race?.name || 'Unknown Race',
                predicted: predictedPosition + 1,
                actual: actualPosition + 1,
              };
            }
          }
        }
      }
    });

    const timesPredicted = riderPredictions.length;
    const accuracy = timesPredicted > 0 ? (timesCorrect / timesPredicted) * 100 : 0;
    const averagePositionDiff = positionDiffs.length > 0
      ? positionDiffs.reduce((sum, diff) => sum + diff, 0) / positionDiffs.length
      : 0;

    const stats: UserRiderPredictionStats = {
      riderId,
      timesPredicted,
      timesCorrect,
      accuracy: Math.round(accuracy * 10) / 10,
      averagePositionDiff: Math.round(averagePositionDiff * 10) / 10,
      bestPrediction,
    };

    console.log('✅ [RIDER SERVICE] User prediction stats calculated:', stats);
    return stats;
  } catch (error) {
    console.error('❌ [RIDER SERVICE] Error fetching user prediction stats:', error);
    return null;
  }
};

/**
 * Search riders by name or number
 */
export const searchRiders = async (query: string): Promise<Rider[]> => {
  try {
    console.log('🔍 [RIDER SERVICE] Searching riders:', query);

    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .or(`name.ilike.%${query}%,number.eq.${isNaN(Number(query)) ? -1 : Number(query)}`)
      .limit(20);

    if (error) throw error;

    const riders: Rider[] = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      number: r.number,
      team: r.team || 'Unknown Team',
      bike: r.bike || 'Unknown Bike',
      careerWins: r.career_wins || 0,
      careerPodiums: r.career_podiums || 0,
      championships: r.championships || 0,
      bio: r.bio || undefined,
      imageUrl: r.image_url || undefined,
      socialMedia: {
        instagram: r.instagram || undefined,
        twitter: r.twitter || undefined,
      },
    }));

    console.log('✅ [RIDER SERVICE] Found', riders.length, 'riders');
    return riders;
  } catch (error) {
    console.error('❌ [RIDER SERVICE] Error searching riders:', error);
    return [];
  }
};
