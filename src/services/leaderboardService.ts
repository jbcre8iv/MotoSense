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
}

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
