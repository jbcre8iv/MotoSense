/**
 * Activity Feed Component
 *
 * Displays recent activities from friends, groups, and races.
 * Can be used as a standalone component or embedded in other screens.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getActivityFeed,
  getGlobalActivityFeed,
  formatActivityTime,
  Activity,
} from '../services/activityFeedService';
import { useAuth } from '../contexts/AuthContext';

interface ActivityFeedProps {
  feedType?: 'personal' | 'global';
  maxItems?: number;
  showHeader?: boolean;
}

export default function ActivityFeed({
  feedType = 'personal',
  maxItems = 20,
  showHeader = true,
}: ActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [feedType, user]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      let data: Activity[] = [];
      if (feedType === 'personal' && user) {
        data = await getActivityFeed(user.id, maxItems);
      } else {
        data = await getGlobalActivityFeed(maxItems);
      }

      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderActivity = (activity: Activity) => {
    return (
      <TouchableOpacity
        key={activity.id}
        style={styles.activityCard}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${activity.color}20` }]}>
          <Ionicons name={activity.icon as any} size={20} color={activity.color} />
        </View>

        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>
              <Text style={styles.username}>{activity.username}</Text>{' '}
              <Text style={styles.actionText}>{activity.title}</Text>
            </Text>
            <Text style={styles.timestamp}>{formatActivityTime(activity.timestamp)}</Text>
          </View>

          <Text style={styles.activityDescription}>{activity.description}</Text>

          {activity.type === 'rivalry_win' && (
            <View style={styles.badge}>
              <Ionicons name="trophy" size={14} color="#ffd93d" />
              <Text style={styles.badgeText}>Victory!</Text>
            </View>
          )}

          {activity.type === 'achievement' && (
            <View style={styles.badge}>
              <Ionicons name="star" size={14} color="#ffd93d" />
              <Text style={styles.badgeText}>+Points</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Ionicons name="pulse" size={24} color="#00d9ff" />
          <Text style={styles.headerTitle}>
            {feedType === 'personal' ? 'Your Activity' : 'Recent Activity'}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00d9ff"
            colors={['#00d9ff']}
            progressBackgroundColor="#1a1f3a"
          />
        }
      >
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pulse-outline" size={64} color="#8892b0" />
            <Text style={styles.emptyText}>No recent activity</Text>
            <Text style={styles.emptySubtext}>
              {feedType === 'personal'
                ? 'Make predictions and join groups to see activity here'
                : 'Check back soon for updates'}
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>{activities.map(renderActivity)}</View>
        )}
      </ScrollView>
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
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8892b0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  activityList: {
    padding: 16,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  username: {
    fontWeight: '600',
    color: '#00d9ff',
  },
  actionText: {
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 12,
    color: '#8892b0',
    marginLeft: 8,
  },
  activityDescription: {
    fontSize: 13,
    color: '#8892b0',
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 217, 61, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffd93d',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
  },
});
