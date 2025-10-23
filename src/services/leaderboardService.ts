import { supabase } from './supabase';
import { getUserScores, PredictionScore } from './resultsService';

export interface MemberStats {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  rank: number;
  points: number;
  country?: string | null;
}

export interface LeaderboardFilters {
  timePeriod?: 'week' | 'month' | 'season' | 'all';
  seriesType?: 'MX' | 'SX' | 'all';
  season?: string;
  startDate?: string;
  endDate?: string;
}

export type LeaderboardType = 'global' | 'friends' | 'regional';

/**
 * Calculate accuracy percentage
 */
function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Calculate points based on prediction accuracy
 * - 10 points per correct prediction
 * - Bonus points for streaks
 */
function calculatePoints(correct: number, bestStreak: number): number {
  const basePoints = correct * 10;
  const streakBonus = Math.floor(bestStreak / 3) * 5; // 5 bonus points for every 3-race streak
  return basePoints + streakBonus;
}

/**
 * Calculate current and best streaks from prediction scores
 * A streak is consecutive races where the user got at least one exact match
 */
function calculateStreaks(scores: PredictionScore[]): { currentStreak: number; bestStreak: number } {
  if (scores.length === 0) return { currentStreak: 0, bestStreak: 0 };

  // Sort scores by calculated_at date (most recent first)
  const sortedScores = [...scores].sort(
    (a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime()
  );

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // Calculate current streak (from most recent)
  for (let i = 0; i < sortedScores.length; i++) {
    if (sortedScores[i].exact_matches > 0) {
      if (i === currentStreak) {
        currentStreak++;
      }
    } else {
      break; // Current streak ends at first race without exact match
    }
  }

  // Calculate best streak (scan all races)
  for (const score of sortedScores) {
    if (score.exact_matches > 0) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { currentStreak, bestStreak };
}

/**
 * Get leaderboard for a specific group
 */
export const getGroupLeaderboard = async (groupId: string): Promise<MemberStats[]> => {
  try {
    console.log('📊 [LEADERBOARD] Fetching leaderboard for group:', groupId);

    // Get all group members with their profile data
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id, profiles(username, display_name, avatar_url)')
      .eq('group_id', groupId);

    if (membersError) throw membersError;
    if (!members || members.length === 0) return [];

    // For each member, get their stats from AsyncStorage-style tracking
    // NOTE: This currently uses the user_stats table that we need to migrate to Supabase
    // For now, we'll calculate stats from the predictions table

    const memberStats: MemberStats[] = await Promise.all(
      members.map(async (member: any) => {
        const userId = member.user_id;
        const profile = member.profiles;

        // Get all predictions for this user
        const { data: predictions, error: predictionsError } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', userId);

        if (predictionsError) {
          console.error('Error fetching predictions:', predictionsError);
          return {
            userId,
            username: profile?.username || 'Unknown',
            displayName: profile?.display_name || null,
            avatarUrl: profile?.avatar_url || null,
            totalPredictions: 0,
            correctPredictions: 0,
            accuracy: 0,
            currentStreak: 0,
            bestStreak: 0,
            rank: 0,
            points: 0,
          };
        }

        // Calculate stats from predictions and actual results
        const totalPredictions = predictions?.length || 0;

        // Get all scores for this user (only races with results)
        const scores = await getUserScores(userId);

        // Calculate total points from all scored races
        const totalPoints = scores.reduce((sum, score) => sum + score.points_earned, 0);

        // Count races where user got at least one exact match
        const correctPredictions = scores.filter(score => score.exact_matches > 0).length;

        // Calculate streaks: consecutive races with exact matches
        // Sort scores by race date (we'll need to enhance this later with race ordering)
        const { currentStreak, bestStreak } = calculateStreaks(scores);

        const accuracy = calculateAccuracy(correctPredictions, totalPredictions);
        const points = totalPoints;

        return {
          userId,
          username: profile?.username || 'Unknown',
          displayName: profile?.display_name || null,
          avatarUrl: profile?.avatar_url || null,
          totalPredictions,
          correctPredictions,
          accuracy,
          currentStreak,
          bestStreak,
          rank: 0, // Will be set after sorting
          points,
        };
      })
    );

    // Sort by points (highest first), then by accuracy, then by total predictions
    memberStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.totalPredictions - a.totalPredictions;
    });

    // Assign ranks
    memberStats.forEach((member, index) => {
      member.rank = index + 1;
    });

    console.log('✅ [LEADERBOARD] Calculated stats for', memberStats.length, 'members');
    return memberStats;
  } catch (error: any) {
    console.error('❌ [LEADERBOARD] Error:', error.message);
    return [];
  }
};

/**
 * Get a specific user's stats within a group
 */
export const getUserStatsInGroup = async (
  groupId: string,
  userId: string
): Promise<MemberStats | null> => {
  try {
    const leaderboard = await getGroupLeaderboard(groupId);
    const userStats = leaderboard.find((member) => member.userId === userId);
    return userStats || null;
  } catch (error: any) {
    console.error('❌ [USER STATS] Error:', error.message);
    return null;
  }
};

/**
 * Compare two users' stats side by side
 */
export const compareUsers = async (
  groupId: string,
  userId1: string,
  userId2: string
): Promise<{ user1: MemberStats | null; user2: MemberStats | null }> => {
  try {
    const leaderboard = await getGroupLeaderboard(groupId);
    const user1 = leaderboard.find((m) => m.userId === userId1) || null;
    const user2 = leaderboard.find((m) => m.userId === userId2) || null;
    return { user1, user2 };
  } catch (error: any) {
    console.error('❌ [COMPARE USERS] Error:', error.message);
    return { user1: null, user2: null };
  }
};

/**
 * Calculate date range based on time period filter
 */
function getDateRange(timePeriod?: 'week' | 'month' | 'season' | 'all'): { startDate?: string; endDate?: string } {
  if (!timePeriod || timePeriod === 'all') return {};

  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate: string | undefined;

  switch (timePeriod) {
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      startDate = monthAgo.toISOString().split('T')[0];
      break;
    case 'season':
      // Current season starts January 1st of current year
      startDate = `${now.getFullYear()}-01-01`;
      break;
  }

  return { startDate, endDate };
}

/**
 * Calculate user stats with optional filtering
 */
async function calculateUserStats(
  userId: string,
  profile: any,
  filters?: LeaderboardFilters
): Promise<MemberStats> {
  try {
    // Get date range for time filtering
    const dateRange = filters?.startDate && filters?.endDate
      ? { startDate: filters.startDate, endDate: filters.endDate }
      : getDateRange(filters?.timePeriod);

    // Build predictions query
    let predictionsQuery = supabase
      .from('predictions')
      .select('*, race:races(date, series_type)')
      .eq('user_id', userId);

    // Apply date filtering if specified
    if (dateRange.startDate) {
      predictionsQuery = predictionsQuery.gte('race.date', dateRange.startDate);
    }
    if (dateRange.endDate) {
      predictionsQuery = predictionsQuery.lte('race.date', dateRange.endDate);
    }

    const { data: predictions, error: predictionsError } = await predictionsQuery;

    if (predictionsError) {
      console.error('Error fetching predictions:', predictionsError);
      return createEmptyStats(userId, profile);
    }

    // Filter by series type if specified
    let filteredPredictions = predictions || [];
    if (filters?.seriesType && filters.seriesType !== 'all') {
      filteredPredictions = filteredPredictions.filter(
        (p: any) => p.race?.series_type === filters.seriesType
      );
    }

    const totalPredictions = filteredPredictions.length;

    // Get scores for filtered predictions
    const predictionIds = filteredPredictions.map((p: any) => p.id);

    if (predictionIds.length === 0) {
      return createEmptyStats(userId, profile);
    }

    let scoresQuery = supabase
      .from('prediction_scores')
      .select('*')
      .eq('user_id', userId)
      .in('prediction_id', predictionIds);

    const { data: scores, error: scoresError } = await scoresQuery;

    if (scoresError || !scores) {
      return createEmptyStats(userId, profile);
    }

    // Calculate stats
    const totalPoints = scores.reduce((sum, score) => sum + (score.points_earned || 0), 0);
    const correctPredictions = scores.filter(score => score.exact_matches > 0).length;
    const { currentStreak, bestStreak } = calculateStreaks(scores);
    const accuracy = calculateAccuracy(correctPredictions, totalPredictions);

    return {
      userId,
      username: profile?.username || 'Unknown',
      displayName: profile?.display_name || null,
      avatarUrl: profile?.avatar_url || null,
      country: profile?.country || null,
      totalPredictions,
      correctPredictions,
      accuracy,
      currentStreak,
      bestStreak,
      rank: 0,
      points: totalPoints,
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return createEmptyStats(userId, profile);
  }
}

/**
 * Create empty stats object
 */
function createEmptyStats(userId: string, profile: any): MemberStats {
  return {
    userId,
    username: profile?.username || 'Unknown',
    displayName: profile?.display_name || null,
    avatarUrl: profile?.avatar_url || null,
    country: profile?.country || null,
    totalPredictions: 0,
    correctPredictions: 0,
    accuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    rank: 0,
    points: 0,
  };
}

/**
 * Get global leaderboard (all users)
 */
export const getGlobalLeaderboard = async (
  filters?: LeaderboardFilters,
  limit: number = 100
): Promise<MemberStats[]> => {
  try {
    console.log('🌍 [GLOBAL LEADERBOARD] Fetching with filters:', filters);

    // Get all users with at least one prediction
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, country')
      .limit(limit * 2); // Fetch more than needed in case of filtering

    if (usersError) throw usersError;
    if (!users || users.length === 0) return [];

    // Calculate stats for each user with filters
    const userStats: MemberStats[] = await Promise.all(
      users.map((profile: any) => calculateUserStats(profile.id, profile, filters))
    );

    // Filter out users with no predictions in the filtered period
    const filteredStats = userStats.filter(stat => stat.totalPredictions > 0);

    // Sort by points, then accuracy, then total predictions
    filteredStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.totalPredictions - a.totalPredictions;
    });

    // Limit results
    const limitedStats = filteredStats.slice(0, limit);

    // Assign ranks
    limitedStats.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    console.log('✅ [GLOBAL LEADERBOARD] Calculated stats for', limitedStats.length, 'users');
    return limitedStats;
  } catch (error: any) {
    console.error('❌ [GLOBAL LEADERBOARD] Error:', error.message);
    return [];
  }
};

/**
 * Get friends leaderboard (users the current user follows)
 * Note: Requires a follows/friends table to be implemented
 */
export const getFriendsLeaderboard = async (
  userId: string,
  filters?: LeaderboardFilters
): Promise<MemberStats[]> => {
  try {
    console.log('👥 [FRIENDS LEADERBOARD] Fetching for user:', userId);

    // TODO: Implement follows/friends system
    // For now, return empty array as placeholder
    // Future implementation:
    // 1. Query follows table for users that current user follows
    // 2. Calculate stats for those users
    // 3. Sort and return

    console.log('⚠️ [FRIENDS LEADERBOARD] Not yet implemented - requires follows system');
    return [];
  } catch (error: any) {
    console.error('❌ [FRIENDS LEADERBOARD] Error:', error.message);
    return [];
  }
};

/**
 * Get regional leaderboard (users from same country/region)
 */
export const getRegionalLeaderboard = async (
  userCountry: string,
  filters?: LeaderboardFilters,
  limit: number = 100
): Promise<MemberStats[]> => {
  try {
    console.log('🌎 [REGIONAL LEADERBOARD] Fetching for country:', userCountry);

    // Get users from the same country
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, country')
      .eq('country', userCountry)
      .limit(limit * 2);

    if (usersError) throw usersError;
    if (!users || users.length === 0) return [];

    // Calculate stats for each user with filters
    const userStats: MemberStats[] = await Promise.all(
      users.map((profile: any) => calculateUserStats(profile.id, profile, filters))
    );

    // Filter out users with no predictions
    const filteredStats = userStats.filter(stat => stat.totalPredictions > 0);

    // Sort by points
    filteredStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.totalPredictions - a.totalPredictions;
    });

    // Limit results
    const limitedStats = filteredStats.slice(0, limit);

    // Assign ranks
    limitedStats.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    console.log('✅ [REGIONAL LEADERBOARD] Calculated stats for', limitedStats.length, 'users');
    return limitedStats;
  } catch (error: any) {
    console.error('❌ [REGIONAL LEADERBOARD] Error:', error.message);
    return [];
  }
};

/**
 * Get user's rank in a specific leaderboard type
 */
export const getUserRank = async (
  userId: string,
  leaderboardType: LeaderboardType,
  filters?: LeaderboardFilters
): Promise<{ rank: number; total: number; stats: MemberStats | null }> => {
  try {
    let leaderboard: MemberStats[] = [];

    switch (leaderboardType) {
      case 'global':
        leaderboard = await getGlobalLeaderboard(filters, 1000);
        break;
      case 'friends':
        leaderboard = await getFriendsLeaderboard(userId, filters);
        break;
      case 'regional':
        // Get user's country first
        const { data: profile } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', userId)
          .single();
        if (profile?.country) {
          leaderboard = await getRegionalLeaderboard(profile.country, filters, 1000);
        }
        break;
    }

    const userStats = leaderboard.find(stat => stat.userId === userId);

    return {
      rank: userStats?.rank || 0,
      total: leaderboard.length,
      stats: userStats || null,
    };
  } catch (error: any) {
    console.error('❌ [USER RANK] Error:', error.message);
    return { rank: 0, total: 0, stats: null };
  }
};

/**
 * Get available seasons for filtering
 */
export const getAvailableSeasons = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('races')
      .select('date')
      .order('date', { ascending: false });

    if (error || !data) return [];

    const years = new Set<string>();
    data.forEach(race => {
      if (race.date) {
        const year = new Date(race.date).getFullYear().toString();
        years.add(year);
      }
    });

    return Array.from(years).sort((a, b) => b.localeCompare(a));
  } catch (error) {
    console.error('Error getting available seasons:', error);
    return [];
  }
};
