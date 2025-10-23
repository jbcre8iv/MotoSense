import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  getHeadToHeadRecord,
  deleteRivalry,
  HeadToHeadRecord,
} from '../services/rivalriesService';
import { useAuth } from '../contexts/AuthContext';

export default function RivalryDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { session } = useAuth();
  const { rivalryId } = route.params as { rivalryId: string };
  const [record, setRecord] = useState<HeadToHeadRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecord();
  }, [rivalryId]);

  const loadRecord = async () => {
    if (!session?.user?.id) return;

    try {
      const data = await getHeadToHeadRecord(session.user.id, rivalryId);
      setRecord(data);
    } catch (error) {
      console.error('Error loading rivalry record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRivalry = () => {
    Alert.alert(
      'Delete Rivalry',
      'Are you sure you want to end this rivalry? This will remove all historical data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteRivalry(rivalryId);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete rivalry');
            }
          },
        },
      ]
    );
  };

  const getWinPercentage = () => {
    if (!record?.summary) return 0;
    const total = record.summary.total_races;
    if (total === 0) return 0;
    return Math.round((record.summary.wins / total) * 100);
  };

  const renderRaceResult = (stat: any, index: number) => {
    const isWin = stat.result === 'win';
    const isTie = stat.result === 'tie';
    const scoreDiff = stat.user_score - stat.rival_score;

    return (
      <View key={index} style={styles.raceCard}>
        <View style={styles.raceHeader}>
          <View style={[styles.resultBadge, isWin ? styles.winBadge : isTie ? styles.tieBadge : styles.lossBadge]}>
            <Text style={styles.resultText}>{isWin ? 'WIN' : isTie ? 'TIE' : 'LOSS'}</Text>
          </View>
          <View style={styles.raceInfo}>
            <Text style={styles.raceName}>{stat.race_name}</Text>
            <Text style={styles.raceDate}>{new Date(stat.race_date).toLocaleDateString()}</Text>
          </View>
        </View>
        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>You</Text>
            <Text style={styles.scoreValue}>{stat.user_score}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Rival</Text>
            <Text style={styles.scoreValue}>{stat.rival_score}</Text>
          </View>
        </View>
        {!isTie && (
          <Text style={[styles.diffText, scoreDiff > 0 ? styles.positive : styles.negative]}>
            {scoreDiff > 0 ? '+' : ''}{scoreDiff} points
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D9FF" />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load rivalry details</Text>
      </View>
    );
  }

  const winPct = getWinPercentage();
  const isAhead = record.summary.wins > record.summary.losses;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.rivalProfile}>
          <Image
            source={
              record.rival_profile.avatar_url
                ? { uri: record.rival_profile.avatar_url }
                : require('../../assets/default-avatar.png')
            }
            style={styles.avatar}
          />
          <Text style={styles.rivalName}>{record.rival_profile.username}</Text>
          <Text style={styles.totalPoints}>{record.rival_profile.total_points} Total Points</Text>
        </View>

        <View style={styles.recordContainer}>
          <Text style={styles.recordLabel}>YOUR RECORD</Text>
          <Text style={styles.recordText}>
            {record.summary.wins}W - {record.summary.losses}L - {record.summary.ties}T
          </Text>
          <View style={[styles.winPctContainer, isAhead ? styles.ahead : styles.behind]}>
            <Text style={styles.winPct}>{winPct}% WIN RATE</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{record.summary.total_races}</Text>
          <Text style={styles.statLabel}>Total Races</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{record.summary.total_user_score}</Text>
          <Text style={styles.statLabel}>Your Points</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{record.summary.total_rival_score}</Text>
          <Text style={styles.statLabel}>Their Points</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, record.summary.avg_score_diff > 0 ? styles.positive : styles.negative]}>
            {record.summary.avg_score_diff > 0 ? '+' : ''}{Math.round(record.summary.avg_score_diff)}
          </Text>
          <Text style={styles.statLabel}>Avg Difference</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Races</Text>
        {record.recent_races.length === 0 ? (
          <View style={styles.emptyRaces}>
            <Text style={styles.emptyText}>No races yet with this rival</Text>
          </View>
        ) : (
          record.recent_races.map((race, index) => renderRaceResult(race, index))
        )}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteRivalry}>
        <Text style={styles.deleteButtonText}>End Rivalry</Text>
      </TouchableOpacity>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
  },
  errorText: {
    fontSize: 16,
    color: '#8e9aaf',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1f3a',
  },
  rivalProfile: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  rivalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  totalPoints: {
    fontSize: 14,
    color: '#8e9aaf',
  },
  recordContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  recordLabel: {
    fontSize: 12,
    color: '#8e9aaf',
    marginBottom: 8,
    letterSpacing: 1,
  },
  recordText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  winPctContainer: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  ahead: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  behind: {
    backgroundColor: 'rgba(255, 77, 77, 0.2)',
  },
  winPct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#12182e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8e9aaf',
  },
  positive: {
    color: '#00D9FF',
  },
  negative: {
    color: '#ff4d4d',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  emptyRaces: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8e9aaf',
  },
  raceCard: {
    backgroundColor: '#12182e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  winBadge: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  lossBadge: {
    backgroundColor: 'rgba(255, 77, 77, 0.2)',
  },
  tieBadge: {
    backgroundColor: 'rgba(142, 154, 175, 0.2)',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  raceInfo: {
    flex: 1,
  },
  raceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  raceDate: {
    fontSize: 12,
    color: '#8e9aaf',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#8e9aaf',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#1a1f3a',
  },
  diffText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  deleteButton: {
    margin: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.3)',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4d4d',
  },
});
