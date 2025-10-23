import { supabase } from './supabase';

// Types
export interface ActivityFeed {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  related_user_id: string | null;
  related_race_id: string | null;
  related_group_id: string | null;
  points_earned: number;
  is_read: boolean;
  created_at: string;
  // Joined data
  related_user?: {
    username: string;
    avatar_url: string | null;
  };
  related_race?: {
    name: string;
    date: string;
  };
  related_group?: {
    name: string;
  };
}

export type ActivityType =
  | 'prediction_made'
  | 'race_completed'
  | 'achievement_unlocked'
  | 'group_joined'
  | 'rivalry_created'
  | 'challenge_won'
  | 'rank_improved'
  | 'perfect_prediction';

export interface ActivityFeedOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  activityTypes?: ActivityType[];
}

// Get user's activity feed
export async function getActivityFeed(
  userId: string,
  options: ActivityFeedOptions = {}
): Promise<ActivityFeed[]> {
  try {
    const {
      limit = 50,
      offset = 0,
      unreadOnly = false,
      activityTypes,
    } = options;

    let query = supabase
      .from('activity_feed')
      .select(`
        *,
        related_user:profiles!activity_feed_related_user_id_fkey(username, avatar_url),
        related_race:races!activity_feed_related_race_id_fkey(name, date),
        related_group:groups!activity_feed_related_group_id_fkey(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (activityTypes && activityTypes.length > 0) {
      query = query.in('activity_type', activityTypes);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
}

// Get unread activity count
export async function getUnreadActivityCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

// Mark activity as read
export async function markActivityAsRead(activityId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('activity_feed')
      .update({ is_read: true })
      .eq('id', activityId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error marking activity as read:', error);
    return false;
  }
}

// Mark all activities as read
export async function markAllActivitiesAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('activity_feed')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error marking all activities as read:', error);
    return false;
  }
}

// Create prediction activity
export async function createPredictionActivity(
  userId: string,
  raceId: string,
  raceName: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_prediction_activity', {
      p_user_id: userId,
      p_race_id: raceId,
      p_race_name: raceName,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating prediction activity:', error);
    return null;
  }
}

// Create race completion activity
export async function createRaceCompletionActivity(
  userId: string,
  raceId: string,
  raceName: string,
  pointsEarned: number,
  rank: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_race_completion_activity', {
      p_user_id: userId,
      p_race_id: raceId,
      p_race_name: raceName,
      p_points_earned: pointsEarned,
      p_rank: rank,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating race completion activity:', error);
    return null;
  }
}

// Create achievement activity
export async function createAchievementActivity(
  userId: string,
  achievementName: string,
  achievementDescription: string,
  achievementIcon: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_achievement_activity', {
      p_user_id: userId,
      p_achievement_name: achievementName,
      p_achievement_description: achievementDescription,
      p_achievement_icon: achievementIcon,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating achievement activity:', error);
    return null;
  }
}

// Create rivalry activity
export async function createRivalryActivity(
  userId: string,
  rivalId: string,
  rivalUsername: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_rivalry_activity', {
      p_user_id: userId,
      p_rival_id: rivalId,
      p_rival_username: rivalUsername,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating rivalry activity:', error);
    return null;
  }
}

// Create group joined activity
export async function createGroupJoinedActivity(
  userId: string,
  groupId: string,
  groupName: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('activity_feed')
      .insert({
        user_id: userId,
        activity_type: 'group_joined',
        title: 'Joined Group',
        description: `You joined ${groupName}`,
        related_group_id: groupId,
        metadata: { group_name: groupName },
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error('Error creating group joined activity:', error);
    return null;
  }
}

// Create rank improved activity
export async function createRankImprovedActivity(
  userId: string,
  oldRank: number,
  newRank: number,
  context: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('activity_feed')
      .insert({
        user_id: userId,
        activity_type: 'rank_improved',
        title: 'Rank Improved!',
        description: `You moved from #${oldRank} to #${newRank} ${context}`,
        metadata: {
          old_rank: oldRank,
          new_rank: newRank,
          context,
        },
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error('Error creating rank improved activity:', error);
    return null;
  }
}

// Create perfect prediction activity
export async function createPerfectPredictionActivity(
  userId: string,
  raceId: string,
  raceName: string,
  pointsEarned: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('activity_feed')
      .insert({
        user_id: userId,
        activity_type: 'perfect_prediction',
        title: 'Perfect Prediction!',
        description: `You got all 5 riders correct for ${raceName}!`,
        related_race_id: raceId,
        points_earned: pointsEarned,
        metadata: {
          race_name: raceName,
          points: pointsEarned,
        },
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error('Error creating perfect prediction activity:', error);
    return null;
  }
}

// Subscribe to new activities (real-time)
export function subscribeToActivityFeed(
  userId: string,
  onNewActivity: (activity: ActivityFeed) => void
) {
  const channel = supabase
    .channel(`activity_feed_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        // Fetch the full activity with joined data
        const { data } = await supabase
          .from('activity_feed')
          .select(`
            *,
            related_user:profiles!activity_feed_related_user_id_fkey(username, avatar_url),
            related_race:races!activity_feed_related_race_id_fkey(name, date),
            related_group:groups!activity_feed_related_group_id_fkey(name)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onNewActivity(data);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Get activity icon and color based on type
export function getActivityIcon(activityType: ActivityType): {
  name: string;
  color: string;
} {
  const iconMap: Record<ActivityType, { name: string; color: string }> = {
    prediction_made: { name: 'checkmark-circle', color: '#00d9ff' },
    race_completed: { name: 'flag', color: '#4caf50' },
    achievement_unlocked: { name: 'trophy', color: '#ffd93d' },
    group_joined: { name: 'people', color: '#9c27b0' },
    rivalry_created: { name: 'flash', color: '#ff6b6b' },
    challenge_won: { name: 'medal', color: '#ff9800' },
    rank_improved: { name: 'trending-up', color: '#00d9ff' },
    perfect_prediction: { name: 'star', color: '#ffd93d' },
  };

  return iconMap[activityType] || { name: 'information-circle', color: '#8892b0' };
}

// Format time ago
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
