/**
 * Live Race Service
 *
 * Handles real-time race scoring and updates during live races.
 * Calculates points as riders cross the finish line and updates user scores live.
 */

import { supabase } from './supabase';

export interface LiveRacePosition {
  position: number;
  riderId: string;
  riderNumber: string;
  riderName: string;
  crossedFinishAt: string;
  status: 'racing' | 'finished' | 'dnf' | 'dns';
}

export interface LiveRaceState {
  raceId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  positions: LiveRacePosition[];
  lastUpdate: string;
  totalLaps: number;
  currentLap: number;
}

export interface LiveUserScore {
  userId: string;
  raceId: string;
  currentPoints: number;
  potentialPoints: number;
  correctPicks: number;
  totalPicks: number;
  rank: number;
  totalParticipants: number;
}

/**
 * Calculate points for a prediction based on actual results
 * Scoring:
 * - Exact position match: 10 points
 * - Off by 1 position: 7 points
 * - Off by 2 positions: 4 points
 * - Off by 3+ positions: 1 point
 * - Rider in top 5 but wrong position: 3 points
 * - Rider not in top 5: 0 points
 */
export const calculatePointsForPosition = (
  predictedPosition: number,
  actualPosition: number | null,
  inTop5: boolean
): number => {
  if (actualPosition === null) {
    return 0; // Rider hasn't finished yet
  }

  const difference = Math.abs(predictedPosition - actualPosition);

  if (difference === 0) {
    return 10; // Exact match
  } else if (difference === 1) {
    return 7; // Off by 1
  } else if (difference === 2) {
    return 4; // Off by 2
  } else if (inTop5) {
    return 3; // In top 5 but wrong position
  } else if (difference === 3) {
    return 1; // Off by 3
  }

  return 0; // Not in top 5 or off by 4+
};

/**
 * Get live race state with current positions
 */
export const getLiveRaceState = async (raceId: string): Promise<LiveRaceState | null> => {
  try {
    const { data: race, error: raceError } = await supabase
      .from('races')
      .select('*, race_results(*)')
      .eq('id', raceId)
      .single();

    if (raceError) {
      console.error('Error fetching live race state:', raceError);
      return null;
    }

    if (!race) {
      return null;
    }

    // Determine race status
    const now = new Date();
    const raceDate = new Date(race.date);
    const diff = raceDate.getTime() - now.getTime();
    const hoursDiff = diff / (1000 * 60 * 60);

    let status: LiveRaceState['status'] = 'not_started';
    if (race.race_results && race.race_results.length >= 5) {
      status = 'completed';
    } else if (hoursDiff <= 1 && hoursDiff >= -2) {
      // In progress if within 1 hour of start or up to 2 hours after
      status = 'in_progress';
    }

    // Map results to positions
    const positions: LiveRacePosition[] = (race.race_results || []).map((result: any) => ({
      position: result.position,
      riderId: result.rider_id,
      riderNumber: result.rider_number || 'N/A',
      riderName: result.rider_name || 'Unknown',
      crossedFinishAt: result.created_at,
      status: result.position > 0 ? 'finished' : 'racing',
    }));

    return {
      raceId: race.id,
      status,
      positions: positions.sort((a, b) => a.position - b.position),
      lastUpdate: new Date().toISOString(),
      totalLaps: 20, // Default for supercross
      currentLap: status === 'completed' ? 20 : Math.floor(positions.length / 2),
    };
  } catch (error) {
    console.error('Error in getLiveRaceState:', error);
    return null;
  }
};

/**
 * Calculate live score for a user's prediction
 */
export const calculateLiveScore = async (
  userId: string,
  raceId: string
): Promise<LiveUserScore | null> => {
  try {
    // Get user's prediction
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('race_id', raceId)
      .single();

    if (predError || !prediction) {
      console.error('Error fetching prediction:', predError);
      return null;
    }

    // Get live race results
    const { data: results, error: resultsError } = await supabase
      .from('race_results')
      .select('*')
      .eq('race_id', raceId)
      .order('position', { ascending: true });

    if (resultsError) {
      console.error('Error fetching race results:', resultsError);
      return null;
    }

    // Calculate points for each prediction
    const picks = [
      prediction.pick_1,
      prediction.pick_2,
      prediction.pick_3,
      prediction.pick_4,
      prediction.pick_5,
    ];

    let currentPoints = 0;
    let correctPicks = 0;
    let potentialPoints = 0;

    picks.forEach((pick, index) => {
      const predictedPosition = index + 1;
      const actualResult = results?.find((r: any) => r.rider_id === pick);
      const actualPosition = actualResult?.position || null;
      const inTop5 = actualResult && actualResult.position <= 5;

      if (actualPosition !== null) {
        // Rider has finished - add actual points
        const points = calculatePointsForPosition(predictedPosition, actualPosition, inTop5);
        currentPoints += points;
        if (predictedPosition === actualPosition) {
          correctPicks++;
        }
      } else {
        // Rider hasn't finished - add potential max points
        potentialPoints += 10;
      }
    });

    // Total possible if all remaining predictions are perfect
    const totalPotential = currentPoints + potentialPoints;

    // Get ranking
    const { data: allScores, error: scoresError } = await supabase
      .from('predictions')
      .select('user_id, points_earned')
      .eq('race_id', raceId)
      .order('points_earned', { ascending: false });

    if (scoresError) {
      console.error('Error fetching scores:', scoresError);
    }

    const rank = allScores
      ? allScores.findIndex((s: any) => s.user_id === userId) + 1
      : 1;
    const totalParticipants = allScores ? allScores.length : 1;

    return {
      userId,
      raceId,
      currentPoints,
      potentialPoints: totalPotential,
      correctPicks,
      totalPicks: picks.length,
      rank,
      totalParticipants,
    };
  } catch (error) {
    console.error('Error in calculateLiveScore:', error);
    return null;
  }
};

/**
 * Get live leaderboard for a race
 */
export const getLiveLeaderboard = async (
  raceId: string,
  limit: number = 10
): Promise<LiveUserScore[]> => {
  try {
    // Get all predictions for this race
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('user_id, profiles(username, avatar_url)')
      .eq('race_id', raceId);

    if (predError || !predictions) {
      console.error('Error fetching predictions:', predError);
      return [];
    }

    // Calculate live score for each user
    const scores: LiveUserScore[] = [];
    for (const pred of predictions) {
      const score = await calculateLiveScore(pred.user_id, raceId);
      if (score) {
        scores.push(score);
      }
    }

    // Sort by current points (desc), then by potential points (desc)
    scores.sort((a, b) => {
      if (b.currentPoints !== a.currentPoints) {
        return b.currentPoints - a.currentPoints;
      }
      return b.potentialPoints - a.potentialPoints;
    });

    // Update ranks
    scores.forEach((score, index) => {
      score.rank = index + 1;
      score.totalParticipants = scores.length;
    });

    return scores.slice(0, limit);
  } catch (error) {
    console.error('Error in getLiveLeaderboard:', error);
    return [];
  }
};

/**
 * Subscribe to live race updates using Supabase Realtime
 */
export const subscribeToLiveRace = (
  raceId: string,
  onUpdate: (state: LiveRaceState) => void
) => {
  const channel = supabase
    .channel(`race_${raceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'race_results',
        filter: `race_id=eq.${raceId}`,
      },
      async (payload) => {
        console.log('Live race update:', payload);
        const state = await getLiveRaceState(raceId);
        if (state) {
          onUpdate(state);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'race_results',
        filter: `race_id=eq.${raceId}`,
      },
      async (payload) => {
        console.log('Live race update:', payload);
        const state = await getLiveRaceState(raceId);
        if (state) {
          onUpdate(state);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribe to live leaderboard updates
 */
export const subscribeToLiveLeaderboard = (
  raceId: string,
  onUpdate: (leaderboard: LiveUserScore[]) => void
) => {
  const channel = supabase
    .channel(`leaderboard_${raceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'race_results',
        filter: `race_id=eq.${raceId}`,
      },
      async () => {
        const leaderboard = await getLiveLeaderboard(raceId);
        onUpdate(leaderboard);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
