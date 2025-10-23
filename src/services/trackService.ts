/**
 * Track Service
 *
 * Manages track data and statistics:
 * - Fetch track details
 * - Get track race history
 * - Get track records and statistics
 * - User prediction performance at tracks
 */

import { supabase } from './supabase';

export interface TrackInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  type: 'indoor' | 'outdoor';
  soilType?: string;
  trackLength?: number;
  imageUrl?: string;
  description?: string;
  capacity?: number;
  yearOpened?: number;
}

export interface TrackRaceHistory {
  raceId: string;
  raceName: string;
  raceDate: string;
  seriesType: string;
  winnerId: string;
  winnerName: string;
  winnerNumber: string;
}

export interface TrackRecords {
  trackId: string;
  mostWins: {
    riderId: string;
    riderName: string;
    wins: number;
  } | null;
  mostPodiums: {
    riderId: string;
    riderName: string;
    podiums: number;
  } | null;
  totalRaces: number;
  averageAttendance?: number;
}

export interface UserTrackStats {
  trackId: string;
  predictionsMade: number;
  averagePoints: number;
  bestScore: number;
  accuracy: number;
  lastVisit: string | null;
}

/**
 * Get track by ID or name
 */
export const getTrackInfo = async (identifier: string): Promise<TrackInfo | null> => {
  try {
    console.log('🏁 [TRACK SERVICE] Fetching track:', identifier);

    // Try to fetch by ID first, then by name
    let query = supabase.from('races').select('*');

    // Check if identifier looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    if (isUUID) {
      query = query.eq('id', identifier);
    } else {
      query = query.ilike('track_name', identifier);
    }

    const { data: races, error } = await query.limit(1).single();

    if (error || !races) {
      console.log('Track not found, trying races table for track info');
      // Try to get track info from any race at this track
      const { data: raceData, error: raceError } = await supabase
        .from('races')
        .select('track_name, track_location, track_city, track_state')
        .or(`id.eq.${identifier},track_name.ilike.%${identifier}%`)
        .limit(1)
        .single();

      if (raceError || !raceData) return null;

      // Return basic track info
      return {
        id: identifier,
        name: raceData.track_name || identifier,
        city: raceData.track_city || '',
        state: raceData.track_state || raceData.track_location || '',
        type: 'outdoor', // Default
      };
    }

    const track: TrackInfo = {
      id: races.id,
      name: races.track_name || races.name,
      city: races.track_city || '',
      state: races.track_state || races.track_location || '',
      type: races.series_type?.toLowerCase().includes('sx') ? 'indoor' : 'outdoor',
      imageUrl: races.track_image_url,
      description: races.track_description,
    };

    console.log('✅ [TRACK SERVICE] Track fetched:', track.name);
    return track;
  } catch (error) {
    console.error('❌ [TRACK SERVICE] Error fetching track:', error);
    return null;
  }
};

/**
 * Get all unique tracks from races
 */
export const getAllTracks = async (): Promise<TrackInfo[]> => {
  try {
    console.log('🏁 [TRACK SERVICE] Fetching all tracks');

    const { data: races, error } = await supabase
      .from('races')
      .select('track_name, track_location, track_city, track_state, series_type')
      .order('track_name');

    if (error) throw error;

    // Group by track name to get unique tracks
    const tracksMap = new Map<string, TrackInfo>();

    races?.forEach((race: any) => {
      const trackName = race.track_name || race.name;
      if (trackName && !tracksMap.has(trackName)) {
        tracksMap.set(trackName, {
          id: trackName, // Using name as ID for now
          name: trackName,
          city: race.track_city || '',
          state: race.track_state || race.track_location || '',
          type: race.series_type?.toLowerCase().includes('sx') ? 'indoor' : 'outdoor',
        });
      }
    });

    const tracks = Array.from(tracksMap.values());
    console.log('✅ [TRACK SERVICE] Fetched', tracks.length, 'unique tracks');
    return tracks;
  } catch (error) {
    console.error('❌ [TRACK SERVICE] Error fetching tracks:', error);
    return [];
  }
};

/**
 * Get race history at a specific track
 */
export const getTrackRaceHistory = async (
  trackNameOrId: string,
  limit: number = 10
): Promise<TrackRaceHistory[]> => {
  try {
    console.log('📜 [TRACK SERVICE] Fetching race history for track:', trackNameOrId);

    const { data: races, error: racesError } = await supabase
      .from('races')
      .select('id, name, date, series_type, track_name')
      .or(`id.eq.${trackNameOrId},track_name.ilike.%${trackNameOrId}%`)
      .order('date', { ascending: false })
      .limit(limit);

    if (racesError || !races || races.length === 0) return [];

    // Get results for these races
    const raceIds = races.map(r => r.id);
    const { data: results, error: resultsError } = await supabase
      .from('race_results')
      .select('race_id, results')
      .in('race_id', raceIds);

    if (resultsError || !results) return [];

    // Get all winner IDs
    const winnerIds = new Set<string>();
    results.forEach((result: any) => {
      if (result.results && Array.isArray(result.results) && result.results.length > 0) {
        winnerIds.add(result.results[0]); // First place
      }
    });

    // Fetch rider details
    const { data: riders } = await supabase
      .from('riders')
      .select('id, name, number')
      .in('id', Array.from(winnerIds));

    const ridersMap = new Map(riders?.map(r => [r.id, r]) || []);

    // Build race history
    const history: TrackRaceHistory[] = [];
    for (const race of races) {
      const result = results.find((r: any) => r.race_id === race.id);
      if (result?.results && Array.isArray(result.results) && result.results.length > 0) {
        const winnerId = result.results[0];
        const winner = ridersMap.get(winnerId);

        if (winner) {
          history.push({
            raceId: race.id,
            raceName: race.name,
            raceDate: race.date,
            seriesType: race.series_type || 'Unknown',
            winnerId,
            winnerName: winner.name,
            winnerNumber: winner.number,
          });
        }
      }
    }

    console.log('✅ [TRACK SERVICE] Race history fetched:', history.length, 'races');
    return history;
  } catch (error) {
    console.error('❌ [TRACK SERVICE] Error fetching race history:', error);
    return [];
  }
};

/**
 * Get track records and statistics
 */
export const getTrackRecords = async (trackNameOrId: string): Promise<TrackRecords | null> => {
  try {
    console.log('🏆 [TRACK SERVICE] Fetching track records for:', trackNameOrId);

    // Get all races at this track
    const { data: races, error: racesError } = await supabase
      .from('races')
      .select('id')
      .or(`id.eq.${trackNameOrId},track_name.ilike.%${trackNameOrId}%`);

    if (racesError || !races || races.length === 0) {
      return {
        trackId: trackNameOrId,
        mostWins: null,
        mostPodiums: null,
        totalRaces: 0,
      };
    }

    const raceIds = races.map(r => r.id);

    // Get all results for these races
    const { data: results, error: resultsError } = await supabase
      .from('race_results')
      .select('results')
      .in('race_id', raceIds);

    if (resultsError || !results) {
      return {
        trackId: trackNameOrId,
        mostWins: null,
        mostPodiums: null,
        totalRaces: races.length,
      };
    }

    // Count wins and podiums per rider
    const winsMap = new Map<string, number>();
    const podiumsMap = new Map<string, number>();

    results.forEach((result: any) => {
      if (result.results && Array.isArray(result.results)) {
        // Winner (1st place)
        if (result.results.length > 0) {
          const winnerId = result.results[0];
          winsMap.set(winnerId, (winsMap.get(winnerId) || 0) + 1);
        }

        // Podiums (top 3)
        result.results.slice(0, 3).forEach((riderId: string) => {
          podiumsMap.set(riderId, (podiumsMap.get(riderId) || 0) + 1);
        });
      }
    });

    // Find rider with most wins
    let mostWinsRiderId: string | null = null;
    let mostWinsCount = 0;
    winsMap.forEach((count, riderId) => {
      if (count > mostWinsCount) {
        mostWinsCount = count;
        mostWinsRiderId = riderId;
      }
    });

    // Find rider with most podiums
    let mostPodiumsRiderId: string | null = null;
    let mostPodiumsCount = 0;
    podiumsMap.forEach((count, riderId) => {
      if (count > mostPodiumsCount) {
        mostPodiumsCount = count;
        mostPodiumsRiderId = riderId;
      }
    });

    // Fetch rider details
    const riderIds = [mostWinsRiderId, mostPodiumsRiderId].filter(Boolean) as string[];
    const { data: riders } = await supabase
      .from('riders')
      .select('id, name')
      .in('id', riderIds);

    const ridersMap = new Map(riders?.map(r => [r.id, r]) || []);

    const mostWinsRider = mostWinsRiderId ? ridersMap.get(mostWinsRiderId) : null;
    const mostPodiumsRider = mostPodiumsRiderId ? ridersMap.get(mostPodiumsRiderId) : null;

    const records: TrackRecords = {
      trackId: trackNameOrId,
      mostWins: mostWinsRider
        ? {
            riderId: mostWinsRiderId!,
            riderName: mostWinsRider.name,
            wins: mostWinsCount,
          }
        : null,
      mostPodiums: mostPodiumsRider
        ? {
            riderId: mostPodiumsRiderId!,
            riderName: mostPodiumsRider.name,
            podiums: mostPodiumsCount,
          }
        : null,
      totalRaces: races.length,
    };

    console.log('✅ [TRACK SERVICE] Track records calculated');
    return records;
  } catch (error) {
    console.error('❌ [TRACK SERVICE] Error fetching track records:', error);
    return null;
  }
};

/**
 * Get user's prediction statistics at a specific track
 */
export const getUserTrackStats = async (
  userId: string,
  trackNameOrId: string
): Promise<UserTrackStats | null> => {
  try {
    console.log('🎯 [TRACK SERVICE] Fetching user stats for track:', trackNameOrId);

    // Get all races at this track
    const { data: races, error: racesError } = await supabase
      .from('races')
      .select('id, date')
      .or(`id.eq.${trackNameOrId},track_name.ilike.%${trackNameOrId}%`)
      .order('date', { ascending: false });

    if (racesError || !races || races.length === 0) {
      return {
        trackId: trackNameOrId,
        predictionsMade: 0,
        averagePoints: 0,
        bestScore: 0,
        accuracy: 0,
        lastVisit: null,
      };
    }

    const raceIds = races.map(r => r.id);

    // Get user's predictions for these races
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('id, race_id')
      .eq('user_id', userId)
      .in('race_id', raceIds);

    if (predError || !predictions || predictions.length === 0) {
      return {
        trackId: trackNameOrId,
        predictionsMade: 0,
        averagePoints: 0,
        bestScore: 0,
        accuracy: 0,
        lastVisit: null,
      };
    }

    const predictionIds = predictions.map(p => p.id);

    // Get scores for these predictions
    const { data: scores, error: scoresError } = await supabase
      .from('prediction_scores')
      .select('points_earned, exact_matches')
      .eq('user_id', userId)
      .in('prediction_id', predictionIds);

    if (scoresError || !scores) {
      return {
        trackId: trackNameOrId,
        predictionsMade: predictions.length,
        averagePoints: 0,
        bestScore: 0,
        accuracy: 0,
        lastVisit: races[0]?.date || null,
      };
    }

    const totalPoints = scores.reduce((sum, s) => sum + (s.points_earned || 0), 0);
    const averagePoints = scores.length > 0 ? totalPoints / scores.length : 0;
    const bestScore = Math.max(...scores.map(s => s.points_earned || 0), 0);
    const correctPredictions = scores.filter(s => s.exact_matches > 0).length;
    const accuracy = scores.length > 0 ? (correctPredictions / scores.length) * 100 : 0;

    // Find last race at this track with a prediction
    const lastPredictedRace = races.find(race =>
      predictions.some(p => p.race_id === race.id)
    );

    const stats: UserTrackStats = {
      trackId: trackNameOrId,
      predictionsMade: predictions.length,
      averagePoints: Math.round(averagePoints * 10) / 10,
      bestScore,
      accuracy: Math.round(accuracy * 10) / 10,
      lastVisit: lastPredictedRace?.date || null,
    };

    console.log('✅ [TRACK SERVICE] User track stats calculated:', stats);
    return stats;
  } catch (error) {
    console.error('❌ [TRACK SERVICE] Error fetching user track stats:', error);
    return null;
  }
};

/**
 * Search tracks by name or location
 */
export const searchTracks = async (query: string): Promise<TrackInfo[]> => {
  try {
    console.log('🔍 [TRACK SERVICE] Searching tracks:', query);

    const { data: races, error } = await supabase
      .from('races')
      .select('track_name, track_location, track_city, track_state, series_type')
      .or(`track_name.ilike.%${query}%,track_city.ilike.%${query}%,track_state.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;

    // Group by track name to get unique tracks
    const tracksMap = new Map<string, TrackInfo>();

    races?.forEach((race: any) => {
      const trackName = race.track_name;
      if (trackName && !tracksMap.has(trackName)) {
        tracksMap.set(trackName, {
          id: trackName,
          name: trackName,
          city: race.track_city || '',
          state: race.track_state || race.track_location || '',
          type: race.series_type?.toLowerCase().includes('sx') ? 'indoor' : 'outdoor',
        });
      }
    });

    const tracks = Array.from(tracksMap.values());
    console.log('✅ [TRACK SERVICE] Found', tracks.length, 'tracks');
    return tracks;
  } catch (error) {
    console.error('❌ [TRACK SERVICE] Error searching tracks:', error);
    return [];
  }
};
