import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { mockRaces, mockTracks } from '../data';
import InlinePredictionCard from '../components/InlinePredictionCard';
import AdminResultsEntry from '../components/AdminResultsEntry';
import { getPredictionForRace, SupabasePrediction } from '../services/predictionsService';
import { isUserAdmin, getRaceResults, getPredictionScore, RaceResult, PredictionScore } from '../services/resultsService';
import { mockRiders } from '../data/mockRiders';
import { useAuth } from '../contexts/AuthContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ResultsScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPredictionRaceId, setExpandedPredictionRaceId] = useState<string | null>(null);
  const [expandedAdminRaceId, setExpandedAdminRaceId] = useState<string | null>(null);
  const [racePredictions, setRacePredictions] = useState<Record<string, SupabasePrediction | null>>({});
  const [raceResults, setRaceResults] = useState<Record<string, RaceResult[]>>({});
  const [userScores, setUserScores] = useState<Record<string, PredictionScore | null>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const adminStatus = await isUserAdmin(user.id);
      setIsAdmin(adminStatus);
    };

    checkAdmin();
  }, [user]);

  // Load predictions, results, and scores for all completed races
  useEffect(() => {
    const loadRaceData = async () => {
      if (!user) return;

      const predictions: Record<string, SupabasePrediction | null> = {};
      const results: Record<string, RaceResult[]> = {};
      const scores: Record<string, PredictionScore | null> = {};

      const completedRaces = mockRaces.filter(race => race.status === 'completed');

      for (const race of completedRaces) {
        // Load user's prediction
        const prediction = await getPredictionForRace(user.id, race.id);
        predictions[race.id] = prediction;

        // Load race results
        const raceResults = await getRaceResults(race.id);
        results[race.id] = raceResults;

        // Load user's score for this race
        const score = await getPredictionScore(user.id, race.id);
        scores[race.id] = score;
      }

      setRacePredictions(predictions);
      setRaceResults(results);
      setUserScores(scores);
    };

    loadRaceData();
  }, [user]);

  const togglePrediction = (raceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    // Close admin panel if it's open
    setExpandedAdminRaceId(null);
    setExpandedPredictionRaceId(expandedPredictionRaceId === raceId ? null : raceId);
  };

  const toggleAdminPanel = (raceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    // Close prediction if it's open
    setExpandedPredictionRaceId(null);
    setExpandedAdminRaceId(expandedAdminRaceId === raceId ? null : raceId);
  };

  const handlePredictionSaved = async (raceId: string) => {
    // Reload prediction for this race
    if (!user) return;
    const prediction = await getPredictionForRace(user.id, raceId);
    setRacePredictions(prev => ({ ...prev, [raceId]: prediction }));
    setExpandedPredictionRaceId(null);
  };

  const handleResultsSaved = async () => {
    // Close admin panel and reload data to show updated scores
    setExpandedAdminRaceId(null);

    if (!user) return;

    // Reload results and scores for all races
    const results: Record<string, RaceResult[]> = {};
    const scores: Record<string, PredictionScore | null> = {};

    const completedRaces = mockRaces.filter(race => race.status === 'completed');

    for (const race of completedRaces) {
      const raceResults = await getRaceResults(race.id);
      results[race.id] = raceResults;

      const score = await getPredictionScore(user.id, race.id);
      scores[race.id] = score;
    }

    setRaceResults(results);
    setUserScores(scores);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const completedRaces = mockRaces.filter(race => race.status === 'completed');

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
        <Text style={styles.title}>Season Results</Text>
        <Text style={styles.tagline}>Past Races & Predictions</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Completed Races</Text>
        {completedRaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No completed races yet</Text>
            <Text style={styles.emptyStateSubtext}>Check back after the first race of the season</Text>
          </View>
        ) : (
          completedRaces.map((race) => {
            const track = mockTracks.find(t => t.id === race.trackId);
            const raceDate = new Date(race.date);
            const isPredictionExpanded = expandedPredictionRaceId === race.id;
            const isAdminExpanded = expandedAdminRaceId === race.id;
            const isExpanded = isPredictionExpanded || isAdminExpanded;
            const existingPrediction = racePredictions[race.id];
            const results = raceResults[race.id] || [];
            const userScore = userScores[race.id];
            const hasResults = results.length > 0;

            const getRiderById = (riderId: string) => mockRiders.find(r => r.id === riderId);

            return (
              <View key={race.id} style={styles.raceCardContainer}>
                <View style={[
                  styles.raceCard,
                  isExpanded && styles.raceCardExpanded
                ]}>
                  <View style={styles.raceHeader}>
                    <View style={styles.raceHeaderLeft}>
                      <Text style={styles.raceName}>{race.name}</Text>
                      <Text style={styles.raceLocation}>
                        {track?.name}
                      </Text>
                      <Text style={styles.raceCity}>
                        {track?.city}, {track?.state}
                      </Text>
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
                    <View style={styles.completedBadge}>
                      <Text style={styles.statusText}>COMPLETED</Text>
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

                  {hasResults && (
                    <View style={styles.resultsSection}>
                      <Text style={styles.resultsSectionTitle}>Race Results</Text>
                      <View style={styles.resultsListView}>
                        {results.slice(0, 5).map((result) => {
                          const rider = getRiderById(result.rider_id);
                          return (
                            <View key={result.position} style={styles.resultRow}>
                              <View style={styles.resultPosition}>
                                <Text style={styles.resultPositionText}>{result.position}</Text>
                              </View>
                              <View style={styles.resultRiderInfo}>
                                <Text style={styles.resultRiderName}>{rider?.name || 'Unknown'}</Text>
                                <Text style={styles.resultRiderNumber}>#{rider?.number}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      {userScore && (
                        <View style={styles.scoreSection}>
                          <Text style={styles.scoreSectionTitle}>Your Score</Text>
                          <View style={styles.scoreDetails}>
                            <View style={styles.scoreMainPoints}>
                              <Text style={styles.scorePointsLabel}>Total Points</Text>
                              <Text style={styles.scorePointsValue}>{userScore.points_earned}</Text>
                            </View>
                            <View style={styles.scoreBreakdown}>
                              <View style={styles.scoreItem}>
                                <Text style={styles.scoreItemLabel}>Exact Matches:</Text>
                                <Text style={styles.scoreItemValue}>{userScore.exact_matches}</Text>
                              </View>
                              <View style={styles.scoreItem}>
                                <Text style={styles.scoreItemLabel}>Rider Matches:</Text>
                                <Text style={styles.scoreItemValue}>{userScore.rider_matches}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.actionButtons}>
                    {user && !isAdminExpanded && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.predictionButton]}
                          onPress={() => togglePrediction(race.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.actionButtonIcon}>
                            {existingPrediction ? '📊 View Your Prediction' : '📊 No Prediction Made'}
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

                    {isAdmin && !isPredictionExpanded && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.adminButton]}
                          onPress={() => toggleAdminPanel(race.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.actionButtonIconAdmin}>
                            🔧 Enter Race Results
                          </Text>
                          <Text style={styles.actionButtonArrowAdmin}>{isAdminExpanded ? '▲' : '▼'}</Text>
                        </TouchableOpacity>

                        {isAdminExpanded && (
                          <View style={styles.inlineContainer}>
                            <AdminResultsEntry
                              raceId={race.id}
                              raceName={race.name}
                              onResultsSaved={handleResultsSaved}
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
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
    borderLeftColor: '#4caf50',
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
  raceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
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
  completedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
  adminButton: {
    borderColor: '#ff6b35',
    backgroundColor: '#1a1f3a',
  },
  actionButtonIcon: {
    fontSize: 14,
    color: '#00d9ff',
    fontWeight: '600',
  },
  actionButtonIconAdmin: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '600',
  },
  actionButtonArrow: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: 'bold',
  },
  actionButtonArrowAdmin: {
    fontSize: 12,
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  inlineContainer: {
    marginHorizontal: -16,
    marginBottom: -16,
  },
  resultsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
  },
  resultsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  resultsListView: {
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
    padding: 10,
    borderRadius: 8,
  },
  resultPosition: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultPositionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  resultRiderInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultRiderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  resultRiderNumber: {
    fontSize: 12,
    color: '#8892b0',
  },
  scoreSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
  },
  scoreSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  scoreDetails: {
    backgroundColor: '#0a0e27',
    borderRadius: 8,
    padding: 12,
  },
  scoreMainPoints: {
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
    marginBottom: 12,
  },
  scorePointsLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 4,
  },
  scorePointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  scoreBreakdown: {
    gap: 8,
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreItemLabel: {
    fontSize: 12,
    color: '#8892b0',
  },
  scoreItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
