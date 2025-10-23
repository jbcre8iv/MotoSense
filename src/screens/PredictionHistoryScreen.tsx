/**
 * Prediction History Screen
 *
 * Complete view of user's prediction history with detailed analysis
 * - All predictions with race context
 * - Predicted vs Actual comparison
 * - Filtering by season, track, perfect predictions
 * - Summary statistics
 * - Points breakdown
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import {
  getPredictionHistory,
  getHistorySummary,
  getAvailableSeasons,
  getAvailableTracks,
  PredictionHistoryItem,
  HistoryFilters,
} from '../services/predictionHistoryService';

export default function PredictionHistoryScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
  const [availableTracks, setAvailableTracks] = useState<Array<{ name: string; location: string }>>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const loadHistory = async () => {
    if (!session?.user?.id) return;

    try {
      const [historyData, summaryData, seasons, tracks] = await Promise.all([
        getPredictionHistory(session.user.id, filters),
        getHistorySummary(session.user.id),
        getAvailableSeasons(session.user.id),
        getAvailableTracks(session.user.id),
      ]);

      setHistory(historyData);
      setSummary(summaryData);
      setAvailableSeasons(seasons);
      setAvailableTracks(tracks);
    } catch (error) {
      console.error('Error loading prediction history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [session?.user?.id, filters])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const toggleExpanded = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const applyFilters = (newFilters: HistoryFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const clearFilters = () => {
    setFilters({});
    setShowFilters(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderComparisonRow = (comparison: any, index: number) => {
    const bgColor = comparison.isCorrect ? '#00d9ff15' : '#ff6b6b15';
    const borderColor = comparison.isCorrect ? '#00d9ff' : '#ff6b6b';

    return (
      <View
        key={index}
        style={[
          styles.comparisonRow,
          { backgroundColor: bgColor, borderLeftColor: borderColor },
        ]}
      >
        <View style={styles.comparisonPosition}>
          <Text style={styles.positionText}>P{comparison.position}</Text>
        </View>

        <View style={styles.comparisonPredicted}>
          <Text style={styles.comparisonLabel}>Predicted</Text>
          <Text style={styles.riderText}>
            #{comparison.predictedRiderNumber} {comparison.predictedRiderName}
          </Text>
        </View>

        <View style={styles.comparisonActual}>
          <Text style={styles.comparisonLabel}>Actual</Text>
          <Text style={[styles.riderText, !comparison.actualRiderName && styles.unknownText]}>
            {comparison.actualRiderName
              ? `#${comparison.actualRiderNumber} ${comparison.actualRiderName}`
              : 'TBD'}
          </Text>
        </View>

        <View style={styles.comparisonPoints}>
          <Text style={styles.pointsValue}>+{comparison.pointsEarned}</Text>
        </View>
      </View>
    );
  };

  const renderHistoryItem = ({ item }: { item: PredictionHistoryItem }) => {
    const isExpanded = expandedItem === item.predictionId;
    const hasResults = item.actualResults !== null;
    const formattedDate = new Date(item.raceDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <View style={styles.historyCard}>
        <TouchableOpacity
          style={styles.historyHeader}
          onPress={() => toggleExpanded(item.predictionId)}
          activeOpacity={0.7}
        >
          <View style={styles.historyHeaderLeft}>
            <View style={styles.raceInfo}>
              <Text style={styles.raceName}>{item.raceName}</Text>
              <Text style={styles.trackName}>
                {item.trackName} • {formattedDate}
              </Text>
            </View>
          </View>

          <View style={styles.historyHeaderRight}>
            {item.perfectPrediction && (
              <View style={styles.perfectBadge}>
                <Ionicons name="star" size={16} color="#ffd93d" />
              </View>
            )}
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsBadgeText}>{item.pointsEarned} pts</Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#8892b0"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.historyDetails}>
            {/* Summary Stats */}
            <View style={styles.detailsStats}>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatLabel}>Accuracy</Text>
                <Text style={styles.detailStatValue}>
                  {item.accuracyPercentage.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatLabel}>Points</Text>
                <Text style={styles.detailStatValue}>{item.pointsEarned}</Text>
              </View>
              {item.bonusPoints > 0 && (
                <View style={styles.detailStat}>
                  <Text style={styles.detailStatLabel}>Bonus</Text>
                  <Text style={[styles.detailStatValue, { color: '#ffd93d' }]}>
                    +{item.bonusPoints}
                  </Text>
                </View>
              )}
            </View>

            {/* Bonus Predictions */}
            {(item.holeshotCorrect || item.fastestLapCorrect) && (
              <View style={styles.bonusSection}>
                <Text style={styles.bonusTitle}>Bonus Predictions</Text>
                <View style={styles.bonusItems}>
                  {item.holeshotCorrect && (
                    <View style={styles.bonusItem}>
                      <Ionicons name="flash" size={16} color="#ff6b6b" />
                      <Text style={styles.bonusText}>Holeshot ✓</Text>
                    </View>
                  )}
                  {item.fastestLapCorrect && (
                    <View style={styles.bonusItem}>
                      <Ionicons name="speedometer" size={16} color="#9c27b0" />
                      <Text style={styles.bonusText}>Fastest Lap ✓</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Predictions Comparison */}
            <View style={styles.comparisonSection}>
              <Text style={styles.sectionTitle}>
                {hasResults ? 'Predictions vs Actual' : 'Your Predictions'}
              </Text>
              {item.comparison.map(renderComparisonRow)}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter History</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={28} color="#8892b0" />
            </TouchableOpacity>
          </View>

          {/* Season Filter */}
          {availableSeasons.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Season</Text>
              <View style={styles.filterOptions}>
                {availableSeasons.map(season => (
                  <TouchableOpacity
                    key={season}
                    style={[
                      styles.filterChip,
                      filters.season === season && styles.filterChipActive,
                    ]}
                    onPress={() => setFilters({ ...filters, season })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.season === season && styles.filterChipTextActive,
                      ]}
                    >
                      {season}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Perfect Only Toggle */}
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => setFilters({ ...filters, perfectOnly: !filters.perfectOnly })}
          >
            <View style={styles.toggleLeft}>
              <Ionicons name="star" size={20} color="#ffd93d" />
              <Text style={styles.toggleText}>Perfect Predictions Only</Text>
            </View>
            <View
              style={[
                styles.toggle,
                filters.perfectOnly && styles.toggleActive,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  filters.perfectOnly && styles.toggleThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => applyFilters(filters)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.summarySection}>
      {summary && (
        <>
          <Text style={styles.summaryTitle}>History Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.totalRaces}</Text>
              <Text style={styles.summaryLabel}>Races</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.totalPoints.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Points</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.averagePoints.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Avg Points</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: '#ffd93d' }]}>
                {summary.perfectPredictions}
              </Text>
              <Text style={styles.summaryLabel}>Perfect</Text>
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(true)}
      >
        <Ionicons name="filter" size={20} color="#00d9ff" />
        <Text style={styles.filterButtonText}>
          Filter {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time" size={28} color="#00d9ff" />
        <Text style={styles.title}>Prediction History</Text>
      </View>

      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={item => item.predictionId}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#8892b0" />
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptyText}>
              Your prediction history will appear here after races are completed
            </Text>
          </View>
        }
        contentContainerStyle={history.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00d9ff"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1f3a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8892b0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1f3a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d9ff',
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00d9ff',
  },
  historyCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2f4a',
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  historyHeaderLeft: {
    flex: 1,
  },
  raceInfo: {
    flex: 1,
  },
  raceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  trackName: {
    fontSize: 12,
    color: '#8892b0',
  },
  historyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perfectBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffd93d20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsBadge: {
    backgroundColor: '#00d9ff20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00d9ff',
  },
  historyDetails: {
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
    padding: 16,
  },
  detailsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatLabel: {
    fontSize: 11,
    color: '#8892b0',
    marginBottom: 4,
  },
  detailStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  bonusSection: {
    marginBottom: 16,
  },
  bonusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  bonusItems: {
    flexDirection: 'row',
    gap: 12,
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  bonusText: {
    fontSize: 12,
    color: '#fff',
  },
  comparisonSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    gap: 12,
  },
  comparisonPosition: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  comparisonPredicted: {
    flex: 1,
  },
  comparisonActual: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 10,
    color: '#8892b0',
    marginBottom: 2,
  },
  riderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  unknownText: {
    color: '#8892b0',
    fontStyle: 'italic',
  },
  comparisonPoints: {
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffd93d',
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
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  filterChipActive: {
    backgroundColor: '#00d9ff20',
    borderColor: '#00d9ff',
  },
  filterChipText: {
    fontSize: 14,
    color: '#8892b0',
  },
  filterChipTextActive: {
    color: '#00d9ff',
    fontWeight: '600',
  },
  toggleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
    marginBottom: 24,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    fontSize: 14,
    color: '#fff',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2f4a',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#00d9ff',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2f4a',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8892b0',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#00d9ff',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0e27',
  },
});
