import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { getGroupLeaderboard, MemberStats } from '../services/leaderboardService';
import { getGroupDetails, GroupWithMembers } from '../services/groupsService';

type SortBy = 'points' | 'accuracy' | 'predictions';

export default function GroupLeaderboardScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [leaderboard, setLeaderboard] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('points');

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupData, leaderboardData] = await Promise.all([
        getGroupDetails(groupId),
        getGroupLeaderboard(groupId),
      ]);
      setGroup(groupData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [groupId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSort = (newSortBy: SortBy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortBy(newSortBy);

    // Re-sort leaderboard
    const sorted = [...leaderboard];
    if (newSortBy === 'accuracy') {
      sorted.sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.totalPredictions - a.totalPredictions;
      });
    } else if (newSortBy === 'predictions') {
      sorted.sort((a, b) => b.totalPredictions - a.totalPredictions);
    } else {
      // points (default)
      sorted.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.totalPredictions - a.totalPredictions;
      });
    }

    // Reassign ranks
    sorted.forEach((member, index) => {
      member.rank = index + 1;
    });

    setLeaderboard(sorted);
  };

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  const renderPodium = () => {
    if (leaderboard.length === 0) return null;

    const top3 = leaderboard.slice(0, 3);
    const positions = [
      top3[1], // 2nd place (left)
      top3[0], // 1st place (center)
      top3[2], // 3rd place (right)
    ];

    const heights = [100, 140, 80]; // Heights for each podium position

    return (
      <View style={styles.podiumContainer}>
        <View style={styles.podium}>
          {positions.map((member, index) => {
            if (!member) return <View key={index} style={{ flex: 1 }} />;

            const actualRank = member.rank;
            const height = heights[index];
            const isUser = member.userId === user?.id;

            return (
              <View key={member.userId} style={styles.podiumPosition}>
                <View style={styles.podiumMember}>
                  <Text style={styles.podiumMedal}>{getMedalEmoji(actualRank)}</Text>
                  <View style={[styles.podiumAvatar, isUser && styles.podiumAvatarUser]}>
                    <Text style={styles.podiumAvatarText}>
                      {member.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[styles.podiumName, isUser && styles.podiumNameUser]}
                    numberOfLines={1}
                  >
                    {member.displayName || member.username}
                  </Text>
                  <Text style={styles.podiumPoints}>{member.points} pts</Text>
                </View>
                <View style={[styles.podiumBase, { height }]}>
                  <Text style={styles.podiumRank}>{actualRank}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMemberRow = (member: MemberStats) => {
    const isUser = member.userId === user?.id;
    const medal = getMedalEmoji(member.rank);

    return (
      <View
        key={member.userId}
        style={[styles.memberRow, isUser && styles.memberRowUser]}
      >
        <View style={styles.memberRank}>
          {medal ? (
            <Text style={styles.memberMedal}>{medal}</Text>
          ) : (
            <Text style={styles.memberRankText}>{member.rank}</Text>
          )}
        </View>

        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {member.username.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, isUser && styles.memberNameUser]}>
            {member.displayName || member.username}
            {isUser && ' (You)'}
          </Text>
          <View style={styles.memberStats}>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={12} color="#8892b0" />
              <Text style={styles.statText}>{member.points} pts</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="analytics" size={12} color="#8892b0" />
              <Text style={styles.statText}>{member.accuracy}%</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={12} color="#8892b0" />
              <Text style={styles.statText}>
                {member.correctPredictions}/{member.totalPredictions}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d9ff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#00d9ff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>{group?.name}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Sort Filters */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, sortBy === 'points' && styles.filterButtonActive]}
          onPress={() => handleSort('points')}
        >
          <Ionicons
            name="trophy"
            size={16}
            color={sortBy === 'points' ? '#0a0e27' : '#8892b0'}
          />
          <Text
            style={[
              styles.filterButtonText,
              sortBy === 'points' && styles.filterButtonTextActive,
            ]}
          >
            Points
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, sortBy === 'accuracy' && styles.filterButtonActive]}
          onPress={() => handleSort('accuracy')}
        >
          <Ionicons
            name="analytics"
            size={16}
            color={sortBy === 'accuracy' ? '#0a0e27' : '#8892b0'}
          />
          <Text
            style={[
              styles.filterButtonText,
              sortBy === 'accuracy' && styles.filterButtonTextActive,
            ]}
          >
            Accuracy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, sortBy === 'predictions' && styles.filterButtonActive]}
          onPress={() => handleSort('predictions')}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={sortBy === 'predictions' ? '#0a0e27' : '#8892b0'}
          />
          <Text
            style={[
              styles.filterButtonText,
              sortBy === 'predictions' && styles.filterButtonTextActive,
            ]}
          >
            Total
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00d9ff" />
        }
      >
        {leaderboard.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#8892b0" />
            <Text style={styles.emptyText}>No predictions yet</Text>
            <Text style={styles.emptySubtext}>
              Make predictions to appear on the leaderboard!
            </Text>
          </View>
        ) : (
          <>
            {renderPodium()}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Full Rankings</Text>
              {leaderboard.map(renderMemberRow)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 2,
    borderBottomColor: '#00d9ff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  subtitle: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#1a1f3a',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#8892b0',
  },
  filterButtonActive: {
    backgroundColor: '#00d9ff',
    borderColor: '#00d9ff',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8892b0',
  },
  filterButtonTextActive: {
    color: '#0a0e27',
  },
  content: {
    flex: 1,
  },
  podiumContainer: {
    padding: 20,
    paddingTop: 30,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
  },
  podiumPosition: {
    flex: 1,
    alignItems: 'center',
  },
  podiumMember: {
    alignItems: 'center',
    marginBottom: 12,
  },
  podiumMedal: {
    fontSize: 32,
    marginBottom: 8,
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1f3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#8892b0',
  },
  podiumAvatarUser: {
    borderColor: '#00d9ff',
    borderWidth: 3,
  },
  podiumAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumNameUser: {
    color: '#00d9ff',
  },
  podiumPoints: {
    fontSize: 11,
    color: '#8892b0',
  },
  podiumBase: {
    width: '100%',
    backgroundColor: '#1a1f3a',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  podiumRank: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberRowUser: {
    borderWidth: 2,
    borderColor: '#00d9ff',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  memberRank: {
    width: 36,
    alignItems: 'center',
  },
  memberRankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8892b0',
  },
  memberMedal: {
    fontSize: 20,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  memberNameUser: {
    color: '#00d9ff',
  },
  memberStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: '#8892b0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 8,
    textAlign: 'center',
  },
});
