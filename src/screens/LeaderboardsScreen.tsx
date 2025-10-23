/**
 * Leaderboards Screen
 *
 * Comprehensive leaderboard system with multiple views and filters:
 * - Global, Regional, Friends leaderboards
 * - Time period filtering (Week, Month, Season, All-Time)
 * - Series type filtering (MX, SX, All)
 * - User rank display
 * - Detailed stats for each competitor
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import {
  getGlobalLeaderboard,
  getRegionalLeaderboard,
  getUserRank,
  getAvailableSeasons,
  MemberStats,
  LeaderboardFilters,
  LeaderboardType,
} from '../services/leaderboardService';

export default function LeaderboardsScreen() {
  const { session } = useAuth();
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('global');
  const [leaderboard, setLeaderboard] = useState<MemberStats[]>([]);
  const [userRank, setUserRank] = useState<{ rank: number; total: number; stats: MemberStats | null }>({
    rank: 0,
    total: 0,
    stats: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    timePeriod: 'all',
    seriesType: 'all',
  });
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
  const [userCountry, setUserCountry] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
    loadSeasons();
    loadUserCountry();
  }, [leaderboardType, filters]);

  const loadUserCountry = async () => {
    try {
      if (!session?.user?.id) return;

      const { supabase } = await import('../services/supabase');
      const { data } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', session.user.id)
        .single();

      if (data?.country) {
        setUserCountry(data.country);
      }
    } catch (error) {
      console.error('Error loading user country:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLoading(true);

      let leaderboardData: MemberStats[] = [];

      switch (leaderboardType) {
        case 'global':
          leaderboardData = await getGlobalLeaderboard(filters);
          break;
        case 'regional':
          if (userCountry) {
            leaderboardData = await getRegionalLeaderboard(userCountry, filters);
          }
          break;
        case 'friends':
          // Friends leaderboard not yet implemented
          leaderboardData = [];
          break;
      }

      setLeaderboard(leaderboardData);

      // Get user's rank
      if (session?.user?.id) {
        const rank = await getUserRank(session.user.id, leaderboardType, filters);
        setUserRank(rank);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasons = async () => {
    try {
      const seasons = await getAvailableSeasons();
      setAvailableSeasons(seasons);
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const handleTypeChange = (type: LeaderboardType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLeaderboardType(type);
  };

  const handleFilterChange = (key: keyof LeaderboardFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const applyFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowFilters(false);
    loadLeaderboard();
  };

  const clearFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters({ timePeriod: 'all', seriesType: 'all' });
  };

  const renderTypeSelector = () => (
    <View style={styles.typeSelector}>
      <TouchableOpacity
        style={[styles.typeButton, leaderboardType === 'global' && styles.typeButtonActive]}
        onPress={() => handleTypeChange('global')}
      >
        <Ionicons
          name="globe"
          size={18}
          color={leaderboardType === 'global' ? '#00d9ff' : '#8892b0'}
        />
        <Text style={[styles.typeButtonText, leaderboardType === 'global' && styles.typeButtonTextActive]}>
          Global
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.typeButton, leaderboardType === 'regional' && styles.typeButtonActive]}
        onPress={() => handleTypeChange('regional')}
        disabled={!userCountry}
      >
        <Ionicons
          name="location"
          size={18}
          color={leaderboardType === 'regional' ? '#00d9ff' : '#8892b0'}
        />
        <Text style={[styles.typeButtonText, leaderboardType === 'regional' && styles.typeButtonTextActive]}>
          Regional
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.typeButton, styles.typeButtonDisabled]}
        disabled={true}
      >
        <Ionicons name="people" size={18} color="#495670" />
        <Text style={[styles.typeButtonText, { color: '#495670' }]}>Friends</Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Soon</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderUserRankCard = () => {
    if (!userRank.stats) return null;

    return (
      <View style={styles.userRankCard}>
        <LinearGradient
          colors={['#00d9ff20', '#7b2cbf20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userRankGradient}
        >
          <View style={styles.userRankHeader}>
            <Text style={styles.userRankTitle}>Your Rank</Text>
            <TouchableOpacity onPress={() => setShowFilters(true)}>
              <Ionicons name="options-outline" size={24} color="#00d9ff" />
            </TouchableOpacity>
          </View>

          <View style={styles.userRankContent}>
            <View style={styles.userRankLeft}>
              <Text style={styles.userRankNumber}>#{userRank.rank}</Text>
              <Text style={styles.userRankTotal}>of {userRank.total}</Text>
            </View>

            <View style={styles.userRankStats}>
              <View style={styles.userRankStat}>
                <Text style={styles.userRankStatValue}>{userRank.stats.points}</Text>
                <Text style={styles.userRankStatLabel}>Points</Text>
              </View>
              <View style={styles.userRankStat}>
                <Text style={styles.userRankStatValue}>{userRank.stats.accuracy}%</Text>
                <Text style={styles.userRankStatLabel}>Accuracy</Text>
              </View>
              <View style={styles.userRankStat}>
                <Text style={styles.userRankStatValue}>{userRank.stats.currentStreak}</Text>
                <Text style={styles.userRankStatLabel}>Streak</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderLeaderboardItem = (member: MemberStats, index: number) => {
    const isCurrentUser = session?.user?.id === member.userId;
    const isTopThree = member.rank <= 3;

    let rankColor = '#8892b0';
    let rankIcon = null;

    if (member.rank === 1) {
      rankColor = '#FFD700'; // Gold
      rankIcon = 'trophy';
    } else if (member.rank === 2) {
      rankColor = '#C0C0C0'; // Silver
      rankIcon = 'medal';
    } else if (member.rank === 3) {
      rankColor = '#CD7F32'; // Bronze
      rankIcon = 'medal';
    }

    return (
      <View
        key={member.userId}
        style={[
          styles.leaderboardItem,
          isCurrentUser && styles.leaderboardItemCurrent,
          isTopThree && styles.leaderboardItemTop,
        ]}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {rankIcon ? (
            <Ionicons name={rankIcon as any} size={24} color={rankColor} />
          ) : (
            <Text style={[styles.rankText, isCurrentUser && styles.rankTextCurrent]}>
              {member.rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {member.avatarUrl ? (
            <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color="#8892b0" />
            </View>
          )}
          {member.currentStreak >= 3 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={12} color="#ff6b00" />
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.username, isCurrentUser && styles.usernameCurrent]}>
            {member.displayName || member.username}
            {isCurrentUser && ' (You)'}
          </Text>
          <View style={styles.userStats}>
            <Text style={styles.userStatText}>
              {member.totalPredictions} predictions
            </Text>
            {member.country && (
              <>
                <Text style={styles.userStatDivider}>•</Text>
                <Text style={styles.userStatText}>{member.country}</Text>
              </>
            )}
          </View>
        </View>

        {/* Points & Accuracy */}
        <View style={styles.statsContainer}>
          <Text style={[styles.pointsText, isCurrentUser && styles.pointsTextCurrent]}>
            {member.points}
          </Text>
          <Text style={styles.accuracyText}>{member.accuracy}%</Text>
        </View>
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal visible={showFilters} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Leaderboard</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={28} color="#ccd6f6" />
            </TouchableOpacity>
          </View>

          {/* Time Period Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Time Period</Text>
            <View style={styles.filterOptions}>
              {(['week', 'month', 'season', 'all'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.filterOption,
                    filters.timePeriod === period && styles.filterOptionActive,
                  ]}
                  onPress={() => handleFilterChange('timePeriod', period)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.timePeriod === period && styles.filterOptionTextActive,
                    ]}
                  >
                    {period === 'all' ? 'All-Time' : period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Series Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Series Type</Text>
            <View style={styles.filterOptions}>
              {(['all', 'MX', 'SX'] as const).map((series) => (
                <TouchableOpacity
                  key={series}
                  style={[
                    styles.filterOption,
                    filters.seriesType === series && styles.filterOptionActive,
                  ]}
                  onPress={() => handleFilterChange('seriesType', series)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.seriesType === series && styles.filterOptionTextActive,
                    ]}
                  >
                    {series === 'all' ? 'All Series' : series}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <LinearGradient
                colors={['#00d9ff', '#7b2cbf']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color="#495670" />
      <Text style={styles.emptyStateTitle}>No Competitors Yet</Text>
      <Text style={styles.emptyStateText}>
        {leaderboardType === 'friends'
          ? 'Follow other users to see them here'
          : leaderboardType === 'regional' && !userCountry
          ? 'Set your country in your profile to see regional rankings'
          : 'Be the first to make a prediction!'}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d9ff" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leaderboards</Text>
          <Text style={styles.headerSubtitle}>Compete with the best</Text>
        </View>

        {/* Type Selector */}
        {renderTypeSelector()}

        {/* User Rank Card */}
        {renderUserRankCard()}

        {/* Active Filters Indicator */}
        {(filters.timePeriod !== 'all' || filters.seriesType !== 'all') && (
          <View style={styles.activeFilters}>
            <Ionicons name="funnel" size={16} color="#00d9ff" />
            <Text style={styles.activeFiltersText}>
              {filters.timePeriod !== 'all' && `${filters.timePeriod} • `}
              {filters.seriesType !== 'all' && `${filters.seriesType}`}
            </Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersLink}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Leaderboard List */}
        <View style={styles.leaderboardContainer}>
          {leaderboard.length === 0 ? (
            renderEmptyState()
          ) : (
            leaderboard.map((member, index) => renderLeaderboardItem(member, index))
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8892b0',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ccd6f6',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8892b0',
  },
  typeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1a1f3a',
    borderWidth: 1,
    borderColor: '#2a3655',
  },
  typeButtonActive: {
    backgroundColor: '#00d9ff15',
    borderColor: '#00d9ff',
  },
  typeButtonDisabled: {
    opacity: 0.5,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8892b0',
  },
  typeButtonTextActive: {
    color: '#00d9ff',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#7b2cbf',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  userRankCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  userRankGradient: {
    padding: 20,
  },
  userRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userRankTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ccd6f6',
  },
  userRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  userRankLeft: {
    alignItems: 'center',
  },
  userRankNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  userRankTotal: {
    fontSize: 14,
    color: '#8892b0',
  },
  userRankStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  userRankStat: {
    alignItems: 'center',
  },
  userRankStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ccd6f6',
  },
  userRankStatLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 4,
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#00d9ff15',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
  },
  activeFiltersText: {
    flex: 1,
    fontSize: 14,
    color: '#00d9ff',
    fontWeight: '600',
  },
  clearFiltersLink: {
    fontSize: 14,
    color: '#00d9ff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  leaderboardContainer: {
    paddingHorizontal: 24,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3655',
  },
  leaderboardItemCurrent: {
    backgroundColor: '#00d9ff10',
    borderColor: '#00d9ff',
  },
  leaderboardItemTop: {
    borderWidth: 2,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8892b0',
  },
  rankTextCurrent: {
    color: '#00d9ff',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#2a3655',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0a0e27',
    borderRadius: 10,
    padding: 2,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccd6f6',
    marginBottom: 4,
  },
  usernameCurrent: {
    color: '#00d9ff',
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userStatText: {
    fontSize: 12,
    color: '#8892b0',
  },
  userStatDivider: {
    fontSize: 12,
    color: '#495670',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ccd6f6',
    marginBottom: 2,
  },
  pointsTextCurrent: {
    color: '#00d9ff',
  },
  accuracyText: {
    fontSize: 12,
    color: '#8892b0',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ccd6f6',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1f3a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ccd6f6',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccd6f6',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#2a3655',
  },
  filterOptionActive: {
    backgroundColor: '#00d9ff20',
    borderColor: '#00d9ff',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8892b0',
  },
  filterOptionTextActive: {
    color: '#00d9ff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#0a0e27',
    borderWidth: 1,
    borderColor: '#2a3655',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8892b0',
  },
  applyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
