/**
 * Track Profile Screen
 *
 * Comprehensive track profile with:
 * - Track info and details
 * - Race history at the track
 * - Track records (most wins, podiums)
 * - User's prediction performance at the track
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getTrackInfo,
  getTrackRaceHistory,
  getTrackRecords,
  getUserTrackStats,
  TrackInfo,
  TrackRaceHistory,
  TrackRecords,
  UserTrackStats,
} from '../services/trackService';

export default function TrackProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { session } = useAuth();
  const { trackId, trackName } = route.params as { trackId?: string; trackName?: string };

  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [raceHistory, setRaceHistory] = useState<TrackRaceHistory[]>([]);
  const [records, setRecords] = useState<TrackRecords | null>(null);
  const [userStats, setUserStats] = useState<UserTrackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'info' | 'history' | 'performance'>('info');

  useEffect(() => {
    loadTrackData();
  }, [trackId, trackName]);

  const loadTrackData = async () => {
    try {
      setLoading(true);

      const identifier = trackId || trackName || '';

      const [trackData, history, trackRecords, stats] = await Promise.all([
        getTrackInfo(identifier),
        getTrackRaceHistory(identifier, 10),
        getTrackRecords(identifier),
        session?.user?.id ? getUserTrackStats(session.user.id, identifier) : null,
      ]);

      setTrack(trackData);
      setRaceHistory(history);
      setRecords(trackRecords);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading track data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    if (!track) return null;

    return (
      <View style={styles.header}>
        <LinearGradient
          colors={['#00d9ff', '#7b2cbf']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>

          {track.imageUrl ? (
            <Image source={{ uri: track.imageUrl }} style={styles.trackImage} />
          ) : (
            <View style={[styles.trackImage, styles.trackImagePlaceholder]}>
              <Ionicons name="location" size={80} color="#8892b0" />
            </View>
          )}

          <View style={styles.trackTypeBadge}>
            <Ionicons
              name={track.type === 'indoor' ? 'home' : 'sunny'}
              size={20}
              color="#fff"
            />
            <Text style={styles.trackTypeText}>
              {track.type === 'indoor' ? 'Indoor' : 'Outdoor'}
            </Text>
          </View>

          <Text style={styles.trackName}>{track.name}</Text>
          <View style={styles.trackLocation}>
            <Ionicons name="location-outline" size={16} color="#fff" />
            <Text style={styles.trackLocationText}>
              {track.city && track.state ? `${track.city}, ${track.state}` : track.state || 'Unknown'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderTrackDetails = () => {
    if (!track) return null;

    return (
      <View style={styles.detailsSection}>
        {track.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{track.description}</Text>
          </View>
        )}

        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <Ionicons name="resize" size={24} color="#00d9ff" />
            <Text style={styles.detailLabel}>Track Type</Text>
            <Text style={styles.detailValue}>
              {track.type === 'indoor' ? 'Indoor / Supercross' : 'Outdoor / Motocross'}
            </Text>
          </View>

          {track.soilType && (
            <View style={styles.detailCard}>
              <Ionicons name="layers" size={24} color="#00d9ff" />
              <Text style={styles.detailLabel}>Soil Type</Text>
              <Text style={styles.detailValue}>{track.soilType}</Text>
            </View>
          )}

          {track.trackLength && (
            <View style={styles.detailCard}>
              <Ionicons name="speedometer" size={24} color="#00d9ff" />
              <Text style={styles.detailLabel}>Track Length</Text>
              <Text style={styles.detailValue}>{track.trackLength} miles</Text>
            </View>
          )}

          {track.capacity && (
            <View style={styles.detailCard}>
              <Ionicons name="people" size={24} color="#00d9ff" />
              <Text style={styles.detailLabel}>Capacity</Text>
              <Text style={styles.detailValue}>{track.capacity.toLocaleString()}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderRecords = () => {
    if (!records) return null;

    return (
      <View style={styles.recordsSection}>
        <Text style={styles.sectionTitle}>Track Records</Text>

        <View style={styles.recordsGrid}>
          <View style={styles.recordCard}>
            <Text style={styles.recordValue}>{records.totalRaces}</Text>
            <Text style={styles.recordLabel}>Total Races</Text>
          </View>

          {records.mostWins && (
            <View style={styles.recordCard}>
              <View style={styles.recordIcon}>
                <Ionicons name="trophy" size={24} color="#FFD700" />
              </View>
              <Text style={styles.recordLabel}>Most Wins</Text>
              <Text style={styles.recordRider}>{records.mostWins.riderName}</Text>
              <Text style={styles.recordCount}>{records.mostWins.wins} wins</Text>
            </View>
          )}

          {records.mostPodiums && (
            <View style={styles.recordCard}>
              <View style={styles.recordIcon}>
                <Ionicons name="medal" size={24} color="#C0C0C0" />
              </View>
              <Text style={styles.recordLabel}>Most Podiums</Text>
              <Text style={styles.recordRider}>{records.mostPodiums.riderName}</Text>
              <Text style={styles.recordCount}>{records.mostPodiums.podiums} podiums</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'info' && styles.tabActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedTab('info');
        }}
      >
        <Text style={[styles.tabText, selectedTab === 'info' && styles.tabTextActive]}>
          Track Info
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
          style={[styles.tab, selectedTab === 'performance' && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedTab('performance');
          }}
        >
          <Text style={[styles.tabText, selectedTab === 'performance' && styles.tabTextActive]}>
            Your Stats
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTrackInfo = () => (
    <View style={styles.contentSection}>
      {renderTrackDetails()}
      {renderRecords()}
    </View>
  );

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
              <View style={styles.winnerBadge}>
                <Ionicons name="trophy" size={20} color="#FFD700" />
              </View>
              <View style={styles.raceInfo}>
                <Text style={styles.raceName}>{race.raceName}</Text>
                <Text style={styles.raceDetails}>
                  {new Date(race.raceDate).toLocaleDateString()} • {race.seriesType}
                </Text>
                <View style={styles.winnerInfo}>
                  <Text style={styles.winnerLabel}>Winner: </Text>
                  <Text style={styles.winnerName}>
                    #{race.winnerNumber} {race.winnerName}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPerformance = () => {
    if (!userStats) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No prediction data available</Text>
        </View>
      );
    }

    if (userStats.predictionsMade === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={48} color="#495670" />
          <Text style={styles.emptyStateText}>
            You haven't made predictions at this track yet
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.contentSection}>
        <View style={styles.performanceStatsGrid}>
          <View style={styles.performanceStatCard}>
            <Text style={styles.performanceStatValue}>{userStats.predictionsMade}</Text>
            <Text style={styles.performanceStatLabel}>Predictions</Text>
          </View>
          <View style={styles.performanceStatCard}>
            <Text style={styles.performanceStatValue}>{userStats.averagePoints}</Text>
            <Text style={styles.performanceStatLabel}>Avg Points</Text>
          </View>
          <View style={styles.performanceStatCard}>
            <Text style={styles.performanceStatValue}>{userStats.bestScore}</Text>
            <Text style={styles.performanceStatLabel}>Best Score</Text>
          </View>
          <View style={styles.performanceStatCard}>
            <Text style={styles.performanceStatValue}>{userStats.accuracy}%</Text>
            <Text style={styles.performanceStatLabel}>Accuracy</Text>
          </View>
        </View>

        {userStats.lastVisit && (
          <View style={styles.lastVisitCard}>
            <Ionicons name="time" size={20} color="#00d9ff" />
            <View style={styles.lastVisitInfo}>
              <Text style={styles.lastVisitLabel}>Last Predicted</Text>
              <Text style={styles.lastVisitDate}>
                {new Date(userStats.lastVisit).toLocaleDateString()}
              </Text>
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
        <Text style={styles.loadingText}>Loading track profile...</Text>
      </View>
    );
  }

  if (!track) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#ff6b6b" />
        <Text style={styles.errorText}>Track not found</Text>
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
        {renderTabSelector()}
        {selectedTab === 'info' && renderTrackInfo()}
        {selectedTab === 'history' && renderRaceHistory()}
        {selectedTab === 'performance' && renderPerformance()}
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
  trackImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  trackImagePlaceholder: {
    backgroundColor: '#2a3655',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackTypeBadge: {
    position: 'absolute',
    top: 60,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  trackTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  trackName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  trackLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackLocationText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
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
  detailsSection: {
    marginBottom: 24,
  },
  descriptionCard: {
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00d9ff',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#ccd6f6',
    lineHeight: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    width: '48%',
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3655',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#8892b0',
    marginTop: 8,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ccd6f6',
    textAlign: 'center',
  },
  recordsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ccd6f6',
    marginBottom: 16,
  },
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  recordCard: {
    width: '48%',
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3655',
    alignItems: 'center',
  },
  recordValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  recordLabel: {
    fontSize: 11,
    color: '#8892b0',
    textAlign: 'center',
    marginBottom: 4,
  },
  recordIcon: {
    marginBottom: 8,
  },
  recordRider: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ccd6f6',
    textAlign: 'center',
    marginTop: 4,
  },
  recordCount: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 2,
  },
  raceHistoryItem: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3655',
  },
  raceHistoryLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  winnerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD70020',
    justifyContent: 'center',
    alignItems: 'center',
  },
  raceInfo: {
    flex: 1,
  },
  raceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccd6f6',
    marginBottom: 4,
  },
  raceDetails: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 6,
  },
  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerLabel: {
    fontSize: 12,
    color: '#8892b0',
  },
  winnerName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  performanceStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  performanceStatCard: {
    width: '48%',
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3655',
    alignItems: 'center',
  },
  performanceStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  performanceStatLabel: {
    fontSize: 11,
    color: '#8892b0',
    textAlign: 'center',
  },
  lastVisitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3655',
  },
  lastVisitInfo: {
    flex: 1,
  },
  lastVisitLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 4,
  },
  lastVisitDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ccd6f6',
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
