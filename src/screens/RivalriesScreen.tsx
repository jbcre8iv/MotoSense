/**
 * Rivalries Screen
 *
 * Displays user's rivalries with win/loss records and head-to-head history.
 * Allows adding new rivals and viewing detailed matchup stats.
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
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getUserRivalries,
  getRivalryMatchups,
  createRivalry,
  deleteRivalry,
  searchUsersForRivalry,
  calculateWinPercentage,
  getRivalryStreak,
  RivalrySummary,
  RivalryMatchup,
} from '../services/rivalriesService';
import { useAuth } from '../contexts/AuthContext';

export default function RivalriesScreen() {
  const { user } = useAuth();
  const [rivalries, setRivalries] = useState<RivalrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRivalry, setSelectedRivalry] = useState<RivalrySummary | null>(null);
  const [matchups, setMatchups] = useState<RivalryMatchup[]>([]);
  const [showMatchupsModal, setShowMatchupsModal] = useState(false);

  useEffect(() => {
    loadRivalries();
  }, [user]);

  const loadRivalries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getUserRivalries(user.id);
      setRivalries(data);
    } catch (error) {
      console.error('Error loading rivalries:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await loadRivalries();
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (!user) return;

    try {
      setSearching(true);
      const results = await searchUsersForRivalry(user.id, query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddRival = async (rivalId: string, rivalUsername: string) => {
    if (!user) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const rivalry = await createRivalry(user.id, rivalId);

      if (rivalry) {
        Alert.alert('Success', `Added ${rivalUsername} as a rival!`);
        setShowAddModal(false);
        setSearchQuery('');
        setSearchResults([]);
        await loadRivalries();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', 'Failed to create rivalry. They may already be your rival.');
      }
    } catch (error) {
      console.error('Error adding rival:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleDeleteRival = (rivalry: RivalrySummary) => {
    const rivalName = rivalry.user_id === user?.id ? rivalry.rival_username : rivalry.user_username;

    Alert.alert(
      'Remove Rival',
      `Are you sure you want to remove ${rivalName} as a rival? This will delete all matchup history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteRivalry(rivalry.rivalry_id);
            if (success) {
              await loadRivalries();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const handleViewMatchups = async (rivalry: RivalrySummary) => {
    setSelectedRivalry(rivalry);
    setShowMatchupsModal(true);

    try {
      const data = await getRivalryMatchups(rivalry.rivalry_id);
      setMatchups(data);
    } catch (error) {
      console.error('Error loading matchups:', error);
    }
  };

  const renderRivalryCard = (rivalry: RivalrySummary) => {
    const isUser = rivalry.user_id === user?.id;
    const rivalName = isUser ? rivalry.rival_username : rivalry.user_username;
    const wins = isUser ? rivalry.wins : rivalry.losses;
    const losses = isUser ? rivalry.losses : rivalry.wins;
    const winPercentage = calculateWinPercentage(wins, losses, rivalry.ties);
    const totalRaces = rivalry.total_races || 0;

    return (
      <TouchableOpacity
        key={rivalry.rivalry_id}
        style={styles.rivalryCard}
        onPress={() => handleViewMatchups(rivalry)}
        onLongPress={() => handleDeleteRival(rivalry)}
      >
        <View style={styles.rivalryHeader}>
          <View style={styles.rivalryLeft}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={32} color="#00d9ff" />
            </View>
            <View style={styles.rivalryInfo}>
              <Text style={styles.rivalName}>{rivalName}</Text>
              <Text style={styles.recordText}>
                {wins}W - {losses}L - {rivalry.ties}T
              </Text>
            </View>
          </View>
          <View style={styles.rivalryRight}>
            <Text style={styles.winPercentage}>{winPercentage}%</Text>
            <Text style={styles.winLabel}>Win Rate</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalRaces}</Text>
            <Text style={styles.statLabel}>Races</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {isUser ? rivalry.total_user_score : rivalry.total_rival_score}
            </Text>
            <Text style={styles.statLabel}>Your Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {isUser ? rivalry.total_rival_score : rivalry.total_user_score}
            </Text>
            <Text style={styles.statLabel}>Their Points</Text>
          </View>
        </View>

        {totalRaces > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(wins / (wins + losses + rivalry.ties)) * 100}%`,
                    backgroundColor: '#4caf50',
                  },
                ]}
              />
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(rivalry.ties / (wins + losses + rivalry.ties)) * 100}%`,
                    backgroundColor: '#ff9800',
                  },
                ]}
              />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.viewDetailsButton}>
          <Text style={styles.viewDetailsText}>View Matchup History</Text>
          <Ionicons name="chevron-forward" size={16} color="#00d9ff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderMatchupModal = () => {
    if (!selectedRivalry) return null;

    const isUser = selectedRivalry.user_id === user?.id;
    const rivalName = isUser ? selectedRivalry.rival_username : selectedRivalry.user_username;

    return (
      <Modal
        visible={showMatchupsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMatchupsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>vs {rivalName}</Text>
              <TouchableOpacity onPress={() => setShowMatchupsModal(false)}>
                <Ionicons name="close" size={28} color="#8892b0" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.matchupsList}>
              {matchups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No matchups yet</Text>
                </View>
              ) : (
                matchups.map((matchup, index) => (
                  <View key={index} style={styles.matchupCard}>
                    <View style={styles.matchupHeader}>
                      <Text style={styles.matchupRace}>{matchup.race_name}</Text>
                      <Text style={styles.matchupDate}>
                        {new Date(matchup.race_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.matchupScores}>
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreLabel}>You</Text>
                        <Text
                          style={[
                            styles.scoreValue,
                            matchup.result === 'win' && styles.winningScore,
                          ]}
                        >
                          {matchup.user_score}
                        </Text>
                      </View>
                      <View style={styles.vsContainer}>
                        <Text style={styles.vsText}>VS</Text>
                      </View>
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreLabel}>{rivalName}</Text>
                        <Text
                          style={[
                            styles.scoreValue,
                            matchup.result === 'loss' && styles.winningScore,
                          ]}
                        >
                          {matchup.rival_score}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.resultBadge}>
                      <Text
                        style={[
                          styles.resultText,
                          matchup.result === 'win' && styles.winText,
                          matchup.result === 'loss' && styles.lossText,
                          matchup.result === 'tie' && styles.tieText,
                        ]}
                      >
                        {matchup.result.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Rival</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color="#8892b0" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8892b0" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor="#8892b0"
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
          </View>

          <ScrollView style={styles.searchResults}>
            {searching ? (
              <ActivityIndicator size="large" color="#00d9ff" style={{ marginTop: 20 }} />
            ) : searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {searchQuery.length < 2
                    ? 'Search for users to add as rivals'
                    : 'No users found'}
                </Text>
              </View>
            ) : (
              searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userResult}
                  onPress={() => handleAddRival(user.id, user.username)}
                >
                  <View style={styles.userLeft}>
                    <Ionicons name="person-circle" size={40} color="#00d9ff" />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.username}</Text>
                      <Text style={styles.userStats}>
                        {user.total_predictions || 0} predictions • {user.total_points || 0} points
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="add-circle" size={28} color="#00d9ff" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d9ff" />
          <Text style={styles.loadingText}>Loading rivalries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="flash" size={32} color="#ff6b6b" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Rivalries</Text>
            <Text style={styles.subtitle}>Head-to-head competition</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add-circle" size={32} color="#00d9ff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
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
          {rivalries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flash-outline" size={64} color="#8892b0" />
              <Text style={styles.emptyTitle}>No Rivalries Yet</Text>
              <Text style={styles.emptyText}>
                Add rivals to track your head-to-head records and compete against friends!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.emptyButtonText}>Add Your First Rival</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.rivalriesList}>
              {rivalries.map(renderRivalryCard)}
            </View>
          )}
        </ScrollView>
      </View>

      {renderAddModal()}
      {renderMatchupModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8892b0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 2,
    borderBottomColor: '#00d9ff',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
  addButton: {
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  rivalriesList: {
    padding: 20,
  },
  rivalryCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  rivalryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rivalryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rivalryInfo: {
    flex: 1,
  },
  rivalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  recordText: {
    fontSize: 14,
    color: '#8892b0',
  },
  rivalryRight: {
    alignItems: 'flex-end',
  },
  winPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  winLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 4,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ff6b6b',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: {
    height: '100%',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00d9ff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#00d9ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0e27',
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
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
    margin: 20,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0a0e27',
    borderRadius: 8,
    marginBottom: 12,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  userStats: {
    fontSize: 12,
    color: '#8892b0',
  },
  matchupsList: {
    flex: 1,
    padding: 20,
  },
  matchupCard: {
    backgroundColor: '#0a0e27',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  matchupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  matchupRace: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  matchupDate: {
    fontSize: 12,
    color: '#8892b0',
  },
  matchupScores: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  winningScore: {
    color: '#4caf50',
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8892b0',
  },
  resultBadge: {
    alignItems: 'center',
  },
  resultText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  winText: {
    color: '#4caf50',
  },
  lossText: {
    color: '#ff6b6b',
  },
  tieText: {
    color: '#ff9800',
  },
});
