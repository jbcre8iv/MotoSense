/**
 * Expanded Predictions Form Component
 *
 * Allows users to make bonus predictions for:
 * - Holeshot winner (5 pts)
 * - Fastest lap (5 pts)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ExpandedPrediction,
  validateExpandedPredictions,
  getBonusPointDescriptions,
  getMaxBonusPoints,
} from '../services/expandedPredictionsService';

interface Rider {
  id: string;
  name: string;
  number: string;
}

interface ExpandedPredictionsFormProps {
  riders: Rider[];
  onSave: (predictions: ExpandedPrediction) => void;
  initialPredictions?: ExpandedPrediction;
  top5Picks: string[];
}

type SelectionType = 'holeshot' | 'fastestLap' | null;

export default function ExpandedPredictionsForm({
  riders,
  onSave,
  initialPredictions,
  top5Picks,
}: ExpandedPredictionsFormProps) {
  const [expanded, setExpanded] = useState<ExpandedPrediction>(
    initialPredictions || {
      holeshot: null,
      fastestLap: null,
    }
  );
  const [showSelector, setShowSelector] = useState(false);
  const [selectionType, setSelectionType] = useState<SelectionType>(null);

  const getRiderName = (riderId: string | null): string => {
    if (!riderId) return 'Select rider';
    const rider = riders.find((r) => r.id === riderId);
    return rider ? `#${rider.number} ${rider.name}` : 'Unknown';
  };

  const handleSelectRider = (riderId: string) => {
    if (!selectionType) return;

    const newExpanded = { ...expanded };

    if (selectionType === 'holeshot') {
      newExpanded.holeshot = riderId;
    } else if (selectionType === 'fastestLap') {
      newExpanded.fastestLap = riderId;
    }

    setExpanded(newExpanded);
    setShowSelector(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    const validation = validateExpandedPredictions(expanded, top5Picks);

    if (!validation.valid) {
      Alert.alert('Invalid Selections', validation.errors.join('\n'));
      return;
    }

    onSave(expanded);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openSelector = (type: SelectionType) => {
    setSelectionType(type);
    setShowSelector(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getSelectorTitle = (): string => {
    switch (selectionType) {
      case 'holeshot':
        return 'Select Holeshot Winner';
      case 'fastestLap':
        return 'Select Fastest Lap Rider';
      default:
        return 'Select Rider';
    }
  };

  const renderRiderSelector = () => (
    <Modal
      visible={showSelector}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{getSelectorTitle()}</Text>
            <TouchableOpacity onPress={() => setShowSelector(false)}>
              <Ionicons name="close" size={28} color="#8892b0" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={riders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.riderItem}
                onPress={() => handleSelectRider(item.id)}
              >
                <View style={styles.riderNumber}>
                  <Text style={styles.riderNumberText}>{item.number}</Text>
                </View>
                <Text style={styles.riderName}>{item.name}</Text>
                <Ionicons name="checkmark-circle-outline" size={24} color="#00d9ff" />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="star" size={24} color="#ffd93d" />
        <Text style={styles.headerTitle}>Bonus Predictions</Text>
        <View style={styles.maxPoints}>
          <Text style={styles.maxPointsText}>+{getMaxBonusPoints()} pts</Text>
        </View>
      </View>

      {/* Info */}
      <Text style={styles.infoText}>
        Earn bonus points by correctly predicting these additional categories
      </Text>

      {/* Bonus Categories Info */}
      {getBonusPointDescriptions().map((bonus, index) => (
        <View key={index} style={styles.bonusCard}>
          <View style={styles.bonusHeader}>
            <View style={[styles.bonusIcon, { backgroundColor: `${bonus.color}20` }]}>
              <Ionicons name={bonus.icon} size={20} color={bonus.color} />
            </View>
            <View style={styles.bonusInfo}>
              <Text style={styles.bonusTitle}>{bonus.category}</Text>
              <Text style={styles.bonusDescription}>{bonus.description}</Text>
            </View>
            <View style={styles.bonusPoints}>
              <Text style={styles.bonusPointsText}>+{bonus.points}</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Holeshot Winner */}
      <View style={styles.predictionSection}>
        <Text style={styles.sectionLabel}>Holeshot Winner (5 pts)</Text>
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => openSelector('holeshot')}
        >
          <Text
            style={[
              styles.selectionText,
              !expanded.holeshot && styles.placeholderText,
            ]}
          >
            {getRiderName(expanded.holeshot)}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#00d9ff" />
        </TouchableOpacity>
      </View>

      {/* Fastest Lap */}
      <View style={styles.predictionSection}>
        <Text style={styles.sectionLabel}>Fastest Lap (5 pts)</Text>
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => openSelector('fastestLap')}
        >
          <Text
            style={[
              styles.selectionText,
              !expanded.fastestLap && styles.placeholderText,
            ]}
          >
            {getRiderName(expanded.fastestLap)}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#00d9ff" />
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Bonus Predictions</Text>
        <Ionicons name="checkmark-circle" size={24} color="#0a0e27" />
      </TouchableOpacity>

      {renderRiderSelector()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
  },
  maxPoints: {
    backgroundColor: '#ffd93d',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  maxPointsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  infoText: {
    fontSize: 14,
    color: '#8892b0',
    marginBottom: 20,
    lineHeight: 20,
  },
  bonusCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  bonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bonusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bonusInfo: {
    flex: 1,
  },
  bonusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  bonusDescription: {
    fontSize: 12,
    color: '#8892b0',
  },
  bonusPoints: {
    backgroundColor: 'rgba(255, 217, 61, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bonusPointsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffd93d',
  },
  predictionSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  selectionText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  placeholderText: {
    color: '#8892b0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00d9ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1f3a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  riderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  riderNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riderNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  riderName: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
});
