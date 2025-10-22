import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, Achievement } from '../types';
import { getUserProfile, initializeUserProfile, clearAllData } from '../services/storageService';
import { getTierColor, getCategoryColor } from '../data';
import AnimatedCounter from '../components/AnimatedCounter';
import { Alert, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      // Get existing profile without re-initializing
      let profile = await getUserProfile();
      // Only initialize if profile doesn't exist
      if (!profile) {
        profile = await initializeUserProfile();
      }
      setUserData(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data?',
      'This will delete all predictions, stats, and achievements. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadUserProfile();
            Alert.alert('Success', 'All data has been reset!');
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Reload profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile();
    }, [])
  );

  if (loading || !userData) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userData.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.username}>{userData.username}</Text>
        <Text style={styles.subtitle}>Racing Enthusiast</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Stats</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <AnimatedCounter
              value={userData.totalPredictions}
              style={styles.statValue}
              duration={1200}
            />
            <Text style={styles.statLabel}>Total Predictions</Text>
          </View>

          <View style={styles.statCard}>
            <AnimatedCounter
              value={userData.accuracyPercentage}
              style={styles.statValue}
              suffix="%"
              duration={1400}
              delay={100}
            />
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>

          <View style={styles.statCard}>
            <AnimatedCounter
              value={userData.racingIQLevel}
              style={styles.statValue}
              prefix="Level "
              duration={1000}
              delay={200}
            />
            <Text style={styles.statLabel}>Racing IQ</Text>
          </View>

          <View style={styles.statCard}>
            <AnimatedCounter
              value={userData.totalPoints}
              style={styles.statValue}
              duration={1600}
              delay={300}
            />
            <Text style={styles.statLabel}>Total Points</Text>
          </View>

          <View style={[styles.statCard, styles.streakCard]}>
            <Ionicons name="flame" size={24} color="#ff6b6b" />
            <AnimatedCounter
              value={userData.currentStreak}
              style={[styles.statValue, { color: '#ff6b6b' }]}
              duration={1000}
              delay={400}
            />
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>

          <View style={styles.statCard}>
            <AnimatedCounter
              value={userData.longestStreak}
              style={styles.statValue}
              duration={1200}
              delay={500}
            />
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Achievements ({userData.achievements.filter(a => a.isUnlocked).length}/{userData.achievements.length})
        </Text>

        {userData.achievements.slice(0, 8).map((achievement) => (
          <View
            key={achievement.id}
            style={[
              styles.achievementCard,
              achievement.isUnlocked && styles.achievementUnlocked
            ]}
          >
            <View style={styles.achievementHeader}>
              <View style={styles.achievementIconContainer}>
                <Ionicons
                  name={achievement.icon as any}
                  size={24}
                  color={achievement.isUnlocked ? getTierColor(achievement.tier) : '#8892b0'}
                />
              </View>
              <View style={styles.achievementInfo}>
                <View style={styles.achievementTitleRow}>
                  <Text style={[
                    styles.achievementTitle,
                    achievement.isUnlocked && styles.achievementTitleUnlocked
                  ]}>
                    {achievement.title}
                  </Text>
                  <View style={[
                    styles.tierBadge,
                    { backgroundColor: getTierColor(achievement.tier) }
                  ]}>
                    <Text style={styles.tierText}>{achievement.tier.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((achievement.currentProgress / achievement.targetProgress) * 100, 100)}%`,
                      backgroundColor: achievement.isUnlocked ? getTierColor(achievement.tier) : getCategoryColor(achievement.category)
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {achievement.currentProgress}/{achievement.targetProgress}
              </Text>
            </View>

            {achievement.isUnlocked && achievement.rewardPoints && (
              <View style={styles.rewardBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.rewardText}>+{achievement.rewardPoints} pts</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Racing IQ</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Your Racing IQ level increases as you make more accurate predictions.
            This is an educational metric to help you learn about race dynamics,
            track conditions, and rider performance.
          </Text>
          <Text style={styles.infoText} style={{ marginTop: 12 }}>
            Remember: MotoSense is for learning and fun, not gambling!
          </Text>
        </View>
      </View>

      {/* Debug Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Info</Text>
        <View style={styles.debugCard}>
          <Text style={styles.debugLabel}>Raw Data:</Text>
          <Text style={styles.debugText}>Total Predictions: {userData.totalPredictions}</Text>
          <Text style={styles.debugText}>Total Points: {userData.totalPoints}</Text>
          <Text style={styles.debugText}>Current Streak: {userData.currentStreak}</Text>
          <Text style={styles.debugText}>Racing IQ Level: {userData.racingIQLevel}</Text>
          <Text style={styles.debugText}>Accuracy: {userData.accuracyPercentage}%</Text>
          <Text style={styles.debugText}>
            Achievements Unlocked: {userData.achievements.filter(a => a.isUnlocked).length}/{userData.achievements.length}
          </Text>
          <Text style={styles.debugText}>
            Max Achievement Progress: {Math.max(...userData.achievements.filter(a => a.type === 'prediction_count').map(a => a.currentProgress), 0)}
          </Text>
        </View>
      </View>

      {/* Temporary Reset Button for Development */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.resetButton} onPress={handleResetData}>
          <Ionicons name="refresh" size={20} color="#ff6b6b" />
          <Text style={styles.resetButtonText}>Reset All Data (Dev Only)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    padding: 20,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 2,
    borderBottomColor: '#00d9ff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  profileCard: {
    backgroundColor: '#1a1f3a',
    margin: 16,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
  },
  streakCard: {
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8892b0',
    textAlign: 'center',
  },
  achievementCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    opacity: 0.6,
  },
  achievementUnlocked: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  achievementHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8892b0',
    flex: 1,
  },
  achievementTitleUnlocked: {
    color: '#ffffff',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#8892b0',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  tierText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#0a0e27',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 10,
    color: '#8892b0',
    fontWeight: '600',
    minWidth: 40,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0a0e27',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  rewardText: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyState: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#8892b0',
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: '600',
    marginLeft: 8,
  },
  debugCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
