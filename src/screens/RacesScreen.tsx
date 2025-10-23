import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockTracks } from '../data';
import { Race } from '../types';
import { racesService } from '../services/racesService';
import DemoModeBanner from '../components/DemoModeBanner';

export default function RacesScreen() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasDemoRaces, setHasDemoRaces] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<'all' | 'supercross' | 'motocross' | 'championship'>('all');

  useEffect(() => {
    loadRaces();
  }, []);

  const loadRaces = async () => {
    try {
      const fetchedRaces = await racesService.getRaces();
      setRaces(fetchedRaces);
      setHasDemoRaces(fetchedRaces.some(race => race.is_simulation));
    } catch (error) {
      console.error('[RACES SCREEN] Error loading races:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRaces();
    setRefreshing(false);
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
          <Text style={styles.title}>Race Schedule</Text>
          <Text style={styles.subtitle}>2025 Supercross Season</Text>
        </View>

        <View style={styles.section}>
          {hasDemoRaces && <DemoModeBanner />}

          {/* Series Filter Chips */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterChip, selectedSeries === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedSeries('all')}
            >
              <Text style={[styles.filterChipText, selectedSeries === 'all' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedSeries === 'supercross' && styles.filterChipActive]}
              onPress={() => setSelectedSeries('supercross')}
            >
              <Text style={[styles.filterChipText, selectedSeries === 'supercross' && styles.filterChipTextActive]}>
                Supercross
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedSeries === 'motocross' && styles.filterChipActive]}
              onPress={() => setSelectedSeries('motocross')}
            >
              <Text style={[styles.filterChipText, selectedSeries === 'motocross' && styles.filterChipTextActive]}>
                Motocross
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedSeries === 'championship' && styles.filterChipActive]}
              onPress={() => setSelectedSeries('championship')}
            >
              <Text style={[styles.filterChipText, selectedSeries === 'championship' && styles.filterChipTextActive]}>
                Championship
              </Text>
            </TouchableOpacity>
          </View>

          {races.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No races found</Text>
              <Text style={styles.emptyStateSubtext}>
                Races will appear here once they're added to the schedule
              </Text>
            </View>
          ) : (
            races
              .filter(race => selectedSeries === 'all' || race.series === selectedSeries)
              .map((race) => {
              const track = mockTracks.find(t => t.id === race.trackId);
              const raceDate = new Date(race.date);
              const isUpcoming = race.status === 'upcoming';

              return (
                <View key={race.id} style={styles.raceCard}>
                  <View style={styles.raceHeader}>
                    <View style={{ flex: 1 }}>
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
                      <Text style={styles.roundText}>R{race.round}</Text>
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

                  {track && (
                    <View style={styles.trackInfo}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Type:</Text>
                        <Text style={styles.infoValue}>{track.type}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Soil:</Text>
                        <Text style={styles.infoValue}>{track.soilType}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Length:</Text>
                        <Text style={styles.infoValue}>{track.trackLength} mi</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {races.length > 0 && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {hasDemoRaces ? 'More races will be added during beta testing' : 'More races coming soon...'}
            </Text>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
  section: {
    padding: 16,
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
  raceCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00d9ff',
  },
  raceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  roundText: {
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
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8892b0',
    fontStyle: 'italic',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1f3a',
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  filterChipActive: {
    backgroundColor: '#00d9ff',
    borderColor: '#00d9ff',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8892b0',
  },
  filterChipTextActive: {
    color: '#0a0e27',
  },
});
