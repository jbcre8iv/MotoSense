import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PredictionScore, RiderScore } from '../services/scoringService';
import { getConfidenceEmoji, formatConfidenceLevel } from '../utils/confidenceUtils';
import { mockRiders } from '../data';

interface ScoreBreakdownProps {
  score: PredictionScore;
  showDetails?: boolean;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  score,
  showDetails = true,
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const getRiderName = (riderId: string) => {
    const rider = mockRiders.find((r) => r.id === riderId);
    return rider ? `#${rider.number} ${rider.name}` : 'Unknown Rider';
  };

  const getPositionDiffColor = (diff: number) => {
    if (diff === 0) return '#00ff00';
    if (diff === 1) return '#00d9ff';
    if (diff === 2) return '#ffa726';
    return '#ff6b6b';
  };

  return (
    <View style={styles.container}>
      {/* Header with total points */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Score Breakdown</Text>
          <Text style={styles.accuracy}>
            {score.accuracy.toFixed(1)}% Accuracy
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.totalPoints}>{score.totalPoints}</Text>
          <Text style={styles.pointsLabel}>points</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#00d9ff"
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.detailsContainer}>
          {/* Individual Rider Scores */}
          {showDetails && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Position Scores</Text>
              {score.riderScores.map((riderScore: RiderScore, index: number) => (
                <View key={index} style={styles.riderRow}>
                  <View style={styles.riderInfo}>
                    <Text style={styles.riderName}>
                      {getRiderName(riderScore.riderId)}
                    </Text>
                    <Text style={styles.positionText}>
                      Predicted: P{riderScore.predictedPosition} → Actual: P
                      {riderScore.actualPosition}
                    </Text>
                  </View>
                  <View style={styles.riderScoreContainer}>
                    <Text
                      style={[
                        styles.positionDiff,
                        { color: getPositionDiffColor(riderScore.positionDiff) },
                      ]}
                    >
                      {riderScore.positionDiff === 0
                        ? '✓ Exact'
                        : `±${riderScore.positionDiff}`}
                    </Text>
                    <Text style={styles.riderPoints}>
                      +{riderScore.pointsEarned}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Points Calculation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calculation</Text>

            {/* Base Points */}
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Base Points</Text>
              <Text style={styles.calculationValue}>{score.baseTotal}</Text>
            </View>

            {/* Confidence Multiplier */}
            {score.confidenceLevel && score.confidenceMultiplier !== 1.0 && (
              <View style={styles.calculationRow}>
                <View style={styles.calculationLabelContainer}>
                  <Text style={styles.calculationLabel}>
                    Confidence {getConfidenceEmoji(score.confidenceLevel)}
                  </Text>
                  <Text style={styles.calculationSubtext}>
                    {formatConfidenceLevel(score.confidenceLevel)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.calculationValue,
                    score.confidenceBonus > 0
                      ? styles.bonusText
                      : styles.penaltyText,
                  ]}
                >
                  {score.confidenceBonus > 0 ? '+' : ''}
                  {score.confidenceBonus}
                </Text>
              </View>
            )}

            {/* Subtotal */}
            <View style={[styles.calculationRow, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>
                {score.subtotalAfterConfidence}
              </Text>
            </View>

            {/* Perfect Prediction Bonus */}
            {score.perfectPredictionBonus > 0 && (
              <View style={styles.calculationRow}>
                <View style={styles.calculationLabelContainer}>
                  <Text style={styles.calculationLabel}>Perfect! 🏆</Text>
                  <Text style={styles.calculationSubtext}>
                    All positions exact
                  </Text>
                </View>
                <Text style={[styles.calculationValue, styles.bonusText]}>
                  +{score.perfectPredictionBonus}
                </Text>
              </View>
            )}

            {/* Streak Bonus */}
            {score.streakBonus > 0 && (
              <View style={styles.calculationRow}>
                <View style={styles.calculationLabelContainer}>
                  <Text style={styles.calculationLabel}>
                    Streak Bonus 🔥
                  </Text>
                  <Text style={styles.calculationSubtext}>
                    {score.streakDays} day streak (
                    {score.streakMultiplier.toFixed(2)}x)
                  </Text>
                </View>
                <Text style={[styles.calculationValue, styles.bonusText]}>
                  +{score.streakBonus}
                </Text>
              </View>
            )}

            {/* Final Total */}
            <View style={[styles.calculationRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Points</Text>
              <Text style={styles.totalValue}>{score.totalPoints}</Text>
            </View>
          </View>

          {/* Performance Badge */}
          {score.isPerfectPrediction && (
            <View style={styles.perfectBadge}>
              <Text style={styles.perfectBadgeText}>
                🏆 PERFECT PREDICTION 🏆
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a3150',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  accuracy: {
    fontSize: 14,
    color: '#8892b0',
  },
  headerRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalPoints: {
    fontSize: 32,
    fontWeight: '800',
    color: '#00d9ff',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#8892b0',
    marginBottom: 4,
  },
  chevron: {
    marginLeft: 8,
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#2a3150',
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00d9ff',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  riderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f1428',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  positionText: {
    fontSize: 12,
    color: '#8892b0',
  },
  riderScoreContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  positionDiff: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  riderPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00d9ff',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f1428',
  },
  calculationLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  calculationLabelContainer: {
    flex: 1,
  },
  calculationSubtext: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 2,
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bonusText: {
    color: '#00ff00',
  },
  penaltyText: {
    color: '#ff6b6b',
  },
  subtotalRow: {
    backgroundColor: '#0f1428',
    paddingHorizontal: 12,
    marginHorizontal: -16,
    paddingHorizontal: 28,
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#8892b0',
    fontWeight: '600',
  },
  subtotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  totalRow: {
    backgroundColor: '#00d9ff',
    paddingVertical: 14,
    marginHorizontal: -16,
    paddingHorizontal: 28,
    marginTop: 8,
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 16,
    color: '#0a0e27',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0a0e27',
  },
  perfectBadge: {
    backgroundColor: '#ffd700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  perfectBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a0e27',
  },
});
