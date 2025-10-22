import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { mockRaces } from '../../data';

export default function SeasonStatsTab() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Calculate season statistics
  const totalRaces = mockRaces.length;
  const completedRaces = mockRaces.filter(race => race.status === 'completed').length;
  const upcomingRaces = totalRaces - completedRaces;
  const completionPercentage = Math.round((completedRaces / totalRaces) * 100);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#00d9ff"
          colors={['#00d9ff']}
          progressBackgroundColor="#1a1f3a"
        />
      }
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>2025 Season Overview</Text>
        </View>

        {/* Season Progress */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={24} color="#00d9ff" />
            <Text style={styles.cardTitle}>Season Progress</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{completionPercentage}% Complete</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{completedRaces}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{upcomingRaces}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalRaces}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Championship Standings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trophy" size={24} color="#ffd93d" />
            <Text style={styles.cardTitle}>Championship Standings</Text>
          </View>
          <View style={styles.standingsPlaceholder}>
            <Ionicons name="bar-chart" size={48} color="#8892b0" />
            <Text style={styles.placeholderText}>
              Championship standings will appear here once races are completed
            </Text>
          </View>
        </View>

        {/* Series Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="stats-chart" size={24} color="#00d9ff" />
            <Text style={styles.cardTitle}>Series Breakdown</Text>
          </View>
          <View style={styles.seriesBreakdown}>
            <View style={styles.seriesRow}>
              <Text style={styles.seriesLabel}>250SX West</Text>
              <View style={styles.seriesBadge}>
                <Text style={styles.seriesBadgeText}>
                  {mockRaces.filter(r => r.series === '250sx-west').length} races
                </Text>
              </View>
            </View>
            <View style={styles.seriesRow}>
              <Text style={styles.seriesLabel}>250SX East</Text>
              <View style={styles.seriesBadge}>
                <Text style={styles.seriesBadgeText}>
                  {mockRaces.filter(r => r.series === '250sx-east').length} races
                </Text>
              </View>
            </View>
            <View style={styles.seriesRow}>
              <Text style={styles.seriesLabel}>450SX</Text>
              <View style={styles.seriesBadge}>
                <Text style={styles.seriesBadgeText}>
                  {mockRaces.filter(r => r.series === '450sx').length} races
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Performance Insights */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics" size={24} color="#ff9800" />
            <Text style={styles.cardTitle}>Performance Insights</Text>
          </View>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
              <Text style={styles.insightText}>Track your prediction accuracy</Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="trending-up" size={20} color="#00d9ff" />
              <Text style={styles.insightText}>Compare with friends</Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="trophy" size={20} color="#ffd93d" />
              <Text style={styles.insightText}>Unlock achievements</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#00d9ff" />
          <Text style={styles.infoText}>
            More detailed statistics and insights will be available as the season progresses
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#0a0e27',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00d9ff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#8892b0',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#8892b0',
    textTransform: 'uppercase',
  },
  standingsPlaceholder: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  placeholderText: {
    fontSize: 12,
    color: '#8892b0',
    textAlign: 'center',
  },
  seriesBreakdown: {
    gap: 12,
  },
  seriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0a0e27',
    borderRadius: 8,
  },
  seriesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  seriesBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#00d9ff',
  },
  seriesBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#0a0e27',
    borderRadius: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#ffffff',
  },
  infoBox: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1f3a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#8892b0',
    lineHeight: 18,
  },
});
