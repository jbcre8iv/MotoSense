/**
 * Activity Feed Service
 *
 * Aggregates and displays recent activities from across the app:
 * - Predictions made
 * - Achievements unlocked
 * - Race results
 * - Group activity
 * - Rivalry updates
 */

import { supabase } from './supabase';

export interface Activity {
  id: string;
  type:
    | 'prediction'
    | 'achievement'
    | 'race_result'
    | 'group_join'
    | 'group_message'
    | 'rivalry_win'
    | 'rivalry_loss';
  user_id: string;
  username: string;
  avatar_url: string | null;
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
  icon: string;
  color: string;
}

/**
 * Get recent activity feed for a user (personalized feed)
 */
export const getActivityFeed = async (userId: string, limit: number = 20): Promise<Activity[]> => {
  const activities: Activity[] = [];

  try {
    // Get user's groups to filter group activities
    const { data: userGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    const groupIds = (userGroups || []).map((g: any) => g.group_id);

    // Get recent predictions from groups
    if (groupIds.length > 0) {
      const { data: predictions } = await supabase
        .from('predictions')
        .select(
          `
          id,
          user_id,
          race_id,
          created_at,
          profiles!predictions_user_id_fkey(username, avatar_url),
          races(name)
        `
        )
        .in(
          'user_id',
          await getUsersFromGroups(groupIds)
        )
        .order('created_at', { ascending: false })
        .limit(10);

      predictions?.forEach((pred: any) => {
        activities.push({
          id: `pred-${pred.id}`,
          type: 'prediction',
          user_id: pred.user_id,
          username: pred.profiles?.username || 'Someone',
          avatar_url: pred.profiles?.avatar_url || null,
          title: 'Made a prediction',
          description: `for ${pred.races?.name || 'upcoming race'}`,
          timestamp: pred.created_at,
          icon: 'create',
          color: '#00d9ff',
        });
      });
    }

    // Get recent achievements (check user's recent achievements)
    const { data: recentAchievements } = await supabase
      .from('user_achievements')
      .select(
        `
        id,
        user_id,
        achievement_id,
        unlocked_at,
        profiles!user_achievements_user_id_fkey(username, avatar_url)
      `
      )
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })
      .limit(5);

    recentAchievements?.forEach((ach: any) => {
      activities.push({
        id: `ach-${ach.id}`,
        type: 'achievement',
        user_id: ach.user_id,
        username: ach.profiles?.username || 'You',
        avatar_url: ach.profiles?.avatar_url || null,
        title: 'Unlocked achievement',
        description: getAchievementName(ach.achievement_id),
        timestamp: ach.unlocked_at,
        icon: 'trophy',
        color: '#ffd93d',
      });
    });

    // Get recent race results
    const { data: recentRaces } = await supabase
      .from('races')
      .select('id, name, date')
      .lt('date', new Date().toISOString())
      .order('date', { ascending: false })
      .limit(3);

    recentRaces?.forEach((race: any) => {
      activities.push({
        id: `race-${race.id}`,
        type: 'race_result',
        user_id: 'system',
        username: 'MotoSense',
        avatar_url: null,
        title: 'Race completed',
        description: race.name,
        timestamp: race.date,
        metadata: { race_id: race.id },
        icon: 'checkmark-circle',
        color: '#4caf50',
      });
    });

    // Get recent group messages from user's groups
    if (groupIds.length > 0) {
      const { data: messages } = await supabase
        .from('group_messages')
        .select(
          `
          id,
          user_id,
          group_id,
          created_at,
          profiles!group_messages_user_id_fkey(username, avatar_url),
          groups(name)
        `
        )
        .in('group_id', groupIds)
        .neq('user_id', userId) // Don't show own messages
        .order('created_at', { ascending: false})
        .limit(10);

      messages?.forEach((msg: any) => {
        activities.push({
          id: `msg-${msg.id}`,
          type: 'group_message',
          user_id: msg.user_id,
          username: msg.profiles?.username || 'Someone',
          avatar_url: msg.profiles?.avatar_url || null,
          title: 'Sent a message',
          description: `in ${msg.groups?.name || 'a group'}`,
          timestamp: msg.created_at,
          metadata: { group_id: msg.group_id },
          icon: 'chatbubble',
          color: '#9c27b0',
        });
      });
    }

    // Get recent rivalry results
    const { data: rivalryStats } = await supabase
      .from('rivalry_stats')
      .select(
        `
        id,
        rivalry_id,
        result,
        calculated_at,
        rivalries!rivalry_stats_rivalry_id_fkey(
          user_id,
          rival_id,
          profiles!rivalries_rival_id_fkey(username, avatar_url)
        )
      `
      )
      .order('calculated_at', { ascending: false })
      .limit(5);

    rivalryStats?.forEach((stat: any) => {
      if (stat.rivalries?.user_id === userId) {
        activities.push({
          id: `rivalry-${stat.id}`,
          type: stat.result === 'win' ? 'rivalry_win' : 'rivalry_loss',
          user_id: userId,
          username: 'You',
          avatar_url: null,
          title: stat.result === 'win' ? 'Won against rival' : 'Lost to rival',
          description: stat.rivalries?.profiles?.username || 'Unknown',
          timestamp: stat.calculated_at,
          icon: stat.result === 'win' ? 'trophy' : 'trending-down',
          color: stat.result === 'win' ? '#4caf50' : '#ff6b6b',
        });
      }
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
};

/**
 * Get global activity feed (all users)
 */
export const getGlobalActivityFeed = async (limit: number = 20): Promise<Activity[]> => {
  const activities: Activity[] = [];

  try {
    // Get recent predictions
    const { data: predictions } = await supabase
      .from('predictions')
      .select(
        `
        id,
        user_id,
        race_id,
        created_at,
        profiles!predictions_user_id_fkey(username, avatar_url),
        races(name)
      `
      )
      .order('created_at', { ascending: false })
      .limit(15);

    predictions?.forEach((pred: any) => {
      activities.push({
        id: `pred-${pred.id}`,
        type: 'prediction',
        user_id: pred.user_id,
        username: pred.profiles?.username || 'Someone',
        avatar_url: pred.profiles?.avatar_url || null,
        title: 'Made a prediction',
        description: `for ${pred.races?.name || 'upcoming race'}`,
        timestamp: pred.created_at,
        icon: 'create',
        color: '#00d9ff',
      });
    });

    // Get recent race results
    const { data: recentRaces } = await supabase
      .from('races')
      .select('id, name, date')
      .lt('date', new Date().toISOString())
      .order('date', { ascending: false })
      .limit(5);

    recentRaces?.forEach((race: any) => {
      activities.push({
        id: `race-${race.id}`,
        type: 'race_result',
        user_id: 'system',
        username: 'MotoSense',
        avatar_url: null,
        title: 'Race completed',
        description: race.name,
        timestamp: race.date,
        metadata: { race_id: race.id },
        icon: 'checkmark-circle',
        color: '#4caf50',
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error fetching global activity feed:', error);
    return [];
  }
};

/**
 * Helper: Get users from groups
 */
async function getUsersFromGroups(groupIds: string[]): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('group_members')
      .select('user_id')
      .in('group_id', groupIds);

    return [...new Set((data || []).map((m: any) => m.user_id))];
  } catch (error) {
    return [];
  }
}

/**
 * Helper: Get achievement name from ID
 */
function getAchievementName(achievementId: string): string {
  // This would ideally come from the achievements data
  const achievementNames: Record<string, string> = {
    first_blood: 'First Blood',
    rookie: 'Rookie',
    veteran: 'Veteran',
    perfectionist: 'Perfectionist',
    // Add more as needed
  };

  return achievementNames[achievementId] || 'New achievement';
}

/**
 * Format activity timestamp
 */
export const formatActivityTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
