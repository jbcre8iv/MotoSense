import { supabase } from './supabase';
import { createGroup, joinPublicGroup } from './groupsService';
import { savePredictionToSupabase } from './predictionsService';

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
        const fakeUserId = `${Date.now().toString(16)}-${Math.random().toString(16).substr(2, 4)}-4${Math.random().toString(16).substr(2, 3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${Math.random().toString(16).substr(2, 3)}-${Math.random().toString(16).substr(2, 12)}`;

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

    // Delete sample profiles (this will cascade to group_members and predictions)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .like('id', 'sample-%');

    if (error) {
      console.error('❌ [SAMPLE DATA] Error clearing sample data:', error.message);
      throw error;
    }

    console.log('✅ [SAMPLE DATA] Sample data cleared successfully!');
  } catch (error: any) {
    console.error('❌ [SAMPLE DATA] Error:', error.message);
    throw error;
  }
};
