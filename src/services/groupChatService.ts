/**
 * Group Chat Service
 *
 * Handles real-time group chat functionality using Supabase Realtime.
 * Supports sending messages, editing, deleting, and threaded replies.
 */

import { supabase } from './supabase';

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  reply_to: string | null;
  // Joined data
  username?: string;
  avatar_url?: string;
}

export interface SendMessageParams {
  groupId: string;
  userId: string;
  message: string;
  replyTo?: string | null;
}

/**
 * Send a message to a group
 */
export const sendMessage = async (params: SendMessageParams): Promise<GroupMessage | null> => {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .insert([
        {
          group_id: params.groupId,
          user_id: params.userId,
          message: params.message.trim(),
          reply_to: params.replyTo || null,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return null;
  }
};

/**
 * Get messages for a group with pagination
 */
export const getGroupMessages = async (
  groupId: string,
  limit: number = 50,
  offset: number = 0
): Promise<GroupMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .select(
        `
        *,
        profiles!group_messages_user_id_fkey(username, avatar_url)
      `
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    // Flatten the profiles data
    return (data || []).map((msg: any) => ({
      ...msg,
      username: msg.profiles?.username || 'Unknown',
      avatar_url: msg.profiles?.avatar_url || null,
    }));
  } catch (error) {
    console.error('Error in getGroupMessages:', error);
    return [];
  }
};

/**
 * Update a message (edit)
 */
export const updateMessage = async (
  messageId: string,
  newMessage: string
): Promise<GroupMessage | null> => {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .update({
        message: newMessage.trim(),
      })
      .eq('id', messageId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating message:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateMessage:', error);
    return null;
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('group_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMessage:', error);
    return false;
  }
};

/**
 * Get a single message by ID (for replies)
 */
export const getMessage = async (messageId: string): Promise<GroupMessage | null> => {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .select(
        `
        *,
        profiles!group_messages_user_id_fkey(username, avatar_url)
      `
      )
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('Error fetching message:', error);
      return null;
    }

    return {
      ...data,
      username: data.profiles?.username || 'Unknown',
      avatar_url: data.profiles?.avatar_url || null,
    };
  } catch (error) {
    console.error('Error in getMessage:', error);
    return null;
  }
};

/**
 * Subscribe to new messages in a group using Supabase Realtime
 */
export const subscribeToGroupMessages = (
  groupId: string,
  onNewMessage: (message: GroupMessage) => void,
  onUpdateMessage: (message: GroupMessage) => void,
  onDeleteMessage: (messageId: string) => void
) => {
  const channel = supabase
    .channel(`group_chat_${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      async (payload) => {
        // Fetch the full message with user data
        const message = await getMessage(payload.new.id);
        if (message) {
          onNewMessage(message);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      async (payload) => {
        const message = await getMessage(payload.new.id);
        if (message) {
          onUpdateMessage(message);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        onDeleteMessage(payload.old.id);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Get message count for a group
 */
export const getMessageCount = async (groupId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('group_messages')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (error) {
      console.error('Error fetching message count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getMessageCount:', error);
    return 0;
  }
};

/**
 * Mark messages as read (future enhancement)
 * This would require a separate read_receipts table
 */
export const markMessagesAsRead = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  // TODO: Implement read receipts in future enhancement
  // For now, just return true
  return true;
};

/**
 * Get unread message count (future enhancement)
 */
export const getUnreadCount = async (
  groupId: string,
  userId: string
): Promise<number> => {
  // TODO: Implement read receipts tracking
  // For now, return 0
  return 0;
};

/**
 * Search messages in a group
 */
export const searchMessages = async (
  groupId: string,
  query: string,
  limit: number = 20
): Promise<GroupMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .select(
        `
        *,
        profiles!group_messages_user_id_fkey(username, avatar_url)
      `
      )
      .eq('group_id', groupId)
      .ilike('message', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching messages:', error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      ...msg,
      username: msg.profiles?.username || 'Unknown',
      avatar_url: msg.profiles?.avatar_url || null,
    }));
  } catch (error) {
    console.error('Error in searchMessages:', error);
    return [];
  }
};
