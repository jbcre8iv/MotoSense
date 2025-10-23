/**
 * Rider Profile Screen
 *
 * Comprehensive rider profile with:
 * - Rider info and career stats
 * - Season stats
 * - Recent race history
 * - User's prediction performance
 * - Social media links
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getRiderById,
  getRiderSeasonStats,
  getRiderRaceHistory,
  getUserRiderPredictionStats,
  RiderStats,
  RiderRaceResult,
  UserRiderPredictionStats,
} from '../services/riderService';
import { Rider } from '../types';

export default function RiderProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { session } = useAuth();
  const { riderId } = route.params as { riderId: string };

  const [rider, setRider] = useState<Rider | null>(null);
  const [seasonStats, setSeasonStats] = useState<RiderStats | null>(null);
  const [raceHistory, setRaceHistory] = useState<RiderRaceResult[]>([]);
  const [userStats, setUserStats] = useState<UserRiderPredictionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'stats' | 'history' | 'predictions'>('stats');

  useEffect(() => {
    loadRiderData();
  }, [riderId]);

  const loadRiderData = async () => {
    try {
      setLoading(true);

      const [riderData, stats, history, predStats] = await Promise.all([
        getRiderById(riderId),
        getRiderSeasonStats(riderId),
        getRiderRaceHistory(riderId, 10),
        session?.user?.id ? getUserRiderPredictionStats(session.user.id, riderId) : null,
      ]);

      setRider(riderData);
      setSeasonStats(stats);
      setRaceHistory(history);
      setUserStats(predStats);
    } catch (error) {
      console.error('Error loading rider data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLink = (platform: 'instagram' | 'twitter', handle?: string) => {
    if (!handle) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const url = platform === 'instagram'
      ? `https://instagram.com/${handle.replace('@', '')}`
      : `https://twitter.com/${handle.replace('@', '')}`;

    Linking.openURL(url);
  };

  const renderHeader = () => {
    if (!rider) return null;

    return (
      <View style={styles.header}>
        <LinearGradient
          colors={['#7b2cbf', '#00d9ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>

          {rider.imageUrl ? (
            <Image source={{ uri: rider.imageUrl }} style={styles.riderImage} />
          ) : (
            <View style={[styles.riderImage, styles.riderImagePlaceholder]}>
              <Ionicons name="person" size={80} color="#8892b0" />
            </View>
          )}

          <View style={styles.riderNumber}>
            <Text style={styles.riderNumberText}>{rider.number}</Text>
          </View>

          <Text style={styles.riderName}>{rider.name}</Text>
          <Text style={styles.riderTeam}>{rider.team}</Text>

          {/* Social Media Links */}
          {(rider.socialMedia?.instagram || rider.socialMedia?.twitter) && (
            <View style={styles.socialLinks}>
              {rider.socialMedia?.instagram && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLink('instagram', rider.socialMedia?.instagram)}
                >
                  <Ionicons name="logo-instagram" size={24} color="#fff" />
                </TouchableOpacity>
              )}
              {rider.socialMedia?.twitter && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLink('twitter', rider.socialMedia?.twitter)}
                >
                  <Ionicons name="logo-twitter" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderCareerStats = () => {
    if (!rider) return null;

    return (
      <View style={styles.careerStatsSection}>
        <Text style={styles.sectionTitle}>Career Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rider.careerWins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rider.careerPodiums}</Text>
            <Text style={styles.statLabel}>Podiums</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rider.championships}</Text>
            <Text style={styles.statLabel}>Championships</Text>
          </View>
        </View>

        <View style={styles.bikeInfo}>
          <Ionicons name="bicycle" size={20} color="#00d9ff" />
          <Text style={styles.bikeText}>{rider.bike}</Text>
        </View>

        {rider.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioText}>{rider.bio}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'stats' && styles.tabActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedTab('stats');
        }}
      >
        <Text style={[styles.tabText, selectedTab === 'stats' && styles.tabTextActive]}>
          Season Stats
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'history' && styles.tabActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedTab('history');
        }}
      >
        <Text style={[styles.tabText, selectedTab === 'history' && styles.tabTextActive]}>
          Race History
        </Text>
      </TouchableOpacity>

      {session?.user && (
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'predictions' && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedTab('predictions');
          }}
        >
          <Text style={[styles.tabText, selectedTab === 'predictions' && styles.tabTextActive]}>
            Your Picks
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSeasonStats = () => {
    if (!seasonStats) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No season stats available</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentSection}>
        <View style={styles.seasonStatsGrid}>
          <View style={styles.seasonStatCard}>
            <Text style={styles.seasonStatValue}>{seasonStats.races}</Text>
            <Text style={styles.seasonStatLabel}>Races</Text>
          </View>
          <View style={styles.seasonStatCard}>
            <Text style={styles.seasonStatValue}>{seasonStats.wins}</Text>
            <Text style={styles.seasonStatLabel}>Wins</Text>
          </View>
          <View style={styles.seasonStatCard}>
            <Text style={styles.seasonStatValue}>{seasonStats.podiums}</Text>
            <Text style={styles.seasonStatLabel}>Podiums</Text>
          </View>
          <View style={styles.seasonStatCard}>
            <Text style={styles.seasonStatValue}>{seasonStats.top5Finishes}</Text>
            <Text style={styles.seasonStatLabel}>Top 5s</Text>
          </View>
        </View>

        <View style={styles.detailedStats}>
          <View style={styles.detailedStatRow}>
            <Text style={styles.detailedStatLabel}>Average Finish</Text>
            <Text style={styles.detailedStatValue}>{seasonStats.averageFinish}</Text>
          </View>
          <View style={styles.detailedStatRow}>
            <Text style={styles.detailedStatLabel}>Total Points</Text>
            <Text style={styles.detailedStatValue}>{seasonStats.points}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRaceHistory = () => {
    if (raceHistory.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No race history available</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentSection}>
        {raceHistory.map((race, index) => (
          <View key={race.raceId} style={styles.raceHistoryItem}>
            <View style={styles.raceHistoryLeft}>
              <View style={[
                styles.positionBadge,
                race.position === 1 && styles.positionBadgeGold,
                race.position === 2 && styles.positionBadgeSilver,
                race.position === 3 && styles.positionBadgeBronze,
              ]}>
                <Text style={styles.positionBadgeText}>{race.position}</Text>
              </View>
              <View style={styles.raceInfo}>
                <Text style={styles.raceName}>{race.raceName}</Text>
                <Text style={styles.raceDetails}>
                  {race.trackName} • {new Date(race.raceDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.racePoints}>
              <Text style={styles.racePointsText}>{race.points} pts</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPredictionStats = () => {
    if (!userStats) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No prediction data available</Text>
        </View>
      );
    }

    if (userStats.timesPredicted === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={48} color="#495670" />
          <Text style={styles.emptyStateText}>
            You haven't predicted this rider yet
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.contentSection}>
        <View style={styles.predictionStatsGrid}>
          <View style={styles.predictionStatCard}>
            <Text style={styles.predictionStatValue}>{userStats.timesPredicted}</Text>
            <Text style={styles.predictionStatLabel}>Times Picked</Text>
          </View>
          <View style={styles.predictionStatCard}>
            <Text style={styles.predictionStatValue}>{userStats.timesCorrect}</Text>
            <Text style={styles.predictionStatLabel}>Correct</Text>
          </View>
          <View style={styles.predictionStatCard}>
            <Text style={styles.predictionStatValue}>{userStats.accuracy}%</Text>
            <Text style={styles.predictionStatLabel}>Accuracy</Text>
          </View>
        </View>

        <View style={styles.avgDiffSection}>
          <Text style={styles.avgDiffLabel}>Average Position Difference</Text>
          <Text style={styles.avgDiffValue}>{userStats.averagePositionDiff} positions</Text>
        </View>

        {userStats.bestPrediction && (
          <View style={styles.bestPredictionSection}>
            <Text style={styles.bestPredictionTitle}>Best Prediction</Text>
            <View style={styles.bestPredictionCard}>
              <Text style={styles.bestPredictionRace}>{userStats.bestPrediction.raceName}</Text>
              <View style={styles.bestPredictionComparison}>
                <View style={styles.bestPredictionCol}>
                  <Text style={styles.bestPredictionLabel}>Predicted</Text>
                  <Text style={styles.bestPredictionPosition}>P{userStats.bestPrediction.predicted}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#00d9ff" />
                <View style={styles.bestPredictionCol}>
                  <Text style={styles.bestPredictionLabel}>Actual</Text>
                  <Text style={styles.bestPredictionPosition}>P{userStats.bestPrediction.actual}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
        <Text style={styles.loadingText}>Loading rider profile...</Text>
      </View>
    );
  }

  if (!rider) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#ff6b6b" />
        <Text style={styles.errorText}>Rider not found</Text>
        <TouchableOpacity style={styles.backToHomeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backToHomeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderHeader()}
        {renderCareerStats()}
        {renderTabSelector()}
        {selectedTab === 'stats' && renderSeasonStats()}
        {selectedTab === 'history' && renderRaceHistory()}
        {selectedTab === 'predictions' && renderPredictionStats()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8892b0',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
    padding: 24,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ccd6f6',
    marginTop: 16,
    marginBottom: 24,
  },
  backToHomeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#00d9ff',
    borderRadius: 12,
  },
  backToHomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  riderImagePlaceholder: {
    backgroundColor: '#2a3655',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderNumber: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  riderNumberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  riderName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  riderTeam: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 16,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  careerStatsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ccd6f6',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3655',
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
  },
  bikeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    marginBottom: 16,
  },
  bikeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccd6f6',
  },
  bioSection: {
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00d9ff',
  },
  bioText: {
    fontSize: 14,
    color: '#8892b0',
    lineHeight: 20,
  },
  tabSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1a1f3a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3655',
  },
  tabActive: {
    backgroundColor: '#00d9ff15',
    borderColor: '#00d9ff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8892b0',
  },
  tabTextActive: {
    color: '#00d9ff',
  },
  contentSection: {
    paddingHorizontal: 24,
  },
  seasonStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  seasonStatCard: {
    width: '48%',
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3655',
  },
  seasonStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ccd6f6',
    marginBottom: 4,
  },
  seasonStatLabel: {
    fontSize: 12,
    color: '#8892b0',
  },
  detailedStats: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  detailedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailedStatLabel: {
    fontSize: 14,
    color: '#8892b0',
  },
  detailedStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  raceHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3655',
  },
  raceHistoryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a3655',
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionBadgeGold: {
    backgroundColor: '#FFD700',
  },
  positionBadgeSilver: {
    backgroundColor: '#C0C0C0',
  },
  positionBadgeBronze: {
    backgroundColor: '#CD7F32',
  },
  positionBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  raceInfo: {
    flex: 1,
  },
  raceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccd6f6',
    marginBottom: 4,
  },
  raceDetails: {
    fontSize: 12,
    color: '#8892b0',
  },
  racePoints: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#00d9ff15',
    borderRadius: 8,
  },
  racePointsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  predictionStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  predictionStatCard: {
    flex: 1,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3655',
  },
  predictionStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  predictionStatLabel: {
    fontSize: 11,
    color: '#8892b0',
    textAlign: 'center',
  },
  avgDiffSection: {
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  avgDiffLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 8,
  },
  avgDiffValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ccd6f6',
  },
  bestPredictionSection: {
    marginBottom: 20,
  },
  bestPredictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ccd6f6',
    marginBottom: 12,
  },
  bestPredictionCard: {
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00d9ff',
  },
  bestPredictionRace: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccd6f6',
    marginBottom: 12,
  },
  bestPredictionComparison: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bestPredictionCol: {
    alignItems: 'center',
  },
  bestPredictionLabel: {
    fontSize: 11,
    color: '#8892b0',
    marginBottom: 4,
  },
  bestPredictionPosition: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
    marginTop: 12,
  },
});
