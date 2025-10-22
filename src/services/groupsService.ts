import { supabase } from './supabase';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  is_public: boolean;
  invite_code: string | null;
  max_members: number;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

/**
 * Generate a random invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new group
 */
export const createGroup = async (
  name: string,
  description: string,
  isPublic: boolean,
  ownerId: string
): Promise<Group> => {
  try {
    console.log('📝 [CREATE GROUP] Creating group:', { name, isPublic, ownerId });

    const inviteCode = isPublic ? null : generateInviteCode();

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        is_public: isPublic,
        owner_id: ownerId,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // Add the owner as a member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: ownerId,
        role: 'owner',
      });

    if (memberError) throw memberError;

    console.log('✅ [CREATE GROUP] Group created:', group.id);
    return group;
  } catch (error: any) {
    console.error('❌ [CREATE GROUP] Error:', error.message);
    throw error;
  }
};

/**
 * Get all public groups
 */
export const getPublicGroups = async (): Promise<Group[]> => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*, member_count:group_members(count)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the count data
    const groups = data?.map((group: any) => ({
      ...group,
      member_count: group.member_count?.[0]?.count || 0,
    })) || [];

    return groups;
  } catch (error: any) {
    console.error('❌ [GET PUBLIC GROUPS] Error:', error.message);
    return [];
  }
};

/**
 * Get user's groups
 */
export const getUserGroups = async (userId: string): Promise<Group[]> => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('groups(*, member_count:group_members(count))')
      .eq('user_id', userId);

    if (error) throw error;

    // Transform the data
    const groups = data?.map((item: any) => ({
      ...item.groups,
      member_count: item.groups.member_count?.[0]?.count || 0,
    })) || [];

    return groups;
  } catch (error: any) {
    console.error('❌ [GET USER GROUPS] Error:', error.message);
    return [];
  }
};

/**
 * Get group details with members
 */
export const getGroupDetails = async (groupId: string): Promise<GroupWithMembers | null> => {
  try {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError) throw groupError;

    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('*, profiles(username, display_name, avatar_url)')
      .eq('group_id', groupId);

    if (membersError) throw membersError;

    return {
      ...group,
      members: members || [],
    };
  } catch (error: any) {
    console.error('❌ [GET GROUP DETAILS] Error:', error.message);
    return null;
  }
};

/**
 * Join a group by invite code
 */
export const joinGroupByCode = async (
  inviteCode: string,
  userId: string
): Promise<Group> => {
  try {
    console.log('🔑 [JOIN GROUP] Joining with code:', inviteCode);

    // Find the group by invite code
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (groupError) throw new Error('Invalid invite code');

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      throw new Error('You are already a member of this group');
    }

    // Add the user as a member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'member',
      });

    if (memberError) throw memberError;

    console.log('✅ [JOIN GROUP] Joined group:', group.id);
    return group;
  } catch (error: any) {
    console.error('❌ [JOIN GROUP] Error:', error.message);
    throw error;
  }
};

/**
 * Join a public group
 */
export const joinPublicGroup = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  try {
    console.log('👥 [JOIN PUBLIC GROUP] Joining group:', groupId);

    // Check if group is public
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('is_public')
      .eq('id', groupId)
      .single();

    if (groupError || !group?.is_public) {
      throw new Error('Group is not public');
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      throw new Error('You are already a member of this group');
    }

    // Add the user as a member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
      });

    if (memberError) throw memberError;

    console.log('✅ [JOIN PUBLIC GROUP] Joined successfully');
    return true;
  } catch (error: any) {
    console.error('❌ [JOIN PUBLIC GROUP] Error:', error.message);
    throw error;
  }
};

/**
 * Leave a group
 */
export const leaveGroup = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  try {
    console.log('🚪 [LEAVE GROUP] Leaving group:', groupId);

    // Check if user is the owner
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (group?.owner_id === userId) {
      throw new Error('Group owners cannot leave. Please transfer ownership or delete the group.');
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log('✅ [LEAVE GROUP] Left successfully');
    return true;
  } catch (error: any) {
    console.error('❌ [LEAVE GROUP] Error:', error.message);
    throw error;
  }
};

/**
 * Delete a group (owner only)
 */
export const deleteGroup = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  try {
    console.log('🗑️ [DELETE GROUP] Deleting group:', groupId);

    // Verify ownership
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (group?.owner_id !== userId) {
      throw new Error('Only the group owner can delete the group');
    }

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;

    console.log('✅ [DELETE GROUP] Deleted successfully');
    return true;
  } catch (error: any) {
    console.error('❌ [DELETE GROUP] Error:', error.message);
    throw error;
  }
};
