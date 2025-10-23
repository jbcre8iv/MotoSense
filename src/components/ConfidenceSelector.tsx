import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ConfidenceLevel } from '../types';
import {
  CONFIDENCE_MULTIPLIERS,
  getConfidenceColor,
  getConfidenceEmoji,
  getRiskDescription,
  calculateConfidencePoints,
} from '../utils/confidenceUtils';

const { width } = Dimensions.get('window');

interface ConfidenceSelectorProps {
  selectedLevel: ConfidenceLevel;
  onSelectLevel: (level: ConfidenceLevel) => void;
  basePoints: number;
  style?: any;
}

export const ConfidenceSelector: React.FC<ConfidenceSelectorProps> = ({
  selectedLevel,
  onSelectLevel,
  basePoints,
  style,
}) => {
  const handleSelectLevel = (level: ConfidenceLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectLevel(level);
  };

  const selectedConfig = CONFIDENCE_MULTIPLIERS.find(
    (c) => c.level === selectedLevel
  );
  const riskInfo = getRiskDescription(selectedLevel);
  const potentialPoints = calculateConfidencePoints(basePoints, selectedLevel);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Confidence Level</Text>
        <Text style={styles.subtitle}>
          Adjust your confidence to risk more points
        </Text>
      </View>

      {/* Confidence Level Buttons */}
      <View style={styles.levelsContainer}>
        {CONFIDENCE_MULTIPLIERS.map((config) => {
          const isSelected = config.level === selectedLevel;
          const color = getConfidenceColor(config.level);
          const emoji = getConfidenceEmoji(config.level);

          return (
            <TouchableOpacity
              key={config.level}
              style={[
                styles.levelButton,
                isSelected && {
                  borderColor: color,
                  borderWidth: 2,
                  backgroundColor: `${color}15`,
                },
              ]}
              onPress={() => handleSelectLevel(config.level)}
              activeOpacity={0.7}
            >
              <Text style={styles.levelEmoji}>{emoji}</Text>
              <Text
                style={[
                  styles.levelMultiplier,
                  isSelected && { color: color },
                ]}
              >
                {config.multiplier}x
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Labels Row */}
      <View style={styles.labelsRow}>
        <Text style={styles.labelText}>Low Risk</Text>
        <Text style={styles.labelText}>Standard</Text>
        <Text style={styles.labelText}>High Risk</Text>
      </View>

      {/* Selected Level Info */}
      {selectedConfig && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Selected</Text>
              <Text style={[styles.infoValue, { color: getConfidenceColor(selectedLevel) }]}>
                {selectedConfig.label}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Risk Level</Text>
              <Text style={[styles.infoValue, { color: getConfidenceColor(selectedLevel) }]}>
                {riskInfo.risk.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>{riskInfo.description}</Text>
          </View>

          {/* Points Calculation */}
          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>Potential Points</Text>
            <View style={styles.pointsCalculation}>
              <Text style={styles.basePoints}>{basePoints}</Text>
              <Text style={styles.multiplierSymbol}>×</Text>
              <Text style={[styles.multiplierValue, { color: getConfidenceColor(selectedLevel) }]}>
                {selectedConfig.multiplier}
              </Text>
              <Text style={styles.equalsSymbol}>=</Text>
              <Text style={[styles.totalPoints, { color: getConfidenceColor(selectedLevel) }]}>
                {potentialPoints}
              </Text>
            </View>
            {selectedLevel !== 3 && (
              <Text style={styles.pointsDiff}>
                {selectedLevel > 3 ? '+' : ''}
                {potentialPoints - basePoints} pts vs standard
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Pro Tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          Higher confidence = more points if correct, but you lose more if wrong!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a3150',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
  levelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelButton: {
    width: (width - 80) / 5,
    aspectRatio: 1,
    backgroundColor: '#0f1428',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3150',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  levelMultiplier: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8892b0',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  labelText: {
    fontSize: 11,
    color: '#8892b0',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#0f1428',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a3150',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: '#2a3150',
    marginHorizontal: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00d9ff',
  },
  descriptionContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a3150',
  },
  descriptionText: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
    lineHeight: 20,
  },
  pointsCard: {
    backgroundColor: '#0a0e27',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  pointsCalculation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  basePoints: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  multiplierSymbol: {
    fontSize: 20,
    color: '#8892b0',
    marginHorizontal: 8,
  },
  multiplierValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00d9ff',
  },
  equalsSymbol: {
    fontSize: 20,
    color: '#8892b0',
    marginHorizontal: 8,
  },
  totalPoints: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00d9ff',
  },
  pointsDiff: {
    fontSize: 13,
    color: '#8892b0',
    marginTop: 8,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1428',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a3150',
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#8892b0',
    lineHeight: 18,
  },
});
