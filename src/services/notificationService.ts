import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'race_reminder' | 'achievement' | 'friend_activity' | 'results_available' | 'streak_reminder' | 'challenge';
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Register for push notifications and get push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.log('⚠️ [NOTIFICATIONS] Must use physical device for Push Notifications');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ [NOTIFICATIONS] Permission denied');
        return null;
      }

      // Get the push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = tokenData.data;
      console.log('✅ [NOTIFICATIONS] Push token:', this.expoPushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00D9FF',
        });
      }

      // Save push token to user profile
      await this.savePushTokenToProfile(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Registration error:', error);
      return null;
    }
  }

  /**
   * Save push token to user profile in Supabase
   */
  private async savePushTokenToProfile(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);

      if (error) throw error;
      console.log('✅ [NOTIFICATIONS] Push token saved to profile');
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error saving push token:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: Record<string, any>
  ): Promise<string | null> {
    try {
      const trigger = {
        date: triggerDate,
      };

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger,
      });

      console.log('📅 [NOTIFICATIONS] Scheduled notification:', { id, title, triggerDate });
      return id;
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Scheduling error:', error);
      return null;
    }
  }

  /**
   * Schedule race reminder notification (1 hour before race)
   */
  async scheduleRaceReminder(raceId: string, raceName: string, raceDate: Date): Promise<void> {
    const reminderTime = new Date(raceDate.getTime() - 60 * 60 * 1000); // 1 hour before

    // Only schedule if race is in the future
    if (reminderTime > new Date()) {
      await this.scheduleNotification(
        `🏁 ${raceName} starts in 1 hour!`,
        'Make your predictions now before the gate drops!',
        reminderTime,
        {
          type: 'race_reminder',
          raceId,
          raceName,
        }
      );
    }
  }

  /**
   * Send achievement unlock notification
   */
  async sendAchievementNotification(achievementName: string, points: number): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏆 Achievement Unlocked!`,
        body: `${achievementName} (+${points} pts)`,
        data: {
          type: 'achievement',
          achievementName,
          points,
        },
        sound: true,
      },
      trigger: null, // Send immediately
    });
  }

  /**
   * Send results available notification
   */
  async sendResultsNotification(raceName: string, raceId: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📊 ${raceName} Results Are In!`,
        body: 'See how your predictions stacked up!',
        data: {
          type: 'results_available',
          raceId,
          raceName,
        },
        sound: true,
      },
      trigger: null,
    });
  }

  /**
   * Send friend activity notification
   */
  async sendFriendActivityNotification(
    friendName: string,
    activity: 'beat_score' | 'new_prediction' | 'joined_group',
    details?: string
  ): Promise<void> {
    let title = '';
    let body = '';

    switch (activity) {
      case 'beat_score':
        title = `🎯 ${friendName} beat your score!`;
        body = details || 'Time to step up your prediction game!';
        break;
      case 'new_prediction':
        title = `📝 ${friendName} made a prediction`;
        body = details || 'Check out their picks!';
        break;
      case 'joined_group':
        title = `👥 ${friendName} joined your group`;
        body = details || 'Welcome the new competitor!';
        break;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'friend_activity',
          friendName,
          activity,
        },
        sound: true,
      },
      trigger: null,
    });
  }

  /**
   * Send streak reminder notification
   */
  async sendStreakReminder(currentStreak: number): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔥 Don't break your ${currentStreak}-day streak!`,
        body: 'Make a prediction today to keep it alive!',
        data: {
          type: 'streak_reminder',
          currentStreak,
        },
        sound: true,
      },
      trigger: null,
    });
  }

  /**
   * Send daily/weekly challenge notification
   */
  async sendChallengeNotification(challengeName: string, reward: number): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚡ New Challenge: ${challengeName}`,
        body: `Complete for +${reward} bonus points!`,
        data: {
          type: 'challenge',
          challengeName,
          reward,
        },
        sound: true,
      },
      trigger: null,
    });
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('🚫 [NOTIFICATIONS] Cancelled notification:', notificationId);
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Cancel error:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🚫 [NOTIFICATIONS] Cancelled all notifications');
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Cancel all error:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 [NOTIFICATIONS] Scheduled notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Get scheduled error:', error);
      return [];
    }
  }

  /**
   * Add notification response listener
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Add notification received listener (when app is in foreground)
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
