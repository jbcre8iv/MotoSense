import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { mockRaces, mockTracks, mockRiders } from '../data';
import { Prediction } from '../types';
import { savePrediction, updateUserStats } from '../services/storageService';

export default function PredictionsScreen() {
  const [selectedRace, setSelectedRace] = useState(mockRaces[0]);
  const [predictions, setPredictions] = useState<{ [position: number]: string }>({});

  const handleRiderSelect = (position: number, riderId: string) => {
    setPredictions(prev => ({
      ...prev,
      [position]: riderId
    }));
  };

  const submitPrediction = async () => {
    const predictionCount = Object.keys(predictions).length;
    if (predictionCount < 5) {
      Alert.alert('Incomplete', 'Please select riders for all 5 positions');
      return;
    }

    try {
      const prediction: Prediction = {
        id: `prediction_${Date.now()}`,
        userId: 'current_user',
        raceId: selectedRace.id,
        predictions: Object.entries(predictions).map(([position, riderId]) => ({
          riderId,
          predictedPosition: parseInt(position)
        })),
        timestamp: new Date().toISOString(),
      };

      await savePrediction(prediction);
      await updateUserStats(prediction);

      Alert.alert('Success!', 'Your predictions have been saved! Check your profile to see updated stats.', [
        {
          text: 'OK',
          onPress: () => setPredictions({})
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save prediction. Please try again.');
      console.error('Error saving prediction:', error);
    }
  };

  const track = mockTracks.find(t => t.id === selectedRace.trackId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Make Your Predictions</Text>
        <Text style={styles.subtitle}>Educational predictions - no prizes</Text>
      </View>

      <View style={styles.raceInfo}>
        <Text style={styles.raceName}>{selectedRace.name}</Text>
        <Text style={styles.raceLocation}>{track?.city}, {track?.state}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pick Your Top 5</Text>

        {[1, 2, 3, 4, 5].map((position) => (
          <View key={position} style={styles.positionCard}>
            <View style={styles.positionHeader}>
              <Text style={styles.positionNumber}>P{position}</Text>
              <Text style={styles.positionLabel}>
                {position === 1 ? '1st Place' : position === 2 ? '2nd Place' : position === 3 ? '3rd Place' : `${position}th Place`}
              </Text>
            </View>

            <View style={styles.ridersGrid}>
              {mockRiders.map((rider) => {
                const isSelected = predictions[position] === rider.id;
                const isAlreadyPicked = Object.values(predictions).includes(rider.id) && predictions[position] !== rider.id;

                return (
                  <TouchableOpacity
                    key={rider.id}
                    style={[
                      styles.riderButton,
                      isSelected && styles.riderButtonSelected,
                      isAlreadyPicked && styles.riderButtonDisabled
                    ]}
                    onPress={() => !isAlreadyPicked && handleRiderSelect(position, rider.id)}
                    disabled={isAlreadyPicked}
                  >
                    <Text style={styles.riderNumber}>#{rider.number}</Text>
                    <Text style={[
                      styles.riderName,
                      isSelected && styles.riderNameSelected,
                      isAlreadyPicked && styles.riderNameDisabled
                    ]}>
                      {rider.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={submitPrediction}>
        <Text style={styles.submitButtonText}>Submit Predictions</Text>
      </TouchableOpacity>
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
    fontSize: 12,
    color: '#8892b0',
  },
  raceInfo: {
    padding: 16,
    backgroundColor: '#1a1f3a',
    marginTop: 8,
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
  positionCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginRight: 12,
    width: 36,
  },
  positionLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  ridersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  riderButton: {
    backgroundColor: '#0a0e27',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#8892b0',
    minWidth: '48%',
    marginBottom: 8,
  },
  riderButtonSelected: {
    backgroundColor: '#00d9ff',
    borderColor: '#00d9ff',
  },
  riderButtonDisabled: {
    opacity: 0.3,
  },
  riderNumber: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riderName: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  riderNameSelected: {
    color: '#0a0e27',
  },
  riderNameDisabled: {
    color: '#8892b0',
  },
  submitButton: {
    backgroundColor: '#00d9ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
});
