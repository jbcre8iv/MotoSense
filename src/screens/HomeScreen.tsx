import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, LayoutAnimation, Platform, UIManager, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { mockTracks } from '../data';
import { Race } from '../types';
import WeatherCard from '../components/WeatherCard';
import InlinePredictionCard from '../components/InlinePredictionCard';
import { getPredictionForRace, SupabasePrediction } from '../services/predictionsService';
import { useAuth } from '../contexts/AuthContext';
import TutorialOverlay, { useTutorial } from '../components/TutorialOverlay';
import { notificationService } from '../services/notificationService';
import { racesService } from '../services/racesService';
import DemoModeBanner from '../components/DemoModeBanner';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWeatherRaceId, setExpandedWeatherRaceId] = useState<string | null>(null);
  const [expandedPredictionRaceId, setExpandedPredictionRaceId] = useState<string | null>(null);
  const [racePredictions, setRacePredictions] = useState<Record<string, SupabasePrediction | null>>({});
  const [hasDemoRaces, setHasDemoRaces] = useState(false);

  // Tutorial state
  const { tutorialCompleted, currentStep, nextStep, skipTutorial } = useTutorial();

  // Load races from database
  useEffect(() => {
    loadRaces();
  }, []);

  const loadRaces = async () => {
    try {
      const fetchedRaces = await racesService.getRaces();
      setRaces(fetchedRaces);
      setHasDemoRaces(fetchedRaces.some(race => race.is_simulation));
    } catch (error) {
      console.error('[HOME SCREEN] Error loading races:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load predictions for all races
  useEffect(() => {
    const loadPredictions = async () => {
      if (!user || races.length === 0) return;

      const predictions: Record<string, SupabasePrediction | null> = {};
      for (const race of races) {
        const prediction = await getPredictionForRace(user.id, race.id);
        predictions[race.id] = prediction;
      }
      setRacePredictions(predictions);
    };

    loadPredictions();
  }, [user, races]);

  // Schedule race reminders for upcoming races
  useEffect(() => {
    const scheduleRaceReminders = async () => {
      if (!user || races.length === 0) return;

      console.log('📅 [HOME] Scheduling race reminders for upcoming races');

      for (const race of races) {
        const raceDate = new Date(race.date);
        const now = new Date();

        // Only schedule reminders for future races
        if (raceDate > now) {
          await notificationService.scheduleRaceReminder(
            race.id,
            race.name,
            raceDate
          );
        }
      }
    };

    scheduleRaceReminders();
  }, [user, races]);

  const toggleWeather = (raceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    // Close predictions if they're open
    setExpandedPredictionRaceId(null);
    setExpandedWeatherRaceId(expandedWeatherRaceId === raceId ? null : raceId);
  };

  const togglePrediction = (raceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    // Close weather if it's open
    setExpandedWeatherRaceId(null);
    setExpandedPredictionRaceId(expandedPredictionRaceId === raceId ? null : raceId);
  };

  const handlePredictionSaved = async (raceId: string) => {
    // Reload prediction for this race
    if (!user) return;
    const prediction = await getPredictionForRace(user.id, raceId);
    setRacePredictions(prev => ({ ...prev, [raceId]: prediction }));
    setExpandedPredictionRaceId(null);
  };

  const onRefresh = async () => {
    // Haptic feedback on pull
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setRefreshing(true);
    await loadRaces();
    setRefreshing(false);

    // Success haptic after refresh
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d9ff" />
          <Text style={styles.loadingText}>Loading races...</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>MotoSense</Text>
        <Text style={styles.tagline}>Sense The Race</Text>
      </View>

      <View style={styles.section}>
        {hasDemoRaces && <DemoModeBanner />}

        <Text style={styles.sectionTitle}>Upcoming Races</Text>
        {races.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No races scheduled yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Check back soon for upcoming races!
            </Text>
          </View>
        ) : (
          races.filter(race => race.status === 'upcoming').map((race) => {
          const track = mockTracks.find(t => t.id === race.trackId);
          const raceDate = new Date(race.date);
          const isWeatherExpanded = expandedWeatherRaceId === race.id;
          const isPredictionExpanded = expandedPredictionRaceId === race.id;
          const isExpanded = isWeatherExpanded || isPredictionExpanded;
          const isUpcoming = race.status === 'upcoming';
          const existingPrediction = racePredictions[race.id];

          return (
            <View key={race.id} style={styles.raceCardContainer}>
              <View style={[
                styles.raceCard,
                isExpanded && styles.raceCardExpanded
              ]}>
                <View style={styles.raceHeader}>
                  <View style={styles.raceHeaderLeft}>
                    <View style={styles.raceNameRow}>
                      <Text style={styles.raceName}>{race.name}</Text>
                      {race.is_simulation && <DemoModeBanner compact />}
                    </View>
                    <Text style={styles.raceLocation}>
                      {track?.name || race.trackId}
                    </Text>
                    {track && (
                      <Text style={styles.raceCity}>
                        {track.city}, {track.state}
                      </Text>
                    )}
                  </View>
                  <View style={styles.roundBadge}>
                    <Text style={styles.roundBadgeText}>R{race.round}</Text>
                  </View>
                </View>

                <View style={styles.raceDetails}>
                  <Text style={styles.raceDate}>
                    {raceDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    isUpcoming ? styles.upcomingBadge : styles.completedBadge
                  ]}>
                    <Text style={styles.statusText}>{race.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.trackInfo}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Series:</Text>
                    <Text style={styles.infoValue}>{race.series.toUpperCase()}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Type:</Text>
                    <Text style={styles.infoValue}>{track?.type}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Soil:</Text>
                    <Text style={styles.infoValue}>{track?.soilType}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Length:</Text>
                    <Text style={styles.infoValue}>{track?.trackLength} mi</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  {user && !isWeatherExpanded && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.predictionButton]}
                        onPress={() => togglePrediction(race.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionButtonIcon}>
                          {existingPrediction ? '📊 View Prediction' : '📊 Make Prediction'}
                        </Text>
                        <Text style={styles.actionButtonArrow}>{isPredictionExpanded ? '▲' : '▼'}</Text>
                      </TouchableOpacity>

                      {isPredictionExpanded && (
                        <View style={styles.inlineContainer}>
                          <InlinePredictionCard
                            raceId={race.id}
                            raceName={race.name}
                            raceDate={race.date}
                            userId={user.id}
                            onPredictionSaved={() => handlePredictionSaved(race.id)}
                            existingPrediction={existingPrediction}
                          />
                        </View>
                      )}
                    </>
                  )}

                  {track && !isPredictionExpanded && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.weatherButton]}
                        onPress={() => toggleWeather(race.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionButtonIcon}>
                          {isWeatherExpanded ? '☀️ Hide Weather' : '☀️ Show Weather'}
                        </Text>
                        <Text style={styles.actionButtonArrow}>{isWeatherExpanded ? '▲' : '▼'}</Text>
                      </TouchableOpacity>

                      {isWeatherExpanded && (
                        <View style={styles.inlineContainer}>
                          <WeatherCard
                            trackId={track.id}
                            latitude={track.latitude}
                            longitude={track.longitude}
                            trackName={track.name}
                            attached={true}
                          />
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        })
        )}
      </View>
    </ScrollView>

    {/* Tutorial overlay */}
    {user && tutorialCompleted === false && (
      <TutorialOverlay
        currentStep={currentStep}
        onNextStep={nextStep}
        onSkipTutorial={skipTutorial}
      />
    )}
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
    backgroundColor: '#0a0e27',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8892b0',
  },
  header: {
    padding: 20,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 2,
    borderBottomColor: '#00d9ff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#8892b0',
    fontStyle: 'italic',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8892b0',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
  },
  raceCardContainer: {
    marginBottom: 16,
  },
  raceCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00d9ff',
  },
  raceCardExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  raceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  raceHeaderLeft: {
    flex: 1,
  },
  raceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  raceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  raceLocation: {
    fontSize: 14,
    color: '#8892b0',
    marginBottom: 2,
  },
  raceCity: {
    fontSize: 12,
    color: '#8892b0',
  },
  roundBadge: {
    backgroundColor: '#00d9ff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  raceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
  },
  raceDate: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcomingBadge: {
    backgroundColor: '#00d9ff',
  },
  completedBadge: {
    backgroundColor: '#4caf50',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  trackInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#8892b0',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  actionButtons: {
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#0a0e27',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predictionButton: {
    borderColor: '#00d9ff',
  },
  weatherButton: {
    borderColor: '#00d9ff',
  },
  actionButtonIcon: {
    fontSize: 14,
    color: '#00d9ff',
    fontWeight: '600',
  },
  actionButtonArrow: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: 'bold',
  },
  inlineContainer: {
    marginHorizontal: -16,
    marginBottom: -16,
  },
});
