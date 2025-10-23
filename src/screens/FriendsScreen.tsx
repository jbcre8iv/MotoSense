import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import {
  FriendProfile,
  searchUsers,
  getFollowing,
  getFollowers,
  getFriendsLeaderboard,
  getSuggestedFriends,
  followUser,
  unfollowUser,
} from '../services/friendsService';

type TabType = 'following' | 'followers' | 'leaderboard' | 'search';

export default function FriendsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('following');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [following, setFollowing] = useState<FriendProfile[]>([]);
  const [followers, setFollowers] = useState<FriendProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<FriendProfile[]>([]);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [suggestions, setSuggestions] = useState<FriendProfile[]>([]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  // Search functionality
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2 && user) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      switch (activeTab) {
        case 'following':
          const followingData = await getFollowing(user.id);
          setFollowing(followingData);
          // Also load suggestions if no one is being followed
          if (followingData.length === 0) {
            const suggestionsData = await getSuggestedFriends(user.id, 10);
            setSuggestions(suggestionsData);
          }
          break;
        case 'followers':
          const followersData = await getFollowers(user.id);
          setFollowers(followersData);
          break;
        case 'leaderboard':
          const leaderboardData = await getFriendsLeaderboard(user.id);
          setLeaderboard(leaderboardData);
          break;
      }
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!user || searchQuery.trim().length < 2) return;

    setLoading(true);
    try {
      const results = await searchUsers(searchQuery, user.id);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await followUser(user.id, targetUserId);

    if (success) {
      // Update the UI optimistically
      const updateFollowStatus = (friend: FriendProfile) =>
        friend.id === targetUserId ? { ...friend, is_following: true } : friend;

      setSearchResults(prev => prev.map(updateFollowStatus));
      setSuggestions(prev => prev.map(updateFollowStatus));
      setFollowers(prev => prev.map(updateFollowStatus));

      // Reload following list
      if (activeTab === 'following') {
        loadData();
      }
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await unfollowUser(user.id, targetUserId);

    if (success) {
      // Update the UI optimistically
      const updateFollowStatus = (friend: FriendProfile) =>
        friend.id === targetUserId ? { ...friend, is_following: false } : friend;

      setSearchResults(prev => prev.map(updateFollowStatus));
      setFollowing(prev => prev.filter(f => f.id !== targetUserId));
      setLeaderboard(prev => prev.filter(f => f.id !== targetUserId));
      setFollowers(prev => prev.map(updateFollowStatus));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderFriendCard = (friend: FriendProfile, showRank?: number) => (
    <View key={friend.id} style={styles.friendCard}>
      {showRank && (
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{showRank}</Text>
        </View>
      )}

      <View style={styles.friendAvatar}>
        {friend.avatar_url ? (
          <Image source={{ uri: friend.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#8892b0" />
          </View>
        )}
      </View>

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>
          {friend.display_name || friend.username}
        </Text>
        <Text style={styles.friendUsername}>@{friend.username}</Text>

        <View style={styles.friendStats}>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={14} color="#00d9ff" />
            <Text style={styles.statText}>{friend.total_points} pts</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="analytics" size={14} color="#00d9ff" />
            <Text style={styles.statText}>{friend.accuracy_percentage}%</Text>
          </View>
          {friend.current_streak > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="flame" size={14} color="#ff6b6b" />
              <Text style={styles.statText}>{friend.current_streak}</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.followButton,
          friend.is_following && styles.followingButton,
        ]}
        onPress={() =>
          friend.is_following
            ? handleUnfollow(friend.id)
            : handleFollow(friend.id)
        }
      >
        <Text
          style={[
            styles.followButtonText,
            friend.is_following && styles.followingButtonText,
          ]}
        >
          {friend.is_following ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00d9ff" />
        </View>
      );
    }

    if (activeTab === 'search') {
      if (searchQuery.trim().length < 2) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="search" size={48} color="#8892b0" />
            <Text style={styles.emptyText}>
              Search for users by username
            </Text>
          </View>
        );
      }

      if (searchResults.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="sad-outline" size={48} color="#8892b0" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        );
      }

      return (
        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {searchResults.map(friend => renderFriendCard(friend))}
        </ScrollView>
      );
    }

    if (activeTab === 'following') {
      if (following.length === 0) {
        return (
          <ScrollView
            style={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={48} color="#8892b0" />
              <Text style={styles.emptyText}>
                You're not following anyone yet
              </Text>
              <Text style={styles.emptySubtext}>
                Follow riders to compete and compare predictions
              </Text>
            </View>

            {suggestions.length > 0 && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.sectionTitle}>Suggested Users</Text>
                {suggestions.map(friend => renderFriendCard(friend))}
              </View>
            )}
          </ScrollView>
        );
      }

      return (
        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {following.map(friend => renderFriendCard(friend))}
        </ScrollView>
      );
    }

    if (activeTab === 'followers') {
      if (followers.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="person-add-outline" size={48} color="#8892b0" />
            <Text style={styles.emptyText}>No followers yet</Text>
            <Text style={styles.emptySubtext}>
              Share your username to gain followers
            </Text>
          </View>
        );
      }

      return (
        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {followers.map(friend => renderFriendCard(friend))}
        </ScrollView>
      );
    }

    if (activeTab === 'leaderboard') {
      if (leaderboard.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="trophy-outline" size={48} color="#8892b0" />
            <Text style={styles.emptyText}>No friends on leaderboard</Text>
            <Text style={styles.emptySubtext}>
              Follow riders to see them compete here
            </Text>
          </View>
        );
      }

      return (
        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {leaderboard.map((friend, index) =>
            renderFriendCard(friend, index + 1)
          )}
        </ScrollView>
      );
    }

    return null;
  };

  const handleTabChange = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1a1f3a', '#0a0e27']} style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#8892b0"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#8892b0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => handleTabChange('search')}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setActiveTab('following');
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#8892b0" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        {activeTab !== 'search' && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'following' && styles.activeTab,
              ]}
              onPress={() => handleTabChange('following')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'following' && styles.activeTabText,
                ]}
              >
                Following
              </Text>
              {following.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{following.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'followers' && styles.activeTab,
              ]}
              onPress={() => handleTabChange('followers')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'followers' && styles.activeTabText,
                ]}
              >
                Followers
              </Text>
              {followers.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{followers.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'leaderboard' && styles.activeTab,
              ]}
              onPress={() => handleTabChange('leaderboard')}
            >
              <Ionicons
                name="trophy"
                size={18}
                color={activeTab === 'leaderboard' ? '#00d9ff' : '#8892b0'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'leaderboard' && styles.activeTabText,
                ]}
              >
                Leaderboard
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {renderTabContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(136, 146, 176, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#ffffff',
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(136, 146, 176, 0.1)',
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8892b0',
  },
  activeTabText: {
    color: '#00d9ff',
  },
  tabBadge: {
    backgroundColor: '#00d9ff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a0e27',
  },
  scrollContent: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8892b0',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8892b0',
    marginTop: 8,
    textAlign: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.1)',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0e27',
  },
  friendAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(136, 146, 176, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: '#8892b0',
    marginBottom: 8,
  },
  friendStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8892b0',
  },
  followButton: {
    backgroundColor: '#00d9ff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0e27',
  },
  followingButtonText: {
    color: '#00d9ff',
  },
  suggestionsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 217, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    marginHorizontal: 20,
  },
});
