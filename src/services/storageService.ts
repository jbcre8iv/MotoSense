import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Prediction, Achievement } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';

const KEYS = {
  USER_PROFILE: '@motosense_user_profile',
  PREDICTIONS: '@motosense_predictions',
};

// User Profile methods
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<boolean> => {
  try {
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

// Helper function to check if dates are consecutive races
const isConsecutiveRace = (lastDate: string | undefined, currentDate: string): boolean => {
  if (!lastDate) return true; // First prediction

  const last = new Date(lastDate);
  const current = new Date(currentDate);
  const daysDiff = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  // Consider consecutive if within 14 days (typical time between races)
  return daysDiff > 0 && daysDiff <= 14;
};

// Update user stats after making a prediction
export const updateUserStats = async (newPrediction: Prediction): Promise<boolean> => {
  try {
    const profile = await getUserProfile();
    if (!profile) return false;

    // Update total predictions
    profile.totalPredictions += 1;

    // Update streak
    const isConsecutive = isConsecutiveRace(profile.lastPredictionDate, newPrediction.timestamp);
    if (isConsecutive) {
      profile.currentStreak += 1;
      if (profile.currentStreak > profile.longestStreak) {
        profile.longestStreak = profile.currentStreak;
      }
    } else {
      profile.currentStreak = 1;
    }
    profile.lastPredictionDate = newPrediction.timestamp;

    // Calculate Racing IQ level based on total predictions
    profile.racingIQLevel = Math.floor(profile.totalPredictions / 5) + 1;

    // Update achievement progress
    await updateAchievementProgress(profile, newPrediction);

    await saveUserProfile(profile);
    return true;
  } catch (error) {
    console.error('Error updating user stats:', error);
    return false;
  }
};

// Update achievement progress based on user actions
const updateAchievementProgress = async (profile: UserProfile, newPrediction: Prediction): Promise<void> => {
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
  }
};

// Initialize user profile if it doesn't exist
export const initializeUserProfile = async (): Promise<UserProfile> => {
  try {
    const existingProfile = await getUserProfile();

    if (existingProfile) {
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
export const clearAllData = async (): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove([KEYS.USER_PROFILE, KEYS.PREDICTIONS]);
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};
