/**
 * Analytics Dashboard Screen
 *
 * Advanced analytics and insights powered by Supabase
 * - User stats overview
 * - Performance trends chart
 * - Position accuracy breakdown
 * - Rider performance analysis
 * - Track performance stats
 * - AI-generated insights
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserStats,
  getRiderPerformance,
  getTrackPerformance,
  getPositionAccuracy,
  getInsights,
  getPerformanceOverTime,
  UserStats,
  RiderPerformance,
  TrackPerformance,
  PositionAccuracy,
} from '../services/analyticsService';

const { width } = Dimensions.get('window');

export default function AnalyticsDashboardScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [riders, setRiders] = useState<RiderPerformance[]>([]);
  const [tracks, setTracks] = useState<TrackPerformance[]>([]);
  const [positionAccuracy, setPositionAccuracy] = useState<PositionAccuracy[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'riders' | 'tracks'>('overview');

  const loadAnalytics = async () => {
    if (!session?.user?.id) return;

    try {
      const [
        userStats,
        riderPerf,
        trackPerf,
        posAccuracy,
        userInsights,
        perfOverTime,
      ] = await Promise.all([
        getUserStats(session.user.id),
        getRiderPerformance(session.user.id),
        getTrackPerformance(session.user.id),
        getPositionAccuracy(session.user.id),
        getInsights(session.user.id),
        getPerformanceOverTime(session.user.id),
      ]);

      setStats(userStats);
      setRiders(riderPerf.slice(0, 5)); // Top 5
      setTracks(trackPerf.slice(0, 5)); // Top 5
      setPositionAccuracy(posAccuracy);
      setInsights(userInsights);
      setPerformanceData(perfOverTime);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [session?.user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const handleTabChange = (tab: 'overview' | 'riders' | 'tracks') => {
    setSelectedTab(tab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderStatsCard = (
    icon: string,
    label: string,
    value: string | number,
    subtitle?: string,
    color: string = '#00d9ff'
  ) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderInsightCard = (insight: string, index: number) => (
    <View key={index} style={styles.insightCard}>
      <Text style={styles.insightText}>{insight}</Text>
    </View>
  );

  const renderPerformanceChart = () => {
    if (!performanceData || performanceData.accuracy.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={48} color="#8892b0" />
          <Text style={styles.emptyChartText}>No data yet</Text>
        </View>
      );
    }

    const chartData = {
      labels: performanceData.accuracy.map((d: any) => d.date),
      datasets: [
        {
          data: performanceData.accuracy.map((d: any) => d.value),
          color: (opacity = 1) => `rgba(0, 217, 255, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };

    return (
      <LineChart
        data={chartData}
        width={width - 48}
        height={220}
        chartConfig={{
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
            r: '6',
            strokeWidth: '2',
            stroke: '#00d9ff',
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#2a2f4a',
            strokeWidth: 1,
          },
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  const renderPositionChart = () => {
    if (positionAccuracy.length === 0) return null;

    const chartData = {
      labels: positionAccuracy.map(p => `P${p.position}`),
      datasets: [
        {
          data: positionAccuracy.map(p => p.accuracy),
        },
      ],
    };

    return (
      <BarChart
        data={chartData}
        width={width - 48}
        height={220}
        yAxisSuffix="%"
        chartConfig={{
          backgroundColor: '#1a1f3a',
          backgroundGradientFrom: '#1a1f3a',
          backgroundGradientTo: '#1a1f3a',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(136, 146, 176, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#2a2f4a',
            strokeWidth: 1,
          },
        }}
        style={styles.chart}
      />
    );
  };

  const renderRiderCard = (rider: RiderPerformance, index: number) => (
    <View key={rider.riderId} style={styles.performanceCard}>
      <View style={styles.performanceRank}>
        <Text style={styles.performanceRankText}>{index + 1}</Text>
      </View>
      <View style={styles.performanceContent}>
        <Text style={styles.performanceName}>
          #{rider.riderNumber} {rider.riderName}
        </Text>
        <View style={styles.performanceStats}>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceStatLabel}>Predicted</Text>
            <Text style={styles.performanceStatValue}>{rider.timesPredicted}x</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceStatLabel}>Accuracy</Text>
            <Text style={[styles.performanceStatValue, { color: '#00d9ff' }]}>
              {rider.accuracy.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceStatLabel}>Points</Text>
            <Text style={[styles.performanceStatValue, { color: '#ffd93d' }]}>
              {rider.totalPoints}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTrackCard = (track: TrackPerformance, index: number) => (
    <View key={track.trackName} style={styles.performanceCard}>
      <View style={styles.performanceRank}>
        <Text style={styles.performanceRankText}>{index + 1}</Text>
      </View>
      <View style={styles.performanceContent}>
        <Text style={styles.performanceName}>{track.trackName}</Text>
        <Text style={styles.performanceLocation}>{track.trackLocation}</Text>
        <View style={styles.performanceStats}>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceStatLabel}>Races</Text>
            <Text style={styles.performanceStatValue}>{track.raceCount}</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceStatLabel}>Avg Points</Text>
            <Text style={[styles.performanceStatValue, { color: '#00d9ff' }]}>
              {track.averagePoints.toFixed(1)}
            </Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceStatLabel}>Total</Text>
            <Text style={[styles.performanceStatValue, { color: '#ffd93d' }]}>
              {track.totalPoints}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={64} color="#8892b0" />
        <Text style={styles.emptyTitle}>No Analytics Yet</Text>
        <Text style={styles.emptyText}>
          Make some predictions to see your analytics!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#00d9ff"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="analytics" size={28} color="#00d9ff" />
        <Text style={styles.title}>Analytics</Text>
      </View>

      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          {insights.map(renderInsightCard)}
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard(
            'trophy',
            'Total Points',
            stats.totalPoints.toLocaleString(),
            `${stats.averagePoints.toFixed(1)} avg`,
            '#ffd93d'
          )}
          {renderStatsCard(
            'target',
            'Accuracy',
            `${stats.overallAccuracy.toFixed(1)}%`,
            `${stats.totalPredictions} predictions`,
            '#00d9ff'
          )}
          {renderStatsCard(
            'flame',
            'Current Streak',
            stats.currentStreak,
            `${stats.longestStreak} longest`,
            '#ff6b6b'
          )}
          {renderStatsCard(
            'star',
            'Perfect Picks',
            stats.perfectPredictions,
            stats.bonusPoints > 0 ? `+${stats.bonusPoints} bonus` : undefined,
            '#9c27b0'
          )}
        </View>
      </View>

      {/* Performance Trend Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accuracy Trend</Text>
        <View style={styles.chartContainer}>
          {renderPerformanceChart()}
        </View>
      </View>

      {/* Position Accuracy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Position Accuracy</Text>
        <View style={styles.chartContainer}>
          {renderPositionChart()}
        </View>
        <View style={styles.positionGrid}>
          {positionAccuracy.map(pos => (
            <View key={pos.position} style={styles.positionCard}>
              <Text style={styles.positionLabel}>P{pos.position}</Text>
              <Text style={styles.positionValue}>{pos.accuracy.toFixed(0)}%</Text>
              <Text style={styles.positionSub}>
                {pos.correct}/{pos.total}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() => handleTabChange('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'riders' && styles.tabActive]}
          onPress={() => handleTabChange('riders')}
        >
          <Text style={[styles.tabText, selectedTab === 'riders' && styles.tabTextActive]}>
            Riders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'tracks' && styles.tabActive]}
          onPress={() => handleTabChange('tracks')}
        >
          <Text style={[styles.tabText, selectedTab === 'tracks' && styles.tabTextActive]}>
            Tracks
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <View style={styles.section}>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>Best Race</Text>
              <Text style={styles.overviewValue}>{stats.bestRacePoints} pts</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>Worst Race</Text>
              <Text style={styles.overviewValue}>{stats.worstRacePoints} pts</Text>
            </View>
          </View>
        </View>
      )}

      {selectedTab === 'riders' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Riders</Text>
          {riders.length > 0 ? (
            riders.map(renderRiderCard)
          ) : (
            <Text style={styles.emptyText}>No rider data yet</Text>
          )}
        </View>
      )}

      {selectedTab === 'tracks' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Tracks</Text>
          {tracks.length > 0 ? (
            tracks.map(renderTrackCard)
          ) : (
            <Text style={styles.emptyText}>No track data yet</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
    padding: 40,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00d9ff',
  },
  insightText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChartText: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 12,
  },
  positionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  positionCard: {
    flex: 1,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  positionLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 4,
  },
  positionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 2,
  },
  positionSub: {
    fontSize: 10,
    color: '#8892b0',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#00d9ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8892b0',
  },
  tabTextActive: {
    color: '#0a0e27',
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2f4a',
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  performanceCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  performanceRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  performanceRankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  performanceContent: {
    flex: 1,
  },
  performanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  performanceLocation: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 8,
  },
  performanceStats: {
    flexDirection: 'row',
    gap: 16,
  },
  performanceStat: {
    alignItems: 'center',
  },
  performanceStatLabel: {
    fontSize: 10,
    color: '#8892b0',
    marginBottom: 2,
  },
  performanceStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
