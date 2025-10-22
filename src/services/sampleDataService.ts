import { supabase } from './supabase';
import { createGroup, joinPublicGroup } from './groupsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage key for tracking sample data
const SAMPLE_GROUPS_KEY = '@sample_groups';

/**
 * Sample group data
 * Note: Private groups removed due to RLS policy - only public groups for now
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
    name: 'Track Day Heroes',
    description: 'For riders who practice what they predict',
    isPublic: true,
  },
];

/**
 * Load sample data into the app for testing
 * Note: Only creates groups, no fake users due to RLS policies
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

    // Step 2: Join current user to all groups
    console.log('👤 [SAMPLE DATA] Joining you to sample groups...');

    for (const groupId of createdGroups) {
      try {
        await joinPublicGroup(groupId, currentUserId);
      } catch (error: any) {
        // Ignore if already a member
        console.log(`ℹ️ [SAMPLE DATA] Already member of group or error:`, error.message);
      }
    }

    // Step 3: Store sample group IDs for cleanup
    console.log('💾 [SAMPLE DATA] Storing sample data IDs for cleanup...');
    await AsyncStorage.setItem(SAMPLE_GROUPS_KEY, JSON.stringify(createdGroups));

    console.log('✅ [SAMPLE DATA] Sample data loaded successfully!');
    console.log(`📊 [SAMPLE DATA] Summary:`);
    console.log(`   - ${createdGroups.length} groups created`);
    console.log(`   - You've been added to all sample groups`);
    console.log(`   - Ready for testing!`);
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

    // Get stored sample group IDs
    const sampleGroupsJson = await AsyncStorage.getItem(SAMPLE_GROUPS_KEY);
    const sampleGroupIds: string[] = sampleGroupsJson ? JSON.parse(sampleGroupsJson) : [];

    console.log(`📋 [SAMPLE DATA] Found ${sampleGroupIds.length} sample groups to delete`);

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

    // Clear AsyncStorage tracking
    await AsyncStorage.removeItem(SAMPLE_GROUPS_KEY);

    console.log('✅ [SAMPLE DATA] Sample data cleared successfully!');
  } catch (error: any) {
    console.error('❌ [SAMPLE DATA] Error:', error.message);
    throw error;
  }
};
