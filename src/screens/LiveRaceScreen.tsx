/**
 * Live Race Screen
 *
 * Shows real-time race results, scoring, and leaderboard updates during live races.
 * Updates automatically as riders cross the finish line using Supabase Realtime.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getLiveRaceState,
  calculateLiveScore,
  getLiveLeaderboard,
  subscribeToLiveRace,
  subscribeToLiveLeaderboard,
  LiveRaceState,
  LiveUserScore,
} from '../services/liveRaceService';
import { useAuth } from '../contexts/AuthContext';

interface LiveRaceScreenProps {
  route: {
    params: {
      raceId: string;
      raceName: string;
    };
  };
}

export default function LiveRaceScreen({ route }: LiveRaceScreenProps) {
  const { raceId, raceName } = route.params;
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [raceState, setRaceState] = useState<LiveRaceState | null>(null);
  const [userScore, setUserScore] = useState<LiveUserScore | null>(null);
  const [leaderboard, setLeaderboard] = useState<LiveUserScore[]>([]);

  // Load initial data
  useEffect(() => {
    loadRaceData();
  }, [raceId]);

  // Subscribe to live updates
  useEffect(() => {
    if (!raceId) return;

    const unsubscribeRace = subscribeToLiveRace(raceId, (state) => {
      setRaceState(state);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

    const unsubscribeLeaderboard = subscribeToLiveLeaderboard(raceId, (scores) => {
      setLeaderboard(scores);
      if (user) {
        const myScore = scores.find((s) => s.userId === user.id);
        if (myScore) {
          setUserScore(myScore);
        }
      }
    });

    return () => {
      unsubscribeRace();
      unsubscribeLeaderboard();
    };
  }, [raceId, user]);

  const loadRaceData = async () => {
    try {
      setLoading(true);

      // Load race state
      const state = await getLiveRaceState(raceId);
      setRaceState(state);

      // Load user score
      if (user) {
        const score = await calculateLiveScore(user.id, raceId);
        setUserScore(score);
      }

      // Load leaderboard
      const scores = await getLiveLeaderboard(raceId, 10);
      setLeaderboard(scores);
    } catch (error) {
      console.error('Error loading race data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await loadRaceData();
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return '#ff6b6b';
      case 'completed':
        return '#4caf50';
      default:
        return '#00d9ff';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return 'RACING NOW';
      case 'completed':
        return 'RACE COMPLETE';
      default:
        return 'NOT STARTED';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d9ff" />
          <Text style={styles.loadingText}>Loading Live Race...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Ionicons name="radio" size={32} color="#ff6b6b" />
            <View style={styles.headerText}>
              <Text style={styles.title}>{raceName}</Text>
              <Text style={styles.subtitle}>Live Updates</Text>
            </View>
            <View style={[styles.liveIndicator, { backgroundColor: getStatusColor(raceState?.status || 'not_started') }]}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={[styles.statusBanner, { backgroundColor: getStatusColor(raceState?.status || 'not_started') }]}>
            <Text style={styles.statusText}>{getStatusText(raceState?.status || 'not_started')}</Text>
            {raceState?.status === 'in_progress' && (
              <Text style={styles.lapText}>
                Lap {raceState.currentLap}/{raceState.totalLaps}
              </Text>
            )}
          </View>
        </View>

        {/* User Score Card */}
        {userScore && (
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Ionicons name="trophy" size={24} color="#ffd93d" />
              <Text style={styles.scoreTitle}>Your Score</Text>
            </View>
            <View style={styles.scoreContent}>
              <View style={styles.scoreMain}>
                <Text style={styles.scorePoints}>{userScore.currentPoints}</Text>
                <Text style={styles.scoreLabel}>Points</Text>
              </View>
              <View style={styles.scoreStats}>
                <View style={styles.scoreStat}>
                  <Text style={styles.statValue}>#{userScore.rank}</Text>
                  <Text style={styles.statLabel}>Rank</Text>
                </View>
                <View style={styles.scoreStat}>
                  <Text style={styles.statValue}>{userScore.correctPicks}/{userScore.totalPicks}</Text>
                  <Text style={styles.statLabel}>Correct</Text>
                </View>
                <View style={styles.scoreStat}>
                  <Text style={styles.statValue}>{userScore.potentialPoints}</Text>
                  <Text style={styles.statLabel}>Potential</Text>
                </View>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(userScore.correctPicks / userScore.totalPicks) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Live Positions */}
        {raceState && raceState.positions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={20} color="#00d9ff" />
              <Text style={styles.sectionTitle}>Live Positions</Text>
            </View>
            {raceState.positions.map((pos) => (
              <View key={pos.riderId} style={styles.positionCard}>
                <View style={styles.positionLeft}>
                  <View style={[styles.positionBadge, pos.position <= 3 && styles.podiumBadge]}>
                    <Text style={styles.positionText}>{pos.position}</Text>
                  </View>
                  <View style={styles.riderInfo}>
                    <Text style={styles.riderName}>{pos.riderName}</Text>
                    <Text style={styles.riderNumber}>#{pos.riderNumber}</Text>
                  </View>
                </View>
                <View style={styles.positionRight}>
                  {pos.status === 'finished' ? (
                    <View style={styles.finishedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
                      <Text style={styles.finishedText}>Finished</Text>
                    </View>
                  ) : (
                    <View style={styles.racingBadge}>
                      <Ionicons name="radio" size={16} color="#ff6b6b" />
                      <Text style={styles.racingText}>Racing</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Live Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="podium" size={20} color="#00d9ff" />
              <Text style={styles.sectionTitle}>Live Leaderboard</Text>
            </View>
            {leaderboard.map((score, index) => (
              <View
                key={score.userId}
                style={[
                  styles.leaderboardCard,
                  score.userId === user?.id && styles.highlightedCard,
                ]}
              >
                <View style={styles.leaderboardLeft}>
                  <View style={[styles.rankBadge, index < 3 && styles.podiumRank]}>
                    <Text style={styles.rankText}>#{score.rank}</Text>
                  </View>
                  <Text style={styles.leaderboardName}>
                    {score.userId === user?.id ? 'You' : `User ${score.rank}`}
                  </Text>
                </View>
                <View style={styles.leaderboardRight}>
                  <Text style={styles.leaderboardPoints}>{score.currentPoints} pts</Text>
                  <Text style={styles.leaderboardCorrect}>
                    {score.correctPicks}/{score.totalPicks}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8892b0',
  },
  header: {
    backgroundColor: '#1a1f3a',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#00d9ff',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
  liveIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  lapText: {
    fontSize: 12,
    color: '#ffffff',
  },
  scoreCard: {
    backgroundColor: '#1a1f3a',
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreMain: {
    flex: 1,
    alignItems: 'center',
  },
  scorePoints: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 4,
  },
  scoreStats: {
    flex: 1,
    gap: 12,
  },
  scoreStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2a2f4a',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00d9ff',
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  positionCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  positionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2f4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumBadge: {
    backgroundColor: '#ffd93d',
  },
  positionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  riderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  riderNumber: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 2,
  },
  positionRight: {
    marginLeft: 12,
  },
  finishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  finishedText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
  },
  racingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  racingText: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: '600',
  },
  leaderboardCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  highlightedCard: {
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2f4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRank: {
    backgroundColor: '#ffd93d',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  leaderboardRight: {
    alignItems: 'flex-end',
  },
  leaderboardPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  leaderboardCorrect: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 2,
  },
});
