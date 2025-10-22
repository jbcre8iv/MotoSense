import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Prediction, Achievement } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { mockRaces } from '../data';
import { deleteAllUserPredictions } from './predictionsService';

const KEYS = {
  USER_PROFILE: '@motosense_user_profile',
  PREDICTIONS: '@motosense_predictions',
};

// User Profile methods
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    const profile = data ? JSON.parse(data) : null;
    console.log('📖 [GET PROFILE]', profile ? {
      totalPredictions: profile.totalPredictions,
      totalPoints: profile.totalPoints,
      currentStreak: profile.currentStreak,
      racingIQLevel: profile.racingIQLevel,
      achievementsUnlocked: profile.achievements?.filter((a: Achievement) => a.isUnlocked).length || 0
    } : 'No profile found');
    return profile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<boolean> => {
  try {
    console.log('💾 [SAVE PROFILE]', {
      totalPredictions: profile.totalPredictions,
      totalPoints: profile.totalPoints,
      currentStreak: profile.currentStreak,
      racingIQLevel: profile.racingIQLevel,
      achievementsUnlocked: profile.achievements?.filter(a => a.isUnlocked).length || 0
    });
    await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    return false;
  }
};

export const createDefaultProfile = (): UserProfile => {
  // Initialize achievements from the ACHIEVEMENTS template
  const initialAchievements: Achievement[] = ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    currentProgress: 0,
    isUnlocked: false,
  }));

  return {
    id: `user_${Date.now()}`,
    username: 'MotoFan',
    totalPredictions: 0,
    accuracyPercentage: 0,
    racingIQLevel: 1,
    favoriteRiders: [],
    achievements: initialAchievements,
    currentStreak: 0,
    longestStreak: 0,
    totalPoints: 0,
    predictedRaceIds: [],
  };
};

// Predictions methods
export const getPredictions = async (): Promise<Prediction[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PREDICTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting predictions:', error);
    return [];
  }
};

export const savePrediction = async (prediction: Prediction): Promise<boolean> => {
  try {
    const predictions = await getPredictions();
    predictions.push(prediction);
    await AsyncStorage.setItem(KEYS.PREDICTIONS, JSON.stringify(predictions));
    return true;
  } catch (error) {
    console.error('Error saving prediction:', error);
    return false;
  }
};

export const getPredictionForRace = async (raceId: string): Promise<Prediction | null> => {
  try {
    const predictions = await getPredictions();
    return predictions.find(p => p.raceId === raceId) || null;
  } catch (error) {
    console.error('Error getting prediction for race:', error);
    return null;
  }
};

// Helper function to check if race rounds are consecutive
const isConsecutiveRound = (lastRound: number | undefined, currentRound: number): boolean => {
  if (lastRound === undefined) return true; // First prediction

  // Races are consecutive if the current round is exactly 1 more than the last
  // OR if it's the same round (shouldn't happen with duplicate prevention, but safety check)
  return currentRound === lastRound + 1;
};

// Update user stats after making a prediction
export const updateUserStats = async (newPrediction: Prediction): Promise<boolean> => {
  try {
    console.log('🔄 [UPDATE STATS] Starting update for prediction:', newPrediction.id);
    const profile = await getUserProfile();
    if (!profile) {
      console.error('❌ [UPDATE STATS] No profile found!');
      return false;
    }

    console.log('📊 [UPDATE STATS] Before update:', {
      totalPredictions: profile.totalPredictions,
      currentStreak: profile.currentStreak,
      totalPoints: profile.totalPoints,
      lastRaceRound: profile.lastRaceRound
    });

    // Get the race information to find the round number
    const race = mockRaces.find(r => r.id === newPrediction.raceId);
    if (!race) {
      console.error('❌ [UPDATE STATS] Race not found:', newPrediction.raceId);
      return false;
    }

    // Check if this race was already predicted (double check)
    if (profile.predictedRaceIds && profile.predictedRaceIds.includes(newPrediction.raceId)) {
      console.warn('⚠️ [UPDATE STATS] Race already predicted, not updating stats');
      return false;
    }

    // Update total predictions
    profile.totalPredictions += 1;

    // Track predicted races
    if (!profile.predictedRaceIds) {
      profile.predictedRaceIds = [];
    }
    profile.predictedRaceIds.push(newPrediction.raceId);

    // Update streak based on race rounds
    const isConsecutive = isConsecutiveRound(profile.lastRaceRound, race.round);
    if (isConsecutive) {
      profile.currentStreak += 1;
      if (profile.currentStreak > profile.longestStreak) {
        profile.longestStreak = profile.currentStreak;
      }
      console.log(`🔥 [STREAK] Consecutive! Round ${profile.lastRaceRound || 'none'} → ${race.round}`);
    } else {
      profile.currentStreak = 1;
      console.log(`❌ [STREAK] Broken! Round ${profile.lastRaceRound || 'none'} → ${race.round}`);
    }

    profile.lastPredictionDate = newPrediction.timestamp;
    profile.lastRaceRound = race.round;

    // Calculate Racing IQ level based on total predictions
    profile.racingIQLevel = Math.floor(profile.totalPredictions / 5) + 1;

    console.log('📊 [UPDATE STATS] After update:', {
      totalPredictions: profile.totalPredictions,
      currentStreak: profile.currentStreak,
      racingIQLevel: profile.racingIQLevel,
      lastRaceRound: profile.lastRaceRound,
      predictedRaces: profile.predictedRaceIds.length
    });

    // Update achievement progress
    await updateAchievementProgress(profile, newPrediction);

    await saveUserProfile(profile);
    console.log('✅ [UPDATE STATS] Stats updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating user stats:', error);
    return false;
  }
};

// Update achievement progress based on user actions
const updateAchievementProgress = async (profile: UserProfile, newPrediction: Prediction): Promise<void> => {
  console.log('🏆 [ACHIEVEMENTS] Updating achievement progress...');
  const newlyUnlocked: Achievement[] = [];

  profile.achievements = profile.achievements.map(achievement => {
    if (achievement.isUnlocked) return achievement;

    let updated = { ...achievement };

    // Check different achievement types
    switch (achievement.type) {
      case 'first_prediction':
        if (profile.totalPredictions >= 1) {
          updated.currentProgress = 1;
          updated.isUnlocked = true;
          updated.earnedDate = new Date().toISOString();
          newlyUnlocked.push(updated);
        }
        break;

      case 'prediction_count':
        updated.currentProgress = profile.totalPredictions;
        if (profile.totalPredictions >= achievement.targetProgress) {
          updated.isUnlocked = true;
          updated.earnedDate = new Date().toISOString();
          newlyUnlocked.push(updated);
        }
        break;

      case 'streak_count':
        updated.currentProgress = profile.currentStreak;
        if (profile.currentStreak >= achievement.targetProgress) {
          updated.isUnlocked = true;
          updated.earnedDate = new Date().toISOString();
          newlyUnlocked.push(updated);
        }
        break;

      case 'accuracy_threshold':
        // This will be updated when results are processed
        updated.currentProgress = Math.floor(profile.accuracyPercentage);
        break;

      default:
        break;
    }

    return updated;
  });

  // Award points for newly unlocked achievements
  if (newlyUnlocked.length > 0) {
    const pointsEarned = newlyUnlocked.reduce((sum, ach) => sum + (ach.rewardPoints || 0), 0);
    profile.totalPoints += pointsEarned;
    console.log('🎉 [ACHIEVEMENTS] Unlocked:', newlyUnlocked.map(a => a.title), 'Points earned:', pointsEarned);
  } else {
    console.log('🏆 [ACHIEVEMENTS] No new achievements unlocked');
  }
};

// Initialize user profile if it doesn't exist
export const initializeUserProfile = async (): Promise<UserProfile> => {
  try {
    console.log('🔧 [INIT PROFILE] Initializing user profile...');
    const existingProfile = await getUserProfile();

    if (existingProfile) {
      console.log('👤 [INIT PROFILE] Existing profile found, checking for updates...');
      // Migrate old profiles to new structure
      let needsUpdate = false;

      // Add missing fields
      if (existingProfile.currentStreak === undefined) {
        existingProfile.currentStreak = 0;
        needsUpdate = true;
      }
      if (existingProfile.longestStreak === undefined) {
        existingProfile.longestStreak = 0;
        needsUpdate = true;
      }
      if (existingProfile.totalPoints === undefined) {
        existingProfile.totalPoints = 0;
        needsUpdate = true;
      }
      if (existingProfile.predictedRaceIds === undefined) {
        existingProfile.predictedRaceIds = [];
        needsUpdate = true;
      }

      // Sync stats from achievements if out of sync
      const unlockedCount = existingProfile.achievements?.filter(a => a.isUnlocked).length || 0;
      const predictionAchievements = existingProfile.achievements?.filter(a => a.type === 'prediction_count') || [];
      const maxPredictionProgress = Math.max(...predictionAchievements.map(a => a.currentProgress), 0);

      console.log('🔄 [SYNC CHECK]', {
        totalPredictions: existingProfile.totalPredictions,
        unlockedCount,
        maxPredictionProgress
      });

      // If achievements show progress but stats are 0, restore from achievements
      if (unlockedCount > 0 && existingProfile.totalPredictions === 0 && maxPredictionProgress > 0) {
        console.log('⚠️ [SYNC] Data out of sync! Restoring from achievements...');
        existingProfile.totalPredictions = maxPredictionProgress;
        existingProfile.racingIQLevel = Math.floor(maxPredictionProgress / 5) + 1;

        // Recalculate total points from unlocked achievements
        const pointsFromAchievements = existingProfile.achievements
          ?.filter(a => a.isUnlocked)
          .reduce((sum, a) => sum + (a.rewardPoints || 0), 0) || 0;
        existingProfile.totalPoints = pointsFromAchievements;

        console.log('✅ [SYNC] Restored stats:', {
          totalPredictions: existingProfile.totalPredictions,
          racingIQLevel: existingProfile.racingIQLevel,
          totalPoints: existingProfile.totalPoints
        });

        needsUpdate = true;
      }

      // Initialize achievements if empty or missing new fields
      if (!existingProfile.achievements || existingProfile.achievements.length === 0) {
        const initialAchievements: Achievement[] = ACHIEVEMENTS.map(achievement => ({
          ...achievement,
          currentProgress: 0,
          isUnlocked: false,
        }));
        existingProfile.achievements = initialAchievements;

        // Retroactively update progress based on existing stats
        existingProfile.achievements = existingProfile.achievements.map(ach => {
          let updated = { ...ach };

          if (ach.type === 'first_prediction' && existingProfile.totalPredictions >= 1) {
            updated.currentProgress = 1;
            updated.isUnlocked = true;
            updated.earnedDate = new Date().toISOString();
            existingProfile.totalPoints += ach.rewardPoints || 0;
          }

          if (ach.type === 'prediction_count') {
            updated.currentProgress = existingProfile.totalPredictions;
            if (existingProfile.totalPredictions >= ach.targetProgress) {
              updated.isUnlocked = true;
              updated.earnedDate = new Date().toISOString();
              existingProfile.totalPoints += ach.rewardPoints || 0;
            }
          }

          return updated;
        });

        needsUpdate = true;
      } else {
        // Update existing achievements to have new fields
        existingProfile.achievements = ACHIEVEMENTS.map(templateAch => {
          const existing = existingProfile.achievements?.find(a => a.id === templateAch.id);
          if (existing) {
            return {
              ...templateAch,
              currentProgress: existing.currentProgress || 0,
              isUnlocked: existing.isUnlocked || false,
              earnedDate: existing.earnedDate,
            };
          }
          return {
            ...templateAch,
            currentProgress: 0,
            isUnlocked: false,
          };
        });
        needsUpdate = true;
      }

      if (needsUpdate) {
        await saveUserProfile(existingProfile);
      }

      return existingProfile;
    }

    const newProfile = createDefaultProfile();
    await saveUserProfile(newProfile);
    return newProfile;
  } catch (error) {
    console.error('Error initializing user profile:', error);
    return createDefaultProfile();
  }
};

// Clear all data (for testing purposes)
export const clearAllData = async (userId?: string): Promise<boolean> => {
  try {
    console.log('🧹 [CLEAR ALL DATA] Clearing AsyncStorage...');
    // Clear AsyncStorage
    await AsyncStorage.multiRemove([KEYS.USER_PROFILE, KEYS.PREDICTIONS]);

    // Clear prediction history key if it exists
    await AsyncStorage.removeItem('@prediction_history');

    // Clear Supabase predictions if userId provided
    if (userId) {
      console.log('🗑️ [CLEAR ALL DATA] Deleting Supabase predictions for user:', userId);
      await deleteAllUserPredictions(userId);
    }

    console.log('✅ [CLEAR ALL DATA] All data cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ [CLEAR ALL DATA] Error clearing data:', error);
    return false;
  }
};
