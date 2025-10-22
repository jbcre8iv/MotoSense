import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { mockRaces, mockTracks } from '../data';
import WeatherCard from '../components/WeatherCard';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MotoSense</Text>
        <Text style={styles.tagline}>Sense The Race</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Races</Text>
        {mockRaces.map((race) => {
          const track = mockTracks.find(t => t.id === race.trackId);
          const raceDate = new Date(race.date);

          return (
            <View key={race.id}>
              <View style={styles.raceCard}>
                <View style={styles.raceHeader}>
                  <Text style={styles.raceName}>{race.name}</Text>
                  <Text style={styles.raceRound}>Round {race.round}</Text>
                </View>
                <Text style={styles.raceLocation}>
                  {track?.name} - {track?.city}, {track?.state}
                </Text>
                <Text style={styles.raceDate}>
                  {raceDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
                <Text style={styles.raceSeries}>{race.series.toUpperCase()}</Text>
              </View>

              {track && (
                <WeatherCard
                  trackId={track.id}
                  latitude={track.latitude}
                  longitude={track.longitude}
                  trackName={track.name}
                />
              )}
            </View>
          );
        })}
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
  raceCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00d9ff',
  },
  raceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  raceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  raceRound: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: '600',
  },
  raceLocation: {
    fontSize: 14,
    color: '#8892b0',
    marginBottom: 4,
  },
  raceDate: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  raceSeries: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: '600',
  },
});
