import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { AnalyticsData, getAnalyticsData } from '../services/analyticsService';
import { UserProfile } from '../types';

const screenWidth = Dimensions.get('window').width;

interface Props {
  userProfile: UserProfile;
}

export default function PerformanceDashboard({ userProfile }: Props) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getAnalyticsData(userProfile);
      setAnalyticsData(data);
    } catch (error) {
      console.error('[DASHBOARD] Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: '#1a1f3a',
    backgroundGradientFrom: '#1a1f3a',
    backgroundGradientTo: '#1a1f3a',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 217, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(136, 146, 176, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#00d9ff',
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
        <Text style={styles.loadingText}>Calculating performance metrics...</Text>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No analytics data available yet.</Text>
        <Text style={styles.emptySubtext}>Make more predictions to see your performance trends!</Text>
      </View>
    );
  }

  const { performanceOverTime, positionAccuracy, recentPerformance, streakInfo } = analyticsData;

  // Prepare data for accuracy chart
  const accuracyData = {
    labels: performanceOverTime.accuracy.map((d) => d.date),
    datasets: [
      {
        data: performanceOverTime.accuracy.map((d) => d.value),
        color: (opacity = 1) => `rgba(0, 217, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Prepare data for points chart
  const pointsData = {
    labels: performanceOverTime.points.map((d) => d.date),
    datasets: [
      {
        data: performanceOverTime.points.map((d) => d.value),
      },
    ],
  };

  // Prepare data for position accuracy chart
  const positionData = {
    labels: positionAccuracy.map((p) => `P${p.position}`),
    datasets: [
      {
        data: positionAccuracy.map((p) => p.accuracy),
      },
    ],
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Performance Dashboard</Text>
        <Text style={styles.subtitle}>Track your prediction accuracy and progress</Text>
      </View>

      {/* Recent Performance Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{recentPerformance.last5Accuracy}%</Text>
          <Text style={styles.statLabel}>Last 5</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{recentPerformance.last10Accuracy}%</Text>
          <Text style={styles.statLabel}>Last 10</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{recentPerformance.allTimeAccuracy}%</Text>
          <Text style={styles.statLabel}>All-Time</Text>
        </View>
      </View>

      {/* Accuracy Over Time */}
      {performanceOverTime.accuracy.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Accuracy Trend</Text>
          <LineChart
            data={accuracyData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            yAxisSuffix="%"
          />
        </View>
      )}

      {/* Points Progression */}
      {performanceOverTime.points.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Points Earned</Text>
          <BarChart
            data={pointsData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            withInnerLines={false}
            yAxisLabel=""
            yAxisSuffix="pts"
            showValuesOnTopOfBars={true}
          />
        </View>
      )}

      {/* Position Accuracy */}
      {positionAccuracy.some((p) => p.total > 0) && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Accuracy by Position</Text>
          <Text style={styles.chartSubtitle}>
            Which positions do you predict best?
          </Text>
          <BarChart
            data={positionData}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
            }}
            style={styles.chart}
            withInnerLines={false}
            yAxisLabel=""
            yAxisSuffix="%"
            showValuesOnTopOfBars={true}
          />

          {/* Position Breakdown Details */}
          <View style={styles.positionDetails}>
            {positionAccuracy.map((pos) => (
              <View key={pos.position} style={styles.positionRow}>
                <Text style={styles.positionLabel}>Position {pos.position}</Text>
                <View style={styles.positionStats}>
                  <Text style={styles.positionCorrect}>
                    {pos.correct}/{pos.total} correct
                  </Text>
                  <Text
                    style={[
                      styles.positionAccuracy,
                      pos.accuracy >= 70 && styles.positionAccuracyGood,
                      pos.accuracy < 50 && styles.positionAccuracyLow,
                    ]}
                  >
                    {pos.accuracy}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Streak Info */}
      <View style={styles.streakContainer}>
        <Text style={styles.chartTitle}>Streak Performance</Text>

        <View style={styles.streakRow}>
          <View style={styles.streakCard}>
            <Text style={styles.streakValue}>{streakInfo.current}</Text>
            <Text style={styles.streakLabel}>Current</Text>
          </View>

          <View style={[styles.streakCard, styles.streakCardHighlight]}>
            <Text style={[styles.streakValue, styles.streakValueHighlight]}>
              {streakInfo.best}
            </Text>
            <Text style={styles.streakLabel}>Best Ever</Text>
          </View>

          <View style={styles.streakCard}>
            <Text style={styles.streakValue}>{streakInfo.averageStreak}</Text>
            <Text style={styles.streakLabel}>Average</Text>
          </View>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 Pro Tip</Text>
        <Text style={styles.infoText}>
          Your accuracy improves with practice! Keep making predictions to refine your racing IQ.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8892b0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8892b0',
  },
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  positionDetails: {
    marginTop: 16,
    gap: 8,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0e27',
  },
  positionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  positionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionCorrect: {
    fontSize: 12,
    color: '#8892b0',
  },
  positionAccuracy: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  positionAccuracyGood: {
    color: '#4ade80',
  },
  positionAccuracyLow: {
    color: '#ff6b6b',
  },
  streakContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    padding: 16,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  streakCard: {
    flex: 1,
    backgroundColor: '#0a0e27',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  streakCardHighlight: {
    backgroundColor: '#ff6b6b20',
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  streakValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  streakValueHighlight: {
    color: '#ff6b6b',
  },
  streakLabel: {
    fontSize: 11,
    color: '#8892b0',
    textAlign: 'center',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#00d9ff20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d9ff',
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00d9ff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#8892b0',
    lineHeight: 20,
  },
});
