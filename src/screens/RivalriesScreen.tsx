import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getUserRivalries,
  RivalrySummary,
} from '../services/rivalriesService';
import { useAuth } from '../contexts/AuthContext';

type RivalriesScreenNavigationProp = NativeStackNavigationProp<any>;

export default function RivalriesScreen() {
  const navigation = useNavigation<RivalriesScreenNavigationProp>();
  const { session } = useAuth();
  const [rivalries, setRivalries] = useState<RivalrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRivalries = async () => {
    if (!session?.user?.id) return;

    try {
      const data = await getUserRivalries(session.user.id);
      setRivalries(data);
    } catch (error) {
      console.error('Error loading rivalries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRivalries();
    }, [session?.user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRivalries();
  };

  const getRecordText = (summary: RivalrySummary) => {
    return `${summary.wins}W - ${summary.losses}L - ${summary.ties}T`;
  };

  const getWinPercentage = (summary: RivalrySummary) => {
    const total = summary.total_races;
    if (total === 0) return 0;
    return Math.round((summary.wins / total) * 100);
  };

  const renderRivalryItem = ({ item }: { item: RivalrySummary }) => {
    const winPct = getWinPercentage(item);
    const isWinning = item.wins > item.losses;

    return (
      <TouchableOpacity
        style={styles.rivalryCard}
        onPress={() => navigation.navigate('RivalryDetail', { rivalryId: item.rivalry_id })}
      >
        <View style={styles.rivalryHeader}>
          <View style={styles.rivalInfo}>
            <Image
              source={
                item.rival_avatar
                  ? { uri: item.rival_avatar }
                  : require('../../assets/default-avatar.png')
              }
              style={styles.avatar}
            />
            <View style={styles.rivalDetails}>
              <Text style={styles.rivalName}>{item.rival_username}</Text>
              <Text style={styles.recordText}>{getRecordText(item)}</Text>
            </View>
          </View>
          <View style={[styles.winBadge, isWinning ? styles.winningBadge : styles.losingBadge]}>
            <Text style={styles.winPctText}>{winPct}%</Text>
            <Text style={styles.winLabel}>WIN</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.total_races}</Text>
            <Text style={styles.statLabel}>Races</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.total_user_score}</Text>
            <Text style={styles.statLabel}>Your Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.total_rival_score}</Text>
            <Text style={styles.statLabel}>Their Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, item.avg_score_diff > 0 ? styles.positive : styles.negative]}>
              {item.avg_score_diff > 0 ? '+' : ''}{Math.round(item.avg_score_diff)}
            </Text>
            <Text style={styles.statLabel}>Avg Diff</Text>
          </View>
        </View>

        {item.status === 'inactive' && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>INACTIVE</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Rivalries Yet</Text>
      <Text style={styles.emptyText}>
        Add rivals to track head-to-head competition and see who's the best!
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddRival')}
      >
        <Text style={styles.addButtonText}>Add Your First Rival</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D9FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Rivalries</Text>
        <TouchableOpacity
          style={styles.addIconButton}
          onPress={() => navigation.navigate('AddRival')}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rivalries}
        renderItem={renderRivalryItem}
        keyExtractor={(item) => item.rivalry_id}
        contentContainerStyle={rivalries.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D9FF"
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
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
    justifyContent: 'space-between',
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
  },
  addIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00D9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 24,
    color: '#0a0e27',
    fontWeight: 'bold',
  },
  list: {
    padding: 20,
  },
  emptyList: {
    flex: 1,
  },
  rivalryCard: {
    backgroundColor: '#12182e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  rivalryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rivalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  rivalDetails: {
    flex: 1,
  },
  rivalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  recordText: {
    fontSize: 14,
    color: '#8e9aaf',
  },
  winBadge: {
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  winningBadge: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  losingBadge: {
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
  },
  winPctText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  winLabel: {
    fontSize: 10,
    color: '#8e9aaf',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#8e9aaf',
  },
  positive: {
    color: '#00D9FF',
  },
  negative: {
    color: '#ff4d4d',
  },
  inactiveBadge: {
    marginTop: 12,
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    alignItems: 'center',
  },
  inactiveText: {
    fontSize: 11,
    color: '#8e9aaf',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e9aaf',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#00D9FF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0e27',
  },
});
