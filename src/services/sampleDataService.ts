import { supabase } from './supabase';
import { createGroup, joinPublicGroup } from './groupsService';
import { savePredictionToSupabase } from './predictionsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage keys for tracking sample data
const SAMPLE_USERS_KEY = '@sample_users';
const SAMPLE_GROUPS_KEY = '@sample_groups';

/**
 * Generate a proper UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate sample users for testing
 * Note: This creates fake user entries in the profiles table for demo purposes
 */
const sampleUsers = [
  { username: 'rider_mike', display_name: 'Mike Thompson' },
  { username: 'moto_sarah', display_name: 'Sarah Johnson' },
  { username: 'track_master', display_name: 'Alex Rivera' },
  { username: 'speed_demon', display_name: 'Chris Lee' },
  { username: 'dirt_king', display_name: 'Jordan Smith' },
];

/**
 * Sample group data
 */
const sampleGroups = [
  {
    name: 'Weekend Warriors',
    description: 'Casual fans who love watching races on weekends',
    isPublic: true,
  },
  {
    name: 'Pro Predictors',
    description: 'Serious prediction experts only. Top-tier competition!',
    isPublic: true,
  },
  {
    name: 'MX Legends',
    description: 'Old school fans who remember the glory days',
    isPublic: true,
  },
  {
    name: 'SX Elite Club',
    description: 'Private club for supercross enthusiasts',
    isPublic: false,
  },
];

/**
 * Generate random predictions for a user
 */
function generateRandomPredictions(raceId: string): Record<number, string> {
  const riders = ['rider-1', 'rider-2', 'rider-3', 'rider-4', 'rider-5', 'rider-6', 'rider-7', 'rider-8'];
  const shuffled = riders.sort(() => Math.random() - 0.5);

  return {
    1: shuffled[0],
    2: shuffled[1],
    3: shuffled[2],
    4: shuffled[3],
    5: shuffled[4],
  };
}

/**
 * Load sample data into the app for testing
 */
export const loadSampleData = async (currentUserId: string): Promise<void> => {
  try {
    console.log('🎬 [SAMPLE DATA] Starting to load sample data...');

    // Step 1: Create sample groups
    console.log('📦 [SAMPLE DATA] Creating sample groups...');
    const createdGroups: string[] = [];

    for (const groupData of sampleGroups) {
      try {
        const group = await createGroup(
          groupData.name,
          groupData.description,
          groupData.isPublic,
          currentUserId
        );
        createdGroups.push(group.id);
        console.log(`✅ [SAMPLE DATA] Created group: ${groupData.name}`);
      } catch (error: any) {
        console.error(`❌ [SAMPLE DATA] Error creating group ${groupData.name}:`, error.message);
      }
    }

    // Step 2: Create sample profiles (fake users for demo)
    console.log('👥 [SAMPLE DATA] Creating sample user profiles...');
    const createdUserIds: string[] = [];

    for (const userData of sampleUsers) {
      try {
        // Generate a proper UUID v4
        const fakeUserId = generateUUID();

        // Insert into profiles table
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: fakeUserId,
            username: userData.username,
            display_name: userData.display_name,
          });

        if (error) {
          console.error(`❌ [SAMPLE DATA] Error creating profile ${userData.username}:`, error.message);
        } else {
          createdUserIds.push(fakeUserId);
          console.log(`✅ [SAMPLE DATA] Created profile: ${userData.username}`);
        }

        // Small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        console.error(`❌ [SAMPLE DATA] Error creating profile:`, error.message);
      }
    }

    // Step 3: Add sample users to groups
    console.log('🎯 [SAMPLE DATA] Adding members to groups...');

    for (const groupId of createdGroups) {
      // Add 2-4 random sample users to each group
      const numMembers = Math.floor(Math.random() * 3) + 2;
      const shuffledUsers = [...createdUserIds].sort(() => Math.random() - 0.5);

      for (let i = 0; i < numMembers && i < shuffledUsers.length; i++) {
        try {
          const userId = shuffledUsers[i];

          // Insert group membership
          const { error } = await supabase
            .from('group_members')
            .insert({
              group_id: groupId,
              user_id: userId,
              role: 'member',
            });

          if (error) {
            console.error(`❌ [SAMPLE DATA] Error adding member to group:`, error.message);
          }
        } catch (error: any) {
          console.error(`❌ [SAMPLE DATA] Error adding member:`, error.message);
        }
      }
    }

    // Step 4: Create sample predictions for sample users
    console.log('🎲 [SAMPLE DATA] Creating sample predictions...');

    for (const userId of createdUserIds) {
      // Create 1-3 random predictions per user
      const numPredictions = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < numPredictions; i++) {
        try {
          const raceId = `race-${i + 1}`;
          const predictions = generateRandomPredictions(raceId);

          await savePredictionToSupabase(userId, raceId, predictions);
        } catch (error: any) {
          console.error(`❌ [SAMPLE DATA] Error creating prediction:`, error.message);
        }
      }
    }

    // Step 5: Add current user to some groups
    console.log('👤 [SAMPLE DATA] Adding you to sample groups...');

    for (const groupId of createdGroups.slice(0, 2)) {
      try {
        await joinPublicGroup(groupId, currentUserId);
      } catch (error: any) {
        // Ignore if already a member
        console.log(`ℹ️ [SAMPLE DATA] Already member of group or error:`, error.message);
      }
    }

    // Step 6: Store sample data IDs for cleanup
    console.log('💾 [SAMPLE DATA] Storing sample data IDs for cleanup...');
    await AsyncStorage.setItem(SAMPLE_USERS_KEY, JSON.stringify(createdUserIds));
    await AsyncStorage.setItem(SAMPLE_GROUPS_KEY, JSON.stringify(createdGroups));

    console.log('✅ [SAMPLE DATA] Sample data loaded successfully!');
    console.log(`📊 [SAMPLE DATA] Summary:`);
    console.log(`   - ${createdGroups.length} groups created`);
    console.log(`   - ${createdUserIds.length} sample users created`);
    console.log(`   - Groups populated with members and predictions`);
  } catch (error: any) {
    console.error('❌ [SAMPLE DATA] Fatal error:', error.message);
    throw error;
  }
};

/**
 * Clear all sample data (for cleanup)
 */
export const clearSampleData = async (): Promise<void> => {
  try {
    console.log('🧹 [SAMPLE DATA] Clearing sample data...');

    // Get stored sample data IDs
    const sampleUsersJson = await AsyncStorage.getItem(SAMPLE_USERS_KEY);
    const sampleGroupsJson = await AsyncStorage.getItem(SAMPLE_GROUPS_KEY);

    const sampleUserIds: string[] = sampleUsersJson ? JSON.parse(sampleUsersJson) : [];
    const sampleGroupIds: string[] = sampleGroupsJson ? JSON.parse(sampleGroupsJson) : [];

    console.log(`📋 [SAMPLE DATA] Found ${sampleUserIds.length} sample users and ${sampleGroupIds.length} sample groups to delete`);

    // Delete sample groups
    if (sampleGroupIds.length > 0) {
      console.log('🗑️ [SAMPLE DATA] Deleting sample groups...');
      const { error: groupsError } = await supabase
        .from('groups')
        .delete()
        .in('id', sampleGroupIds);

      if (groupsError) {
        console.error('❌ [SAMPLE DATA] Error deleting groups:', groupsError.message);
      } else {
        console.log(`✅ [SAMPLE DATA] Deleted ${sampleGroupIds.length} sample groups`);
      }
    }

    // Delete sample profiles (this will cascade to group_members and predictions)
    if (sampleUserIds.length > 0) {
      console.log('🗑️ [SAMPLE DATA] Deleting sample user profiles...');
      const { error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .in('id', sampleUserIds);

      if (profilesError) {
        console.error('❌ [SAMPLE DATA] Error deleting profiles:', profilesError.message);
      } else {
        console.log(`✅ [SAMPLE DATA] Deleted ${sampleUserIds.length} sample profiles`);
      }
    }

    // Clear AsyncStorage tracking
    await AsyncStorage.removeItem(SAMPLE_USERS_KEY);
    await AsyncStorage.removeItem(SAMPLE_GROUPS_KEY);

    console.log('✅ [SAMPLE DATA] Sample data cleared successfully!');
  } catch (error: any) {
    console.error('❌ [SAMPLE DATA] Error:', error.message);
    throw error;
  }
};
