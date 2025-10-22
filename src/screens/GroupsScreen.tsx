import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import {
  getPublicGroups,
  getUserGroups,
  createGroup,
  joinGroupByCode,
  joinPublicGroup,
  Group,
} from '../services/groupsService';

type Tab = 'my-groups' | 'discover';

export default function GroupsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('my-groups');
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create group form
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  // Join by code
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadGroups = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [userGroupsData, publicGroupsData] = await Promise.all([
        getUserGroups(user.id),
        getPublicGroups(),
      ]);
      setMyGroups(userGroupsData);
      setPublicGroups(publicGroupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      loadGroups();
    }, [user])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (!user) return;

    try {
      setCreating(true);
      const newGroup = await createGroup(
        groupName.trim(),
        groupDescription.trim(),
        isPublic,
        user.id
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', `Group "${newGroup.name}" created!`);

      // Reset form
      setGroupName('');
      setGroupDescription('');
      setIsPublic(true);
      setShowCreateModal(false);

      // Reload groups
      loadGroups();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (!user) return;

    try {
      setJoining(true);
      const group = await joinGroupByCode(inviteCode.trim().toUpperCase(), user.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', `You joined "${group.name}"!`);

      setInviteCode('');
      setShowJoinModal(false);
      setActiveTab('my-groups');
      loadGroups();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Invalid invite code');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinPublicGroup = async (group: Group) => {
    if (!user) return;

    try {
      await joinPublicGroup(group.id, user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', `You joined "${group.name}"!`);
      setActiveTab('my-groups');
      loadGroups();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to join group');
    }
  };

  const renderGroupCard = (group: Group, canJoin: boolean = false) => (
    <TouchableOpacity
      key={group.id}
      style={styles.groupCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('GroupDetails', { groupId: group.id });
      }}
    >
      <View style={styles.groupIcon}>
        <Ionicons name="people" size={24} color="#00d9ff" />
      </View>

      <View style={styles.groupInfo}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>{group.name}</Text>
          {!group.is_public && (
            <Ionicons name="lock-closed" size={16} color="#8892b0" />
          )}
        </View>

        {group.description && (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {group.description}
          </Text>
        )}

        <View style={styles.groupMeta}>
          <Ionicons name="people-outline" size={14} color="#8892b0" />
          <Text style={styles.groupMetaText}>
            {group.member_count || 0} {group.member_count === 1 ? 'member' : 'members'}
          </Text>
        </View>
      </View>

      {canJoin && (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={(e) => {
            e.stopPropagation();
            handleJoinPublicGroup(group);
          }}
        >
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#8892b0" />
          <Text style={styles.emptyText}>Please log in to view groups</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowJoinModal(true);
            }}
          >
            <Ionicons name="key-outline" size={20} color="#00d9ff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#00d9ff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-groups' && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('my-groups');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'my-groups' && styles.tabTextActive]}>
            My Groups
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('discover');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00d9ff" />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00d9ff" />
          </View>
        ) : activeTab === 'my-groups' ? (
          myGroups.length > 0 ? (
            <View style={styles.groupsList}>
              {myGroups.map((group) => renderGroupCard(group, false))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#8892b0" />
              <Text style={styles.emptyText}>You haven't joined any groups yet</Text>
              <Text style={styles.emptySubtext}>
                Join a public group or create your own!
              </Text>
            </View>
          )
        ) : (
          publicGroups.length > 0 ? (
            <View style={styles.groupsList}>
              {publicGroups.map((group) => renderGroupCard(group, true))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#8892b0" />
              <Text style={styles.emptyText}>No public groups available</Text>
              <Text style={styles.emptySubtext}>
                Be the first to create one!
              </Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Create Group Modal */}
      {showCreateModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Group Name"
              placeholderTextColor="#8892b0"
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#8892b0"
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsPublic(!isPublic)}
            >
              <View style={[styles.checkbox, isPublic && styles.checkboxChecked]}>
                {isPublic && <Ionicons name="checkmark" size={16} color="#0a0e27" />}
              </View>
              <Text style={styles.checkboxLabel}>Public Group</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>
              {isPublic
                ? 'Anyone can find and join this group'
                : 'Members need an invite code to join'}
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, creating && styles.modalButtonDisabled]}
              onPress={handleCreateGroup}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#0a0e27" />
              ) : (
                <Text style={styles.modalButtonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Join by Code Modal */}
      {showJoinModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join by Invite Code</Text>
              <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter Invite Code"
              placeholderTextColor="#8892b0"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.modalButton, joining && styles.modalButtonDisabled]}
              onPress={handleJoinByCode}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#0a0e27" />
              ) : (
                <Text style={styles.modalButtonText}>Join Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0e27',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1f3a',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#00d9ff',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8892b0',
  },
  tabTextActive: {
    color: '#00d9ff',
  },
  content: {
    flex: 1,
  },
  groupsList: {
    padding: 16,
    gap: 12,
  },
  groupCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  groupDescription: {
    fontSize: 14,
    color: '#8892b0',
    marginBottom: 8,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupMetaText: {
    fontSize: 12,
    color: '#8892b0',
  },
  joinButton: {
    backgroundColor: '#00d9ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#0a0e27',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#00d9ff',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00d9ff',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#8892b0',
    marginBottom: 20,
    marginLeft: 36,
  },
  modalButton: {
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0e27',
  },
});
