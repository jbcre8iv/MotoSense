import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getActivityFeed,
  getUnreadActivityCount,
  markActivityAsRead,
  markAllActivitiesAsRead,
  subscribeToActivityFeed,
  getActivityIcon,
  formatTimeAgo,
  ActivityFeed,
} from '../services/activityFeedService';
import { useAuth } from '../contexts/AuthContext';

export default function ActivityFeedScreen() {
  const { session } = useAuth();
  const [activities, setActivities] = useState<ActivityFeed[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadActivities = async () => {
    if (!session?.user?.id) return;

    try {
      const data = await getActivityFeed(session.user.id, {
        unreadOnly: filter === 'unread',
      });
      setActivities(data);

      const count = await getUnreadActivityCount(session.user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [session?.user?.id, filter])
  );

  // Subscribe to real-time updates
  useEffect(() => {
    if (!session?.user?.id) return;

    const unsubscribe = subscribeToActivityFeed(session.user.id, (newActivity) => {
      setActivities((prev) => [newActivity, ...prev]);
      setUnreadCount((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });

    return unsubscribe;
  }, [session?.user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const handleActivityPress = async (activity: ActivityFeed) => {
    if (!activity.is_read) {
      const success = await markActivityAsRead(activity.id);
      if (success) {
        setActivities((prev) =>
          prev.map((a) => (a.id === activity.id ? { ...a, is_read: true } : a))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // TODO: Navigate to related screen based on activity type
    // For example, if activity_type is 'race_completed', navigate to race results
  };

  const handleMarkAllRead = async () => {
    if (!session?.user?.id) return;

    const success = await markAllActivitiesAsRead(session.user.id);
    if (success) {
      setActivities((prev) => prev.map((a) => ({ ...a, is_read: true })));
      setUnreadCount(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const renderActivity = ({ item }: { item: ActivityFeed }) => {
    const iconInfo = getActivityIcon(item.activity_type);
    const timeAgo = formatTimeAgo(item.created_at);

    return (
      <TouchableOpacity
        style={[styles.activityCard, !item.is_read && styles.unreadCard]}
        onPress={() => handleActivityPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconInfo.color + '20' }]}>
          <Ionicons name={iconInfo.name as any} size={24} color={iconInfo.color} />
        </View>

        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activityTime}>{timeAgo}</Text>
          </View>

          {item.description && (
            <Text style={styles.activityDescription}>{item.description}</Text>
          )}

          {item.points_earned > 0 && (
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={14} color="#ffd93d" />
              <Text style={styles.pointsText}>+{item.points_earned} points</Text>
            </View>
          )}

          {!item.is_read && <View style={styles.unreadIndicator} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={64} color="#8892b0" />
      <Text style={styles.emptyTitle}>No Activity Yet</Text>
      <Text style={styles.emptyText}>
        {filter === 'unread'
          ? 'All caught up! No unread activities.'
          : 'Your recent activity will appear here'}
      </Text>
    </View>
  );

  const renderListHeader = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
          All
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
        onPress={() => setFilter('unread')}
      >
        <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </Text>
      </TouchableOpacity>

      {unreadCount > 0 && filter === 'all' && (
        <TouchableOpacity
          style={styles.markAllReadButton}
          onPress={handleMarkAllRead}
        >
          <Text style={styles.markAllReadText}>Mark all read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity Feed</Text>
        {unreadCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={activities.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00d9ff"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1f3a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  badgeContainer: {
    backgroundColor: '#ff4d4d',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badge: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#12182e',
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  filterButtonActive: {
    backgroundColor: '#00d9ff20',
    borderColor: '#00d9ff',
  },
  filterText: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#00d9ff',
  },
  markAllReadButton: {
    marginLeft: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  markAllReadText: {
    color: '#00d9ff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#12182e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  unreadCard: {
    backgroundColor: '#141a33',
    borderColor: '#00d9ff40',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  activityTime: {
    fontSize: 12,
    color: '#8892b0',
  },
  activityDescription: {
    fontSize: 14,
    color: '#8892b0',
    lineHeight: 20,
    marginBottom: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffd93d20',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffd93d',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00d9ff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
  },
});
