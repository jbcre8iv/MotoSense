import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { mockRaces, mockTracks } from '../../data';
import { useAuth } from '../../contexts/AuthContext';
import { getPredictionForRace, SupabasePrediction } from '../../services/predictionsService';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function LiveRacesTab({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [racePredictions, setRacePredictions] = useState<Record<string, SupabasePrediction | null>>({});
  const [countdowns, setCountdowns] = useState<Record<string, CountdownTime>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load predictions for all races
  useEffect(() => {
    const loadPredictions = async () => {
      if (!user) return;

      const predictions: Record<string, SupabasePrediction | null> = {};
      for (const race of mockRaces) {
        const prediction = await getPredictionForRace(user.id, race.id);
        predictions[race.id] = prediction;
      }
      setRacePredictions(predictions);
    };

    loadPredictions();
  }, [user]);

  // Calculate countdown for each race
  useEffect(() => {
    const newCountdowns: Record<string, CountdownTime> = {};

    mockRaces.forEach((race) => {
      const raceDate = new Date(race.date);
      const diff = raceDate.getTime() - currentTime.getTime();

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        newCountdowns[race.id] = { days, hours, minutes, seconds };
      }
    });

    setCountdowns(newCountdowns);
  }, [currentTime]);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);

    // Reload predictions
    if (user) {
      const predictions: Record<string, SupabasePrediction | null> = {};
      for (const race of mockRaces) {
        const prediction = await getPredictionForRace(user.id, race.id);
        predictions[race.id] = prediction;
      }
      setRacePredictions(predictions);
    }

    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const getRaceStatus = (raceDate: Date): 'upcoming' | 'soon' | 'in_progress' | 'completed' => {
    const now = new Date();
    const diff = raceDate.getTime() - now.getTime();
    const hoursDiff = diff / (1000 * 60 * 60);

    if (diff < 0) return 'completed';
    if (hoursDiff <= 1) return 'in_progress'; // Within 1 hour = in progress
    if (hoursDiff <= 24) return 'soon'; // Within 24 hours = soon
    return 'upcoming';
  };

  const isPredictionLocked = (raceDate: Date): boolean => {
    const now = new Date();
    const diff = raceDate.getTime() - now.getTime();
    const hoursDiff = diff / (1000 * 60 * 60);
    return hoursDiff <= 1; // Lock 1 hour before race
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return '#ff6b6b'; // Red - racing now!
      case 'soon':
        return '#ff9800'; // Orange - coming up
      case 'completed':
        return '#4caf50'; // Green - finished
      default:
        return '#00d9ff'; // Cyan - upcoming
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return 'RACING NOW';
      case 'soon':
        return 'STARTING SOON';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'UPCOMING';
    }
  };

  const formatCountdown = (countdown: CountdownTime): string => {
    if (countdown.days > 0) {
      return `${countdown.days}d ${countdown.hours}h`;
    } else if (countdown.hours > 0) {
      return `${countdown.hours}h ${countdown.minutes}m`;
    } else {
      return `${countdown.minutes}m ${countdown.seconds}s`;
    }
  };

  // Filter and sort races
  const upcomingRaces = mockRaces.filter((race) => {
    const raceDate = new Date(race.date);
    const status = getRaceStatus(raceDate);
    return status !== 'completed';
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const renderRaceCard = (race: any, index: number) => {
    const track = mockTracks.find((t) => t.id === race.trackId);
    const raceDate = new Date(race.date);
    const status = getRaceStatus(raceDate);
    const countdown = countdowns[race.id];
    const prediction = racePredictions[race.id];
    const isLocked = isPredictionLocked(raceDate);
    const statusColor = getStatusColor(status);

    return (
      <View key={race.id} style={styles.raceCard}>
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{getStatusText(status)}</Text>
          {status === 'in_progress' && (
            <Ionicons name="radio" size={16} color="#fff" style={styles.liveIcon} />
          )}
        </View>

        {/* Race info */}
        <View style={styles.raceHeader}>
          <View style={styles.raceHeaderLeft}>
            <Text style={styles.raceName}>{race.name}</Text>
            <Text style={styles.trackName}>{track?.name}</Text>
            <Text style={styles.trackLocation}>
              {track?.city}, {track?.state}
            </Text>
          </View>
          <View style={[styles.roundBadge, { borderColor: statusColor }]}>
            <Text style={styles.roundText}>R{race.round}</Text>
          </View>
        </View>

        {/* Countdown */}
        {status !== 'completed' && countdown && (
          <View style={styles.countdownContainer}>
            <Ionicons name="time-outline" size={32} color={statusColor} />
            <View style={styles.countdownText}>
              <Text style={styles.countdownLabel}>
                {status === 'in_progress' ? 'Started' : 'Starts in'}
              </Text>
              <Text style={[styles.countdownTime, { color: statusColor }]}>
                {formatCountdown(countdown)}
              </Text>
            </View>
          </View>
        )}

        {/* Prediction status */}
        <View style={styles.predictionStatus}>
          {prediction ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
              <Text style={styles.predictionText}>
                Prediction {isLocked ? 'Locked' : 'Submitted'}
              </Text>
              {isLocked && (
                <Ionicons name="lock-closed" size={16} color="#00d9ff" style={{ marginLeft: 8 }} />
              )}
            </>
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={20} color="#ff9800" />
              <Text style={styles.noPredictionText}>
                {isLocked ? 'Predictions Closed' : 'No Prediction Yet'}
              </Text>
            </>
          )}
        </View>

        {/* Race details */}
        <View style={styles.raceDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Series</Text>
            <Text style={styles.detailValue}>{race.series.toUpperCase()}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {raceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>
              {raceDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Action button */}
        {status === 'in_progress' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: statusColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('LiveRace', {
                raceId: race.id,
                raceName: race.name,
              });
            }}
          >
            <Text style={styles.actionButtonText}>Watch Live</Text>
            <Ionicons name="radio" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {status !== 'in_progress' && !isLocked && !prediction && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: statusColor }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Text style={styles.actionButtonText}>Make Prediction</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
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
      {/* Live Timing Notice */}
      <View style={styles.liveTimingNotice}>
        <View style={styles.liveTimingHeader}>
          <Ionicons name="radio" size={24} color="#ff6b6b" />
          <Text style={styles.liveTimingTitle}>Live Race Tracking</Text>
        </View>
        <Text style={styles.liveTimingText}>
          Real-time race updates, live positions, and lap-by-lap timing will appear here automatically during race events.
        </Text>
        <View style={styles.liveTimingFeatures}>
          <View style={styles.featureItem}>
            <Ionicons name="flash" size={16} color="#00d9ff" />
            <Text style={styles.featureText}>Live positions</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="timer" size={16} color="#00d9ff" />
            <Text style={styles.featureText}>Lap times</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="trophy" size={16} color="#00d9ff" />
            <Text style={styles.featureText}>Race updates</Text>
          </View>
        </View>
      </View>

      {/* Upcoming races */}
      {upcomingRaces.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Races</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{upcomingRaces.length}</Text>
            </View>
          </View>
          {upcomingRaces.map(renderRaceCard)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  liveTimingNotice: {
    margin: 20,
    marginBottom: 0,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  liveTimingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  liveTimingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  liveTimingText: {
    fontSize: 14,
    color: '#8892b0',
    lineHeight: 20,
    marginBottom: 16,
  },
  liveTimingFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: '600',
  },
  section: {
    padding: 20,
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
    flex: 1,
  },
  badge: {
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  raceCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  liveIcon: {
    marginLeft: 8,
  },
  raceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  raceHeaderLeft: {
    flex: 1,
  },
  raceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  trackName: {
    fontSize: 14,
    color: '#8892b0',
    marginBottom: 2,
  },
  trackLocation: {
    fontSize: 12,
    color: '#8892b0',
  },
  roundBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
  },
  roundText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0a0e27',
  },
  countdownText: {
    marginLeft: 12,
    flex: 1,
  },
  countdownLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 4,
  },
  countdownTime: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  predictionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  predictionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
    marginLeft: 8,
  },
  noPredictionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff9800',
    marginLeft: 8,
  },
  raceDetails: {
    flexDirection: 'row',
    padding: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#8892b0',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
