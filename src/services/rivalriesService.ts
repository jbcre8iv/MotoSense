/**
 * Rivalries Service
 *
 * Manages head-to-head rivalries between users.
 * Tracks win/loss records, recent matchups, and rivalry statistics.
 */

import { supabase } from './supabase';

export interface Rivalry {
  id: string;
  user_id: string;
  rival_id: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface RivalrySummary {
  rivalry_id: string;
  user_id: string;
  rival_id: string;
  status: string;
  created_at: string;
  user_username: string;
  user_avatar: string | null;
  rival_username: string;
  rival_avatar: string | null;
  total_races: number;
  wins: number;
  losses: number;
  ties: number;
  total_user_score: number;
  total_rival_score: number;
  last_competed: string | null;
}

export interface RivalryMatchup {
  race_id: string;
  race_name: string;
  race_date: string;
  user_score: number;
  rival_score: number;
  winner_id: string | null;
  result: 'win' | 'loss' | 'tie';
}

/**
 * Create a new rivalry
 */
export const createRivalry = async (userId: string, rivalId: string): Promise<Rivalry | null> => {
  try {
    // Check if rivalry already exists (in either direction)
    const { data: existing } = await supabase
      .from('rivalries')
      .select('*')
      .or(`and(user_id.eq.${userId},rival_id.eq.${rivalId}),and(user_id.eq.${rivalId},rival_id.eq.${userId})`);

    if (existing && existing.length > 0) {
      console.log('Rivalry already exists');
      return existing[0];
    }

    // Create new rivalry
    const { data, error } = await supabase
      .from('rivalries')
      .insert([
        {
          user_id: userId,
          rival_id: rivalId,
          status: 'active',
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating rivalry:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createRivalry:', error);
    return null;
  }
};

/**
 * Get all rivalries for a user
 */
export const getUserRivalries = async (userId: string): Promise<RivalrySummary[]> => {
  try {
    const { data, error } = await supabase
      .from('rivalry_summaries')
      .select('*')
      .or(`user_id.eq.${userId},rival_id.eq.${userId}`)
      .eq('status', 'active')
      .order('last_competed', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching rivalries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserRivalries:', error);
    return [];
  }
};

/**
 * Get specific rivalry between two users
 */
export const getRivalry = async (userId: string, rivalId: string): Promise<RivalrySummary | null> => {
  try {
    const { data, error } = await supabase
      .from('rivalry_summaries')
      .select('*')
      .or(`and(user_id.eq.${userId},rival_id.eq.${rivalId}),and(user_id.eq.${rivalId},rival_id.eq.${userId})`)
      .single();

    if (error) {
      console.error('Error fetching rivalry:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getRivalry:', error);
    return null;
  }
};

/**
 * Get head-to-head matchup history
 */
export const getRivalryMatchups = async (rivalryId: string): Promise<RivalryMatchup[]> => {
  try {
    const { data, error } = await supabase
      .from('rivalry_stats')
      .select(
        `
        *,
        races(id, name, date)
      `
      )
      .eq('rivalry_id', rivalryId)
      .order('calculated_at', { ascending: false });

    if (error) {
      console.error('Error fetching matchups:', error);
      return [];
    }

    return (data || []).map((stat: any) => ({
      race_id: stat.race_id,
      race_name: stat.races?.name || 'Unknown Race',
      race_date: stat.races?.date || stat.calculated_at,
      user_score: stat.user_score,
      rival_score: stat.rival_score,
      winner_id: stat.winner_id,
      result: stat.result,
    }));
  } catch (error) {
    console.error('Error in getRivalryMatchups:', error);
    return [];
  }
};

/**
 * Delete a rivalry
 */
export const deleteRivalry = async (rivalryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('rivalries')
      .delete()
      .eq('id', rivalryId);

    if (error) {
      console.error('Error deleting rivalry:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteRivalry:', error);
    return false;
  }
};

/**
 * Update rivalry status
 */
export const updateRivalryStatus = async (
  rivalryId: string,
  status: 'active' | 'inactive'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('rivalries')
      .update({ status })
      .eq('id', rivalryId);

    if (error) {
      console.error('Error updating rivalry status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateRivalryStatus:', error);
    return false;
  }
};

/**
 * Get suggested rivals (users with similar prediction counts)
 */
export const getSuggestedRivals = async (
  userId: string,
  limit: number = 10
): Promise<any[]> => {
  try {
    // Get users with similar activity levels
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, total_predictions')
      .neq('id', userId)
      .not('total_predictions', 'is', null)
      .order('total_predictions', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching suggested rivals:', error);
      return [];
    }

    // Filter out existing rivals
    const { data: existingRivalries } = await supabase
      .from('rivalries')
      .select('rival_id')
      .eq('user_id', userId);

    const existingRivalIds = (existingRivalries || []).map((r: any) => r.rival_id);

    return (data || []).filter((user: any) => !existingRivalIds.includes(user.id));
  } catch (error) {
    console.error('Error in getSuggestedRivals:', error);
    return [];
  }
};

/**
 * Get rivalry leaderboard (top rivalries by activity)
 */
export const getRivalryLeaderboard = async (limit: number = 20): Promise<RivalrySummary[]> => {
  try {
    const { data, error } = await supabase
      .from('rivalry_summaries')
      .select('*')
      .eq('status', 'active')
      .gte('total_races', 1)
      .order('total_races', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching rivalry leaderboard:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRivalryLeaderboard:', error);
    return [];
  }
};

/**
 * Calculate win percentage
 */
export const calculateWinPercentage = (wins: number, losses: number, ties: number): number => {
  const total = wins + losses + ties;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
};

/**
 * Get rivalry streak (consecutive wins/losses)
 */
export const getRivalryStreak = async (rivalryId: string): Promise<{
  type: 'win' | 'loss' | 'none';
  count: number;
}> => {
  try {
    const { data, error } = await supabase
      .from('rivalry_stats')
      .select('result')
      .eq('rivalry_id', rivalryId)
      .order('calculated_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      return { type: 'none', count: 0 };
    }

    const firstResult = data[0].result;
    if (firstResult === 'tie') {
      return { type: 'none', count: 0 };
    }

    let streakCount = 0;
    for (const stat of data) {
      if (stat.result === firstResult) {
        streakCount++;
      } else {
        break;
      }
    }

    return {
      type: firstResult as 'win' | 'loss',
      count: streakCount,
    };
  } catch (error) {
    console.error('Error in getRivalryStreak:', error);
    return { type: 'none', count: 0 };
  }
};

/**
 * Search for users to add as rivals
 */
export const searchUsersForRivalry = async (
  currentUserId: string,
  query: string
): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, total_predictions, total_points')
      .neq('id', currentUserId)
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchUsersForRivalry:', error);
    return [];
  }
};
