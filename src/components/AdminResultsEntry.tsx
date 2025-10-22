import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { mockRiders } from '../data/mockRiders';
import { saveRaceResults, getRaceResults, RaceResult, deleteRaceResults } from '../services/resultsService';

interface AdminResultsEntryProps {
  raceId: string;
  raceName: string;
  onResultsSaved: () => void;
}

export default function AdminResultsEntry({ raceId, raceName, onResultsSaved }: AdminResultsEntryProps) {
  const [selectedRiders, setSelectedRiders] = useState<{ [position: number]: string }>({});
  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [existingResults, setExistingResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Load existing results
  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      const results = await getRaceResults(raceId);
      setExistingResults(results);

      // Populate selectedRiders from existing results
      const ridersMap: { [position: number]: string } = {};
      results.forEach(result => {
        ridersMap[result.position] = result.rider_id;
      });
      setSelectedRiders(ridersMap);
      setLoading(false);
    };

    loadResults();
  }, [raceId]);

  const handleRiderSelect = (position: number, riderId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if this rider is already selected for another position
    const existingPosition = Object.entries(selectedRiders).find(
      ([pos, id]) => id === riderId && parseInt(pos) !== position
    );

    if (existingPosition) {
      Alert.alert(
        'Rider Already Selected',
        `This rider is already selected for position ${existingPosition[0]}. Each rider can only finish in one position.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedRiders(prev => ({ ...prev, [position]: riderId }));
    setExpandedPosition(null);
  };

  const handleSave = async () => {
    // Validate all 5 positions are filled
    const positions = [1, 2, 3, 4, 5];
    const missingPositions = positions.filter(pos => !selectedRiders[pos]);

    if (missingPositions.length > 0) {
      Alert.alert(
        'Incomplete Results',
        `Please select riders for all 5 positions. Missing: ${missingPositions.join(', ')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      const results = positions.map(position => ({
        position,
        riderId: selectedRiders[position],
      }));

      await saveRaceResults(raceId, results);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Results Saved',
        'Race results have been saved and scores have been calculated for all predictions.',
        [
          {
            text: 'OK',
            onPress: () => onResultsSaved(),
          },
        ]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Failed to save results: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Results',
      'Are you sure you want to delete these race results? This will also delete all calculated scores for this race.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await deleteRaceResults(raceId);
              setSelectedRiders({});
              setExistingResults([]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Deleted', 'Race results have been deleted.');
              onResultsSaved();
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', `Failed to delete results: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const getRiderById = (riderId: string) => mockRiders.find(r => r.id === riderId);

  const isPositionFilled = (position: number) => !!selectedRiders[position];

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading results...</Text>
      </View>
    );
  }

  const hasExistingResults = existingResults.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {hasExistingResults ? 'Race Results (Admin)' : 'Enter Race Results (Admin)'}
        </Text>
        <Text style={styles.subtitle}>Select the top 5 finishers in order</Text>
      </View>

      {[1, 2, 3, 4, 5].map((position) => {
        const selectedRider = selectedRiders[position] ? getRiderById(selectedRiders[position]) : null;
        const isExpanded = expandedPosition === position;

        return (
          <View key={position} style={styles.positionRow}>
            <View style={styles.positionLabelContainer}>
              <Text style={styles.positionNumber}>{position}</Text>
              <Text style={styles.positionLabel}>{getPositionSuffix(position)}</Text>
            </View>

            <View style={styles.selectionContainer}>
              {selectedRider ? (
                <TouchableOpacity
                  style={styles.selectedRiderView}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpandedPosition(isExpanded ? null : position);
                  }}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.selectedRiderName}>{selectedRider.name}</Text>
                    <Text style={styles.selectedRiderDetails}>
                      #{selectedRider.number} · {selectedRider.team}
                    </Text>
                  </View>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpandedPosition(isExpanded ? null : position);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectButtonText}>Select Rider</Text>
                  <Text style={styles.selectButtonArrow}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
              )}

              {isExpanded && (
                <ScrollView style={styles.riderList} nestedScrollEnabled>
                  {mockRiders.map((rider) => {
                    const isSelected = selectedRiders[position] === rider.id;
                    const isDisabled = Object.values(selectedRiders).includes(rider.id);

                    return (
                      <TouchableOpacity
                        key={rider.id}
                        style={[
                          styles.riderItem,
                          isSelected && styles.riderItemSelected,
                          isDisabled && !isSelected && styles.riderItemDisabled,
                        ]}
                        onPress={() => !isDisabled && handleRiderSelect(position, rider.id)}
                        disabled={isDisabled && !isSelected}
                        activeOpacity={0.7}
                      >
                        <View style={styles.riderItemLeft}>
                          <Text style={[
                            styles.riderNumber,
                            isDisabled && !isSelected && styles.riderNumberDisabled
                          ]}>
                            #{rider.number}
                          </Text>
                          <View>
                            <Text style={[
                              styles.riderName,
                              isDisabled && !isSelected && styles.riderNameDisabled
                            ]}>
                              {rider.name}
                            </Text>
                            <Text style={[
                              styles.riderTeam,
                              isDisabled && !isSelected && styles.riderTeamDisabled
                            ]}>
                              {rider.team}
                            </Text>
                          </View>
                        </View>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        {isDisabled && !isSelected && (
                          <Text style={styles.alreadySelected}>Selected</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : hasExistingResults ? 'Update Results' : 'Save Results'}
          </Text>
        </TouchableOpacity>

        {hasExistingResults && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>Delete Results</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function getPositionSuffix(position: number): string {
  switch (position) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0e27',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#8892b0',
  },
  loadingText: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
    paddingVertical: 20,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  positionLabelContainer: {
    width: 50,
    paddingTop: 12,
  },
  positionNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  positionLabel: {
    fontSize: 10,
    color: '#8892b0',
  },
  selectionContainer: {
    flex: 1,
  },
  selectedRiderView: {
    backgroundColor: '#1a1f3a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff6b35',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedRiderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  selectedRiderDetails: {
    fontSize: 12,
    color: '#8892b0',
  },
  changeText: {
    fontSize: 12,
    color: '#ff6b35',
    fontWeight: '600',
  },
  selectButton: {
    backgroundColor: '#1a1f3a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6b35',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '600',
  },
  selectButtonArrow: {
    fontSize: 12,
    color: '#ff6b35',
  },
  riderList: {
    maxHeight: 200,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#1a1f3a',
  },
  riderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  riderItemSelected: {
    backgroundColor: '#2a2f4a',
  },
  riderItemDisabled: {
    opacity: 0.4,
  },
  riderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  riderNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginRight: 12,
    width: 35,
  },
  riderNumberDisabled: {
    color: '#8892b0',
  },
  riderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  riderNameDisabled: {
    color: '#8892b0',
  },
  riderTeam: {
    fontSize: 11,
    color: '#8892b0',
  },
  riderTeamDisabled: {
    color: '#5a5f7a',
  },
  checkmark: {
    fontSize: 18,
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  alreadySelected: {
    fontSize: 10,
    color: '#8892b0',
  },
  actions: {
    marginTop: 16,
    marginBottom: 16,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  deleteButton: {
    backgroundColor: '#1a1f3a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff4444',
  },
});
