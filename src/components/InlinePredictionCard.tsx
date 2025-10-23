import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { mockRiders } from '../data';
import { Prediction, ConfidenceLevel } from '../types';
import { updateUserStats } from '../services/storageService';
import { savePredictionToSupabase, SupabasePrediction } from '../services/predictionsService';
import { ConfidenceSelector } from './ConfidenceSelector';
import { getConfidenceEmoji, formatConfidenceLevel } from '../utils/confidenceUtils';

interface InlinePredictionCardProps {
  raceId: string;
  raceName: string;
  raceDate: string;
  userId: string;
  onPredictionSaved: () => void;
  existingPrediction?: SupabasePrediction | null;
}

export default function InlinePredictionCard({
  raceId,
  raceName,
  raceDate,
  userId,
  onPredictionSaved,
  existingPrediction
}: InlinePredictionCardProps) {
  const [predictions, setPredictions] = useState<{ [position: number]: string }>(() => {
    if (existingPrediction?.predictions) {
      return existingPrediction.predictions;
    }
    return {};
  });

  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>(() => {
    return (existingPrediction?.confidence_level as ConfidenceLevel) || 3; // Default to neutral
  });

  // Check if predictions are locked (within 1 hour of race start)
  const isPredictionLocked = () => {
    const now = new Date();
    const race = new Date(raceDate);
    const oneHourBeforeRace = new Date(race.getTime() - 60 * 60 * 1000);
    return now >= oneHourBeforeRace;
  };

  const isLocked = isPredictionLocked();
  const isViewMode = !!existingPrediction || isLocked;

  const handleRiderSelect = (position: number, riderId: string) => {
    if (isViewMode) return; // Don't allow editing existing predictions

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPredictions(prev => ({
      ...prev,
      [position]: riderId
    }));
  };

  const submitPrediction = async () => {
    const predictionCount = Object.keys(predictions).length;
    if (predictionCount < 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Incomplete', 'Please select riders for all 5 positions');
      return;
    }

    try {
      // Save to Supabase with confidence level
      await savePredictionToSupabase(userId, raceId, predictions, confidenceLevel);

      // Update local stats
      const prediction: Prediction = {
        id: `prediction_${Date.now()}`,
        userId,
        raceId,
        predictions: Object.entries(predictions).map(([position, riderId]) => ({
          riderId,
          predictedPosition: parseInt(position)
        })),
        timestamp: new Date().toISOString(),
        confidenceLevel,
      };
      await updateUserStats(prediction);

      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Success!', 'Your predictions have been saved!', [
        {
          text: 'OK',
          onPress: () => onPredictionSaved()
        }
      ]);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save prediction. Please try again.');
      console.error('Error saving prediction:', error);
    }
  };

  const getRiderName = (riderId: string) => {
    const rider = mockRiders.find(r => r.id === riderId);
    return rider ? `#${rider.number} ${rider.name}` : 'Not selected';
  };

  const getTitle = () => {
    if (isLocked && !existingPrediction) {
      return 'Predictions Locked';
    }
    if (isLocked && existingPrediction) {
      return 'Your Prediction (Locked)';
    }
    if (existingPrediction) {
      return 'Your Prediction';
    }
    return 'Pick Your Top 5';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getTitle()}</Text>
        {isLocked && (
          <Text style={styles.lockMessage}>
            Predictions locked 1 hour before race start
          </Text>
        )}
      </View>

      {isLocked && !existingPrediction ? (
        <View style={styles.noPredictionMessage}>
          <Text style={styles.noPredictionText}>
            No prediction was made before the deadline
          </Text>
        </View>
      ) : (
        <>
        {[1, 2, 3, 4, 5].map((position) => (
          <View key={position} style={styles.positionRow}>
            <View style={styles.positionLabel}>
              <Text style={styles.positionNumber}>P{position}</Text>
            </View>

            {isViewMode ? (
              <View style={styles.selectedRiderView}>
                <Text style={styles.selectedRiderText}>{getRiderName(predictions[position])}</Text>
              </View>
            ) : (
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
                    <Text style={[
                      styles.riderNumber,
                      isSelected && styles.riderNumberSelected,
                      isAlreadyPicked && styles.riderNumberDisabled
                    ]}>
                      #{rider.number}
                    </Text>
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
          )}
        </View>
        ))}

        {/* Confidence Level Section */}
        {isViewMode ? (
          <View style={styles.confidenceDisplayCard}>
            <Text style={styles.confidenceDisplayLabel}>Confidence Level</Text>
            <View style={styles.confidenceDisplayRow}>
              <Text style={styles.confidenceEmoji}>
                {getConfidenceEmoji(confidenceLevel)}
              </Text>
              <Text style={styles.confidenceDisplayText}>
                {formatConfidenceLevel(confidenceLevel)}
              </Text>
            </View>
          </View>
        ) : (
          <ConfidenceSelector
            selectedLevel={confidenceLevel}
            onSelectLevel={setConfidenceLevel}
            basePoints={100}
            style={styles.confidenceSelector}
          />
        )}
        </>
      )}

      {!isViewMode && (
        <TouchableOpacity style={styles.submitButton} onPress={submitPrediction}>
          <Text style={styles.submitButtonText}>Submit Predictions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  lockMessage: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 4,
    fontStyle: 'italic',
  },
  noPredictionMessage: {
    backgroundColor: '#1a1f3a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  noPredictionText: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
  },
  positionRow: {
    marginBottom: 8,
  },
  positionLabel: {
    marginBottom: 6,
  },
  positionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  selectedRiderView: {
    backgroundColor: '#0a0e27',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  selectedRiderText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  ridersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  riderButton: {
    backgroundColor: '#0a0e27',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#8892b0',
    minWidth: '48%',
    flex: 1,
    maxWidth: '48%',
  },
  riderButtonSelected: {
    backgroundColor: '#00d9ff',
    borderColor: '#00d9ff',
  },
  riderButtonDisabled: {
    opacity: 0.3,
  },
  riderNumber: {
    fontSize: 11,
    color: '#00d9ff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riderNumberSelected: {
    color: '#0a0e27',
  },
  riderNumberDisabled: {
    color: '#8892b0',
  },
  riderName: {
    fontSize: 12,
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
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  confidenceSelector: {
    marginTop: 20,
    marginBottom: 8,
  },
  confidenceDisplayCard: {
    backgroundColor: '#0a0e27',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2a3150',
  },
  confidenceDisplayLabel: {
    fontSize: 14,
    color: '#8892b0',
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  confidenceDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confidenceEmoji: {
    fontSize: 24,
  },
  confidenceDisplayText: {
    fontSize: 16,
    color: '#00d9ff',
    fontWeight: '700',
  },
});
