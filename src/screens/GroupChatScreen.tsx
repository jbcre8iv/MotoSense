/**
 * Group Chat Screen
 *
 * Real-time group chat interface with message threading and editing.
 * Uses Supabase Realtime for instant message delivery.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getGroupMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  subscribeToGroupMessages,
  GroupMessage,
} from '../services/groupChatService';
import { useAuth } from '../contexts/AuthContext';

interface GroupChatScreenProps {
  route: {
    params: {
      groupId: string;
      groupName: string;
    };
  };
  navigation: any;
}

export default function GroupChatScreen({ route, navigation }: GroupChatScreenProps) {
  const { groupId, groupName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [editingMessage, setEditingMessage] = useState<GroupMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Load initial messages
  useEffect(() => {
    loadMessages();
  }, [groupId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = subscribeToGroupMessages(
      groupId,
      (newMessage) => {
        // Add new message to top of list
        setMessages((prev) => [newMessage, ...prev]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      (updatedMessage) => {
        // Update existing message
        setMessages((prev) =>
          prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
        );
      },
      (deletedMessageId) => {
        // Remove deleted message
        setMessages((prev) => prev.filter((msg) => msg.id !== deletedMessageId));
      }
    );

    return unsubscribe;
  }, [groupId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const msgs = await getGroupMessages(groupId, 50, 0);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user) return;

    try {
      setSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (editingMessage) {
        // Update existing message
        await updateMessage(editingMessage.id, messageText);
        setEditingMessage(null);
      } else {
        // Send new message
        await sendMessage({
          groupId,
          userId: user.id,
          message: messageText,
          replyTo: replyingTo?.id || null,
        });
        setReplyingTo(null);
      }

      setMessageText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = (message: GroupMessage) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMessage(message.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleEditMessage = (message: GroupMessage) => {
    setEditingMessage(message);
    setMessageText(message.message);
    setReplyingTo(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleReplyMessage = (message: GroupMessage) => {
    setReplyingTo(message);
    setEditingMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setMessageText('');
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderMessage = ({ item }: { item: GroupMessage }) => {
    const isOwnMessage = item.user_id === user?.id;
    const replyMessage = messages.find((m) => m.id === item.reply_to);

    return (
      <TouchableOpacity
        style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (isOwnMessage) {
            Alert.alert('Message Options', '', [
              { text: 'Edit', onPress: () => handleEditMessage(item) },
              { text: 'Delete', onPress: () => handleDeleteMessage(item), style: 'destructive' },
              { text: 'Reply', onPress: () => handleReplyMessage(item) },
              { text: 'Cancel', style: 'cancel' },
            ]);
          } else {
            Alert.alert('Message Options', '', [
              { text: 'Reply', onPress: () => handleReplyMessage(item) },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }
        }}
      >
        <View style={[styles.messageBubble, isOwnMessage && styles.ownMessageBubble]}>
          {/* Reply preview */}
          {replyMessage && (
            <View style={styles.replyPreview}>
              <View style={styles.replyBar} />
              <View style={styles.replyContent}>
                <Text style={styles.replyUsername}>{replyMessage.username}</Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {replyMessage.message}
                </Text>
              </View>
            </View>
          )}

          {/* Username (for others' messages) */}
          {!isOwnMessage && (
            <Text style={styles.messageUsername}>{item.username || 'Unknown'}</Text>
          )}

          {/* Message text */}
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
            {item.message}
          </Text>

          {/* Timestamp and edited indicator */}
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
              {formatTime(item.created_at)}
            </Text>
            {item.is_edited && (
              <Text style={[styles.editedLabel, isOwnMessage && styles.ownEditedLabel]}>
                (edited)
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d9ff" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#00d9ff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.headerSubtitle}>
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </Text>
          </View>
          <Ionicons name="chatbubbles" size={24} color="#00d9ff" />
        </View>

        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Reply/Edit bar */}
        {(replyingTo || editingMessage) && (
          <View style={styles.actionBar}>
            <View style={styles.actionBarContent}>
              <Ionicons
                name={editingMessage ? 'create' : 'return-down-forward'}
                size={16}
                color="#00d9ff"
              />
              <View style={styles.actionBarText}>
                <Text style={styles.actionBarLabel}>
                  {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.username}`}
                </Text>
                <Text style={styles.actionBarMessage} numberOfLines={1}>
                  {(editingMessage || replyingTo)?.message}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={editingMessage ? cancelEdit : cancelReply}
              style={styles.cancelButton}
            >
              <Ionicons name="close" size={20} color="#8892b0" />
            </TouchableOpacity>
          </View>
        )}

        {/* Message input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#8892b0"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: 16,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 2,
    borderBottomColor: '#00d9ff',
  },
  backButton: {
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#1a1f3a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2f4a',
  },
  ownMessageBubble: {
    backgroundColor: '#00d9ff',
    borderColor: '#00d9ff',
  },
  replyPreview: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  replyBar: {
    width: 3,
    backgroundColor: '#00d9ff',
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00d9ff',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#8892b0',
  },
  messageUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00d9ff',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#0a0e27',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    color: '#8892b0',
  },
  ownMessageTime: {
    color: 'rgba(10, 14, 39, 0.7)',
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#8892b0',
  },
  ownEditedLabel: {
    color: 'rgba(10, 14, 39, 0.7)',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f3a',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
  },
  actionBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBarText: {
    flex: 1,
  },
  actionBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00d9ff',
  },
  actionBarMessage: {
    fontSize: 12,
    color: '#8892b0',
    marginTop: 2,
  },
  cancelButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#1a1f3a',
    borderTopWidth: 1,
    borderTopColor: '#2a2f4a',
  },
  input: {
    flex: 1,
    backgroundColor: '#0a0e27',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 15,
    color: '#ffffff',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
