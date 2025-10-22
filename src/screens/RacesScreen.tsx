import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { mockRaces, mockTracks, mockRiders } from '../data';

export default function RacesScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Race Schedule</Text>
        <Text style={styles.subtitle}>2025 Supercross Season</Text>
      </View>

      <View style={styles.section}>
        {mockRaces.map((race) => {
          const track = mockTracks.find(t => t.id === race.trackId);
          const raceDate = new Date(race.date);
          const isUpcoming = race.status === 'upcoming';

          return (
            <View key={race.id} style={styles.raceCard}>
              <View style={styles.raceHeader}>
                <View>
                  <Text style={styles.raceName}>{race.name}</Text>
                  <Text style={styles.raceLocation}>
                    {track?.name}
                  </Text>
                  <Text style={styles.raceCity}>
                    {track?.city}, {track?.state}
                  </Text>
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
                    day: 'numeric'
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
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>More races coming soon...</Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
  section: {
    padding: 16,
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
});
