import { supabase } from '../config/supabase';

// Types
export interface Rivalry {
  id: string;
  user_id: string;
  rival_id: string;
  created_at: string;
  status: 'active' | 'inactive';
}

export interface RivalryStat {
  id: string;
  rivalry_id: string;
  race_id: string;
  user_score: number;
  rival_score: number;
  winner_id: string | null;
  result: 'win' | 'loss' | 'tie';
  race_name?: string;
  race_date?: string;
}

export interface RivalrySummary {
  rivalry_id: string;
  user_id: string;
  rival_id: string;
  total_races: number;
  wins: number;
  losses: number;
  ties: number;
  total_user_score: number;
  total_rival_score: number;
  avg_score_diff: number;
  status: string;
  rival_username?: string;
  rival_avatar?: string;
}

export interface RivalProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  league_rank?: number;
}

export interface HeadToHeadRecord {
  rivalry: Rivalry;
  summary: RivalrySummary;
  recent_races: RivalryStat[];
  rival_profile: RivalProfile;
}

// Create a new rivalry
export async function createRivalry(userId: string, rivalId: string): Promise<{ success: boolean; rivalry?: Rivalry; error?: string }> {
  try {
    // Check if rivalry already exists
    const exists = await checkRivalryExists(userId, rivalId);
    if (exists) {
      return { success: false, error: 'Rivalry already exists' };
    }

    // Check if trying to rival yourself
    if (userId === rivalId) {
      return { success: false, error: 'Cannot create rivalry with yourself' };
    }

    const { data, error } = await supabase
      .from('rivalries')
      .insert([{ user_id: userId, rival_id: rivalId }])
      .select()
      .single();

    if (error) throw error;

    return { success: true, rivalry: data };
  } catch (error) {
    console.error('Error creating rivalry:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Delete a rivalry
export async function deleteRivalry(rivalryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('rivalries')
      .delete()
      .eq('id', rivalryId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting rivalry:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Toggle rivalry status (active/inactive)
export async function toggleRivalryStatus(rivalryId: string, status: 'active' | 'inactive'): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('rivalries')
      .update({ status })
      .eq('id', rivalryId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error toggling rivalry status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get all rivalries for a user
export async function getUserRivalries(userId: string): Promise<RivalrySummary[]> {
  try {
    const { data, error } = await supabase
      .from('rivalry_summaries')
      .select(`
        *,
        rival:profiles!rivalry_summaries_rival_id_fkey(username, avatar_url)
      `)
      .eq('user_id', userId)
      .order('total_races', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      ...item,
      rival_username: item.rival?.username,
      rival_avatar: item.rival?.avatar_url,
    }));
  } catch (error) {
    console.error('Error fetching user rivalries:', error);
    return [];
  }
}

// Get active rivalries only
export async function getActiveRivalries(userId: string): Promise<RivalrySummary[]> {
  try {
    const { data, error } = await supabase
      .from('rivalry_summaries')
      .select(`
        *,
        rival:profiles!rivalry_summaries_rival_id_fkey(username, avatar_url)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('total_races', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      ...item,
      rival_username: item.rival?.username,
      rival_avatar: item.rival?.avatar_url,
    }));
  } catch (error) {
    console.error('Error fetching active rivalries:', error);
    return [];
  }
}

// Get rivalry by ID
export async function getRivalryById(rivalryId: string): Promise<Rivalry | null> {
  try {
    const { data, error } = await supabase
      .from('rivalries')
      .select('*')
      .eq('id', rivalryId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching rivalry:', error);
    return null;
  }
}

// Get head-to-head record between two users
export async function getHeadToHeadRecord(userId: string, rivalId: string): Promise<HeadToHeadRecord | null> {
  try {
    // Get rivalry
    const { data: rivalry, error: rivalryError } = await supabase
      .from('rivalries')
      .select('*')
      .or(`and(user_id.eq.${userId},rival_id.eq.${rivalId}),and(user_id.eq.${rivalId},rival_id.eq.${userId})`)
      .single();

    if (rivalryError) throw rivalryError;

    // Get summary
    const { data: summary, error: summaryError } = await supabase
      .from('rivalry_summaries')
      .select('*')
      .eq('rivalry_id', rivalry.id)
      .single();

    if (summaryError) throw summaryError;

    // Get recent races
    const { data: recentRaces, error: racesError } = await supabase
      .from('rivalry_stats')
      .select(`
        *,
        race:races(name, date)
      `)
      .eq('rivalry_id', rivalry.id)
      .order('race:races(date)', { ascending: false })
      .limit(10);

    if (racesError) throw racesError;

    // Get rival profile
    const { data: rivalProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, total_points')
      .eq('id', rivalId)
      .single();

    if (profileError) throw profileError;

    return {
      rivalry,
      summary,
      recent_races: recentRaces.map(race => ({
        ...race,
        race_name: race.race?.name,
        race_date: race.race?.date,
      })),
      rival_profile: rivalProfile,
    };
  } catch (error) {
    console.error('Error fetching head-to-head record:', error);
    return null;
  }
}

// Get rivalry stats for a specific race
export async function getRivalryStatsForRace(raceId: string, userId: string): Promise<RivalryStat[]> {
  try {
    const { data, error } = await supabase
      .from('rivalry_stats')
      .select(`
        *,
        rivalry:rivalries(user_id, rival_id, status)
      `)
      .eq('race_id', raceId)
      .or(`rivalry.user_id.eq.${userId},rivalry.rival_id.eq.${userId}`);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching rivalry stats for race:', error);
    return [];
  }
}

// Search for potential rivals
export async function searchPotentialRivals(userId: string, searchTerm: string): Promise<RivalProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, total_points')
      .neq('id', userId)
      .ilike('username', `%${searchTerm}%`)
      .limit(20);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error searching potential rivals:', error);
    return [];
  }
}

// Get suggested rivals (users with similar points)
export async function getSuggestedRivals(userId: string): Promise<RivalProfile[]> {
  try {
    // Get current user's points
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('total_points')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const userPoints = userProfile.total_points || 0;
    const pointRange = 500; // Suggest users within 500 points

    // Get users with similar points
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, total_points')
      .neq('id', userId)
      .gte('total_points', userPoints - pointRange)
      .lte('total_points', userPoints + pointRange)
      .order('total_points', { ascending: false })
      .limit(10);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting suggested rivals:', error);
    return [];
  }
}

// Get rivalry leaderboard (top rivalries by total races)
export async function getRivalryLeaderboard(limit: number = 10): Promise<RivalrySummary[]> {
  try {
    const { data, error } = await supabase
      .from('rivalry_summaries')
      .select(`
        *,
        user:profiles!rivalry_summaries_user_id_fkey(username, avatar_url),
        rival:profiles!rivalry_summaries_rival_id_fkey(username, avatar_url)
      `)
      .eq('status', 'active')
      .order('total_races', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(item => ({
      ...item,
      rival_username: item.rival?.username,
      rival_avatar: item.rival?.avatar_url,
    }));
  } catch (error) {
    console.error('Error fetching rivalry leaderboard:', error);
    return [];
  }
}

// Check if rivalry exists
export async function checkRivalryExists(userId: string, rivalId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('rivalries')
      .select('id')
      .or(`and(user_id.eq.${userId},rival_id.eq.${rivalId}),and(user_id.eq.${rivalId},rival_id.eq.${userId})`)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found" error

    return !!data;
  } catch (error) {
    console.error('Error checking rivalry existence:', error);
    return false;
  }
}

// Get total rivalry count for a user
export async function getUserRivalryCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('rivalries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting rivalry count:', error);
    return 0;
  }
}
