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
import { mockRiders } from '../../data/mockRiders';

export default function RiderStatsTab() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Sort riders by number for display
  const sortedRiders = [...mockRiders].sort((a, b) => parseInt(a.number) - parseInt(b.number));

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
          <Text style={styles.sectionTitle}>Rider Statistics</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{mockRiders.length}</Text>
          </View>
        </View>

        <View style={styles.ridersList}>
          {sortedRiders.map((rider, index) => (
            <View key={rider.id} style={styles.riderCard}>
              <View style={styles.riderHeader}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberText}>{rider.number}</Text>
                </View>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>{rider.name}</Text>
                  <Text style={styles.riderTeam}>{rider.team}</Text>
                </View>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Ionicons name="trophy" size={20} color="#ffd93d" />
                  <Text style={styles.statValue}>-</Text>
                  <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="podium" size={20} color="#00d9ff" />
                  <Text style={styles.statValue}>-</Text>
                  <Text style={styles.statLabel}>Podiums</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={20} color="#ff9800" />
                  <Text style={styles.statValue}>-</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#00d9ff" />
          <Text style={styles.infoText}>
            Rider statistics will be automatically calculated from race results
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  badge: {
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  ridersList: {
    gap: 12,
  },
  riderCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  numberBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  riderTeam: {
    fontSize: 12,
    color: '#8892b0',
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 10,
    color: '#8892b0',
    textTransform: 'uppercase',
  },
  infoBox: {
    marginTop: 24,
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
