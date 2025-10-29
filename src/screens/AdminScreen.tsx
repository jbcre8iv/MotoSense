import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Season, Race } from '../types';
import { adminService, RaceInput } from '../services/adminService';

interface AdminScreenProps {
  navigation: any;
}

export default function AdminScreen({ navigation }: AdminScreenProps) {
  const [loading, setLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [season, setSeason] = useState<Season | null>(null);
  const [currentRound, setCurrentRound] = useState<Race | null>(null);
  const [formData, setFormData] = useState<Partial<RaceInput>>({
    name: '',
    series: 'supercross',
    date: '',
    round: 1,
    trackName: '',
    trackLocation: '',
    type: 'main',
    status: 'upcoming',
    is_simulation: true,
  });

  useEffect(() => {
    loadDemoSeason();
    loadCurrentRound();
  }, []);

  const loadDemoSeason = async () => {
    try {
      const demoSeason = await adminService.getDemoSeason();
      if (demoSeason) {
        setSeason(demoSeason);
        setFormData(prev => ({ ...prev, season_id: demoSeason.id }));
      } else {
        console.error('[ADMIN] No demo season found in database');
        Alert.alert(
          'Setup Required',
          'No demo season found. Please run the database migration in Supabase first.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[ADMIN] Error loading demo season:', error);
      Alert.alert('Database Error', `Failed to load demo season: ${error}`);
    }
  };

  const loadCurrentRound = async () => {
    try {
      const round = await adminService.getCurrentRound();
      setCurrentRound(round);
    } catch (error) {
      console.error('[ADMIN] Error loading current round:', error);
    }
  };

  const handleProgressRound = async () => {
    setProgressLoading(true);
    try {
      const result = await adminService.progressRound();

      if (result.success) {
        Alert.alert('Success', result.message);
        await loadCurrentRound(); // Reload current round
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('[ADMIN] Error progressing round:', error);
      Alert.alert('Error', 'Failed to progress round');
    } finally {
      setProgressLoading(false);
    }
  };

  const handleDigressRound = async () => {
    Alert.alert(
      'Go Back One Round?',
      'This will close the current round and re-open the previous round. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go Back',
          style: 'destructive',
          onPress: async () => {
            setProgressLoading(true);
            try {
              const result = await adminService.digressRound();

              if (result.success) {
                Alert.alert('Success', result.message);
                await loadCurrentRound(); // Reload current round
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('[ADMIN] Error digressing round:', error);
              Alert.alert('Error', 'Failed to go back');
            } finally {
              setProgressLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetDemoSeason = async () => {
    Alert.alert(
      'Reset Demo Season?',
      'This will reset ALL races back to upcoming status. All round progression will be lost. This is for beta testing only. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Season',
          style: 'destructive',
          onPress: async () => {
            setProgressLoading(true);
            try {
              const result = await adminService.resetDemoSeason();

              if (result.success) {
                Alert.alert('Success', result.message);
                await loadCurrentRound(); // Reload current round
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('[ADMIN] Error resetting demo season:', error);
              Alert.alert('Error', 'Failed to reset demo season');
            } finally {
              setProgressLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateRace = async () => {
    // Validation
    if (!formData.name || !formData.date || !formData.season_id) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // For now, use a placeholder track ID
      // TODO: Add track selection
      const raceData: RaceInput = {
        name: formData.name!,
        series: formData.series || 'supercross',
        trackName: formData.trackName || formData.name,
        trackLocation: formData.trackLocation || 'TBD',
        date: formData.date!,
        round: formData.round || 1,
        type: formData.type || 'main',
        status: formData.status || 'upcoming',
        season_id: formData.season_id!,
        is_simulation: formData.is_simulation ?? true,
      };

      await adminService.createRace(raceData);

      Alert.alert('Success', 'Race created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setFormData({
              name: '',
              series: 'supercross',
              date: '',
              round: (formData.round || 1) + 1,
              trackName: '',
              trackLocation: '',
              type: 'main',
              status: 'upcoming',
              is_simulation: true,
              season_id: formData.season_id,
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('[ADMIN] Error creating race:', error);
      const errorMessage = error?.message || JSON.stringify(error);
      Alert.alert(
        'Error Creating Race',
        `Database error: ${errorMessage}\n\nPlease check the console for full details.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Season Info */}
        {season && (
          <View style={styles.seasonCard}>
            <Text style={styles.seasonLabel}>Current Season</Text>
            <Text style={styles.seasonName}>{season.name}</Text>
            <Text style={styles.seasonStatus}>Status: {season.status}</Text>
          </View>
        )}

        {/* Round Progression Controls */}
        <View style={styles.progressCard}>
          <Text style={styles.formTitle}>Beta Round Control</Text>

          {currentRound ? (
            <>
              <View style={styles.currentRoundInfo}>
                <Text style={styles.roundLabel}>Current Round</Text>
                <Text style={styles.roundName}>
                  {currentRound.series.charAt(0).toUpperCase() + currentRound.series.slice(1)} Round{' '}
                  {currentRound.round}
                </Text>
                <Text style={styles.roundLocation}>{currentRound.name}</Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Predictions Open</Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.digressButton, progressLoading && styles.buttonDisabled]}
                  onPress={handleDigressRound}
                  disabled={progressLoading}
                >
                  {progressLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="arrow-back" size={18} color="#fff" />
                      <Text style={styles.buttonText}>Digress</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.progressButton, progressLoading && styles.buttonDisabled]}
                  onPress={handleProgressRound}
                  disabled={progressLoading}
                >
                  {progressLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Progress</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.resetSeasonButton, progressLoading && styles.buttonDisabled]}
                onPress={handleResetDemoSeason}
                disabled={progressLoading}
              >
                {progressLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh-circle" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Reset Demo Season</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noRoundContainer}>
              <Text style={styles.noRoundText}>No round currently open</Text>
              <TouchableOpacity
                style={[styles.progressButton, progressLoading && styles.buttonDisabled]}
                onPress={handleProgressRound}
                disabled={progressLoading}
              >
                {progressLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Start Round 1</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Create Race Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create New Race</Text>

          <Text style={styles.label}>Race Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="e.g., Anaheim 1"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Series</Text>
          <View style={styles.pickerRow}>
            {(['supercross', 'motocross', 'championship'] as const).map((series) => (
              <TouchableOpacity
                key={series}
                style={[
                  styles.pickerButton,
                  formData.series === series && styles.pickerButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, series })}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    formData.series === series && styles.pickerButtonTextActive,
                  ]}
                >
                  {series.charAt(0).toUpperCase() + series.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={formData.date}
            onChangeText={(text) => setFormData({ ...formData, date: text })}
            placeholder="2025-01-07"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Round Number</Text>
          <TextInput
            style={styles.input}
            value={String(formData.round)}
            onChangeText={(text) => setFormData({ ...formData, round: parseInt(text) || 1 })}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.pickerRow}>
            {(['practice', 'qualifying', 'heat', 'main'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerButtonSmall,
                  formData.type === type && styles.pickerButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, type })}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    formData.type === type && styles.pickerButtonTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerRow}>
            {(['upcoming', 'live', 'completed'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.pickerButton,
                  formData.status === status && styles.pickerButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, status })}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    formData.status === status && styles.pickerButtonTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateRace}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.createButtonText}>Create Race</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#4CAF50" />
          <Text style={styles.infoText}>
            This admin panel allows manual entry of 2025 season races for demo mode. All races
            created here will be marked as simulation races for beta testing.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#0f1535',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1f3a',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  seasonCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  seasonLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  seasonName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  seasonStatus: {
    fontSize: 14,
    color: '#4CAF50',
  },
  formCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0f1535',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerButton: {
    flex: 1,
    backgroundColor: '#0f1535',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  pickerButtonSmall: {
    backgroundColor: '#0f1535',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  pickerButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  pickerButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerButtonTextActive: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  infoText: {
    flex: 1,
    color: '#4CAF50',
    fontSize: 14,
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  currentRoundInfo: {
    marginBottom: 20,
  },
  roundLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  roundName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  roundLocation: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  digressButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  progressButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  noRoundContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noRoundText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  resetSeasonButton: {
    width: '100%',
    backgroundColor: '#f44336',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
});
