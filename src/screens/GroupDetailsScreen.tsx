import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../contexts/AuthContext';
import {
  getGroupDetails,
  leaveGroup,
  deleteGroup,
  GroupWithMembers,
} from '../services/groupsService';

export default function GroupDetailsScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      const groupData = await getGroupDetails(groupId);
      setGroup(groupData);
    } catch (error) {
      console.error('Error loading group details:', error);
      Alert.alert('Error', 'Failed to load group details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupDetails();
  }, [groupId]);

  useFocusEffect(
    React.useCallback(() => {
      loadGroupDetails();
    }, [groupId])
  );

  const isOwner = group?.owner_id === user?.id;

  const handleCopyInviteCode = async () => {
    if (!group?.invite_code) return;

    await Clipboard.setStringAsync(group.invite_code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const handleShareInviteCode = async () => {
    if (!group?.invite_code) return;

    try {
      await Share.share({
        message: `Join my group "${group.name}" on MotoSense! Use invite code: ${group.invite_code}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleLeaveGroup = () => {
    if (!user) return;

    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(groupId, user.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'You have left the group');
              navigation.goBack();
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    if (!user) return;

    Alert.alert(
      'Delete Group',
      `Are you sure you want to permanently delete "${group?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(groupId, user.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Group has been deleted');
              navigation.goBack();
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.message || 'Failed to delete group');
            }
          },
        },
      ]
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

  if (!group) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
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
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={32} color="#00d9ff" />
              </View>
            </View>
          </View>

          <View style={styles.groupTitleContainer}>
            <View style={styles.groupTitleRow}>
              <Text style={styles.groupName}>{group.name}</Text>
              {!group.is_public && (
                <Ionicons name="lock-closed" size={20} color="#8892b0" />
              )}
            </View>
            {group.description && (
              <Text style={styles.groupDescription}>{group.description}</Text>
            )}
          </View>
        </View>

        {/* Invite Code Section (for private groups) */}
        {!group.is_public && group.invite_code && isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invite Code</Text>
            <View style={styles.inviteCodeCard}>
              <View style={styles.inviteCodeContent}>
                <Text style={styles.inviteCode}>{group.invite_code}</Text>
                <Text style={styles.inviteHint}>Share this code to invite members</Text>
              </View>
              <View style={styles.inviteActions}>
                <TouchableOpacity
                  style={styles.inviteButton}
                  onPress={handleCopyInviteCode}
                >
                  <Ionicons name="copy-outline" size={20} color="#00d9ff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inviteButton}
                  onPress={handleShareInviteCode}
                >
                  <Ionicons name="share-outline" size={20} color="#00d9ff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Members ({group.members.length})
          </Text>
          {group.members.map((member: any) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Ionicons name="person" size={20} color="#00d9ff" />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.profiles?.display_name || member.profiles?.username || 'Unknown'}
                </Text>
                <Text style={styles.memberRole}>
                  {member.role === 'owner' && '👑 Owner'}
                  {member.role === 'admin' && '⭐ Admin'}
                  {member.role === 'member' && 'Member'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('GroupLeaderboard', { groupId: group.id });
            }}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="trophy-outline" size={24} color="#00d9ff" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Leaderboard</Text>
              <Text style={styles.actionDescription}>View group rankings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8892b0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Coming Soon', 'Group chat will be available in a future update!');
            }}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="chatbubbles-outline" size={24} color="#00d9ff" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Group Chat</Text>
              <Text style={styles.actionDescription}>Chat with members</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8892b0" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Group</Text>

          {isOwner ? (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleDeleteGroup}
            >
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
              <Text style={styles.dangerButtonText}>Delete Group</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleLeaveGroup}
            >
              <Ionicons name="exit-outline" size={20} color="#ff4444" />
              <Text style={styles.dangerButtonText}>Leave Group</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#8892b0',
  },
  header: {
    backgroundColor: '#1a1f3a',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#00d9ff',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupTitleContainer: {
    alignItems: 'center',
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  groupDescription: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  inviteCodeCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteCodeContent: {
    flex: 1,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d9ff',
    letterSpacing: 4,
    marginBottom: 4,
  },
  inviteHint: {
    fontSize: 12,
    color: '#8892b0',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
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
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#8892b0',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: '#8892b0',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ff4444',
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff4444',
  },
});
