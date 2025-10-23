/**
 * Friends Service
 *
 * Manages friend relationships and social features:
 * - Follow/unfollow users
 * - Search for users
 * - Get friends list
 * - Friend leaderboards
 * - Friend activity feed
 * - Friend statistics
 */

import { supabase } from './supabase';

export interface FriendProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_predictions: number;
  accuracy_percentage: number;
  racing_iq_level: number;
  current_streak: number;
  total_points: number;
  is_following: boolean;
}

export interface FriendActivity {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  activity_type: 'prediction' | 'achievement' | 'rank_change';
  activity_data: {
    raceName?: string;
    points?: number;
    achievementTitle?: string;
    newRank?: number;
    previousRank?: number;
  };
  created_at: string;
}

export interface FriendStats {
  userId: string;
  friendId: string;
  headToHeadWins: number;
  headToHeadLosses: number;
  averagePointsDifference: number;
  racesCompeted: number;
}

/**
 * Follow a user
 */
export const followUser = async (userId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('=e [FRIENDS] Following user:', targetUserId);

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: userId,
        following_id: targetUserId,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;

    console.log(' [FRIENDS] User followed successfully');
    return true;
  } catch (error) {
    console.error('L [FRIENDS] Error following user:', error);
    return false;
  }
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (userId: string, targetUserId: string): Promise<boolean> => {
  try {
    console.log('=e [FRIENDS] Unfollowing user:', targetUserId);

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', targetUserId);

    if (error) throw error;

    console.log(' [FRIENDS] User unfollowed successfully');
    return true;
  } catch (error) {
    console.error('L [FRIENDS] Error unfollowing user:', error);
    return false;
  }
};

/**
 * Check if user is following another user
 */
export const isFollowing = async (userId: string, targetUserId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    return !!data;
  } catch (error) {
    console.error('L [FRIENDS] Error checking follow status:', error);
    return false;
  }
};

/**
 * Get list of users that a user is following
 */
export const getFollowing = async (userId: string): Promise<FriendProfile[]> => {
  try {
    console.log('=e [FRIENDS] Fetching following list for user:', userId);

    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followsError) throw followsError;

    if (!follows || follows.length === 0) {
      return [];
    }

    const followingIds = follows.map(f => f.following_id);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followingIds);

    if (profilesError) throw profilesError;

    const friendProfiles: FriendProfile[] = (profiles || []).map(p => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      total_predictions: p.total_predictions || 0,
      accuracy_percentage: p.accuracy_percentage || 0,
      racing_iq_level: p.racing_iq_level || 0,
      current_streak: p.current_streak || 0,
      total_points: p.total_points || 0,
      is_following: true,
    }));

    console.log(' [FRIENDS] Following list fetched:', friendProfiles.length);
    return friendProfiles;
  } catch (error) {
    console.error('L [FRIENDS] Error fetching following list:', error);
    return [];
  }
};

/**
 * Get list of users following a user (followers)
 */
export const getFollowers = async (userId: string): Promise<FriendProfile[]> => {
  try {
    console.log('=e [FRIENDS] Fetching followers for user:', userId);

    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (followsError) throw followsError;

    if (!follows || follows.length === 0) {
      return [];
    }

    const followerIds = follows.map(f => f.follower_id);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followerIds);

    if (profilesError) throw profilesError;

    // Check if current user follows each of these users back
    const currentUserFollows = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .in('following_id', followerIds);

    const followingSet = new Set(currentUserFollows.data?.map(f => f.following_id) || []);

    const friendProfiles: FriendProfile[] = (profiles || []).map(p => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      total_predictions: p.total_predictions || 0,
      accuracy_percentage: p.accuracy_percentage || 0,
      racing_iq_level: p.racing_iq_level || 0,
      current_streak: p.current_streak || 0,
      total_points: p.total_points || 0,
      is_following: followingSet.has(p.id),
    }));

    console.log(' [FRIENDS] Followers fetched:', friendProfiles.length);
    return friendProfiles;
  } catch (error) {
    console.error('L [FRIENDS] Error fetching followers:', error);
    return [];
  }
};

/**
 * Search for users by username or display name
 */
export const searchUsers = async (
  query: string,
  currentUserId: string,
  limit: number = 20
): Promise<FriendProfile[]> => {
  try {
    console.log('= [FRIENDS] Searching users:', query);

    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchQuery = `%${query.trim()}%`;

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.${searchQuery},display_name.ilike.${searchQuery}`)
      .neq('id', currentUserId)
      .limit(limit);

    if (error) throw error;

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Check which users are being followed
    const profileIds = profiles.map(p => p.id);
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .in('following_id', profileIds);

    const followingSet = new Set(follows?.map(f => f.following_id) || []);

    const friendProfiles: FriendProfile[] = profiles.map(p => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      total_predictions: p.total_predictions || 0,
      accuracy_percentage: p.accuracy_percentage || 0,
      racing_iq_level: p.racing_iq_level || 0,
      current_streak: p.current_streak || 0,
      total_points: p.total_points || 0,
      is_following: followingSet.has(p.id),
    }));

    console.log(' [FRIENDS] Found', friendProfiles.length, 'users');
    return friendProfiles;
  } catch (error) {
    console.error('L [FRIENDS] Error searching users:', error);
    return [];
  }
};

/**
 * Get friends leaderboard (users you follow, sorted by points)
 */
export const getFriendsLeaderboard = async (
  userId: string,
  limit: number = 50
): Promise<FriendProfile[]> => {
  try {
    console.log('<Æ [FRIENDS] Fetching friends leaderboard');

    const friends = await getFollowing(userId);

    // Sort by total points descending
    const leaderboard = friends.sort((a, b) => b.total_points - a.total_points);

    console.log(' [FRIENDS] Friends leaderboard fetched:', leaderboard.length);
    return leaderboard.slice(0, limit);
  } catch (error) {
    console.error('L [FRIENDS] Error fetching friends leaderboard:', error);
    return [];
  }
};

/**
 * Get friend activity feed
 */
export const getFriendActivity = async (
  userId: string,
  limit: number = 20
): Promise<FriendActivity[]> => {
  try {
    console.log('=ð [FRIENDS] Fetching friend activity feed');

    // Get list of friends
    const friends = await getFollowing(userId);
    if (friends.length === 0) {
      return [];
    }

    const friendIds = friends.map(f => f.id);

    // Get recent predictions from friends
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select(`
        id,
        user_id,
        race_id,
        created_at,
        race:races(name)
      `)
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (predError) throw predError;

    // Create activity feed
    const activities: FriendActivity[] = [];

    for (const prediction of predictions || []) {
      const friend = friends.find(f => f.id === prediction.user_id);
      if (!friend) continue;

      // Get score for this prediction
      const { data: score } = await supabase
        .from('prediction_scores')
        .select('points_earned')
        .eq('prediction_id', prediction.id)
        .single();

      activities.push({
        id: prediction.id,
        user_id: friend.id,
        username: friend.username,
        display_name: friend.display_name,
        avatar_url: friend.avatar_url,
        activity_type: 'prediction',
        activity_data: {
          raceName: prediction.race?.name || 'Unknown Race',
          points: score?.points_earned || 0,
        },
        created_at: prediction.created_at,
      });
    }

    console.log(' [FRIENDS] Activity feed fetched:', activities.length, 'activities');
    return activities;
  } catch (error) {
    console.error('L [FRIENDS] Error fetching friend activity:', error);
    return [];
  }
};

/**
 * Get head-to-head stats between two users
 */
export const getHeadToHeadStats = async (
  userId: string,
  friendId: string
): Promise<FriendStats | null> => {
  try {
    console.log('=Ê [FRIENDS] Fetching head-to-head stats');

    // Get all races where both users made predictions
    const { data: userPredictions } = await supabase
      .from('predictions')
      .select('race_id, id')
      .eq('user_id', userId);

    const { data: friendPredictions } = await supabase
      .from('predictions')
      .select('race_id, id')
      .eq('user_id', friendId);

    if (!userPredictions || !friendPredictions) {
      return {
        userId,
        friendId,
        headToHeadWins: 0,
        headToHeadLosses: 0,
        averagePointsDifference: 0,
        racesCompeted: 0,
      };
    }

    // Find common races
    const userRaceIds = new Set(userPredictions.map(p => p.race_id));
    const commonRaces = friendPredictions.filter(p => userRaceIds.has(p.race_id));

    if (commonRaces.length === 0) {
      return {
        userId,
        friendId,
        headToHeadWins: 0,
        headToHeadLosses: 0,
        averagePointsDifference: 0,
        racesCompeted: 0,
      };
    }

    // Get scores for both users in these races
    const userPredictionIds = userPredictions
      .filter(p => commonRaces.some(cr => cr.race_id === p.race_id))
      .map(p => p.id);

    const friendPredictionIds = commonRaces.map(p => p.id);

    const { data: userScores } = await supabase
      .from('prediction_scores')
      .select('prediction_id, points_earned')
      .in('prediction_id', userPredictionIds);

    const { data: friendScores } = await supabase
      .from('prediction_scores')
      .select('prediction_id, points_earned')
      .in('prediction_id', friendPredictionIds);

    // Calculate head-to-head wins
    let wins = 0;
    let losses = 0;
    let totalPointsDiff = 0;

    const userScoresMap = new Map(userScores?.map(s => [s.prediction_id, s.points_earned]) || []);
    const friendScoresMap = new Map(friendScores?.map(s => [s.prediction_id, s.points_earned]) || []);

    for (const race of commonRaces) {
      const userPred = userPredictions.find(p => p.race_id === race.race_id);
      if (!userPred) continue;

      const userPoints = userScoresMap.get(userPred.id) || 0;
      const friendPoints = friendScoresMap.get(race.id) || 0;

      totalPointsDiff += (userPoints - friendPoints);

      if (userPoints > friendPoints) {
        wins++;
      } else if (userPoints < friendPoints) {
        losses++;
      }
    }

    const stats: FriendStats = {
      userId,
      friendId,
      headToHeadWins: wins,
      headToHeadLosses: losses,
      averagePointsDifference: commonRaces.length > 0 ? totalPointsDiff / commonRaces.length : 0,
      racesCompeted: commonRaces.length,
    };

    console.log(' [FRIENDS] Head-to-head stats calculated:', stats);
    return stats;
  } catch (error) {
    console.error('L [FRIENDS] Error fetching head-to-head stats:', error);
    return null;
  }
};

/**
 * Get suggested users to follow (popular users)
 */
export const getSuggestedFriends = async (
  currentUserId: string,
  limit: number = 10
): Promise<FriendProfile[]> => {
  try {
    console.log('=¡ [FRIENDS] Fetching suggested friends');

    // Get users with highest points that user isn't following
    const { data: currentFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    const followingIds = currentFollows?.map(f => f.following_id) || [];
    followingIds.push(currentUserId); // Exclude self

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .not('id', 'in', `(${followingIds.join(',')})`)
      .order('total_points', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const suggestions: FriendProfile[] = (profiles || []).map(p => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      total_predictions: p.total_predictions || 0,
      accuracy_percentage: p.accuracy_percentage || 0,
      racing_iq_level: p.racing_iq_level || 0,
      current_streak: p.current_streak || 0,
      total_points: p.total_points || 0,
      is_following: false,
    }));

    console.log(' [FRIENDS] Suggested friends fetched:', suggestions.length);
    return suggestions;
  } catch (error) {
    console.error('L [FRIENDS] Error fetching suggested friends:', error);
    return [];
  }
};

/**
 * Get friend counts (following/followers)
 */
export const getFriendCounts = async (
  userId: string
): Promise<{ following: number; followers: number }> => {
  try {
    const { data: followingData } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);

    const { data: followersData } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId);

    return {
      following: followingData?.length || 0,
      followers: followersData?.length || 0,
    };
  } catch (error) {
    console.error('L [FRIENDS] Error fetching friend counts:', error);
    return { following: 0, followers: 0 };
  }
};
