/**
 * Achievements Service
 *
 * Enhanced achievement system with:
 * - Weekly challenges
 * - Streak rewards
 * - Achievement tracking
 * - Milestone rewards
 * - Integration with notifications
 */

import { supabase } from './supabase';
import { notificationService } from './notificationService';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  category: 'prediction' | 'accuracy' | 'streak' | 'social' | 'special';
  points_reward: number;
  target_value: number;
  is_unlocked: boolean;
  progress: number;
  unlocked_at?: string;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: 'predictions' | 'accuracy' | 'streak' | 'social';
  target_value: number;
  reward_points: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_completed: boolean;
  progress: number;
}

export interface StreakReward {
  streak_days: number;
  bonus_multiplier: number;
  badge_title: string;
  badge_icon: string;
}

export interface MilestoneReward {
  milestone_type: 'predictions' | 'points' | 'accuracy' | 'wins';
  milestone_value: number;
  reward_points: number;
  reward_title: string;
  is_claimed: boolean;
}

/**
 * Get user's achievements
 */
export const getUserAchievements = async (userId: string): Promise<Achievement[]> => {
  try {
    console.log('<Æ [ACHIEVEMENTS] Fetching achievements for user');

    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const achievements: Achievement[] = (data || []).map((ua: any) => ({
      id: ua.achievement.id,
      title: ua.achievement.title,
      description: ua.achievement.description,
      icon: ua.achievement.icon,
      tier: ua.achievement.tier,
      category: ua.achievement.category,
      points_reward: ua.achievement.points_reward,
      target_value: ua.achievement.target_value,
      is_unlocked: ua.is_unlocked,
      progress: ua.progress,
      unlocked_at: ua.unlocked_at,
    }));

    console.log(' [ACHIEVEMENTS] Fetched', achievements.length, 'achievements');
    return achievements;
  } catch (error) {
    console.error('L [ACHIEVEMENTS] Error fetching achievements:', error);
    return [];
  }
};

/**
 * Check and unlock achievements for a user
 */
export const checkAndUnlockAchievements = async (
  userId: string,
  trigger: 'prediction' | 'accuracy' | 'streak' | 'social'
): Promise<Achievement[]> => {
  try {
    console.log('<¯ [ACHIEVEMENTS] Checking for unlockable achievements');

    // Get all user achievements
    const { data: userAchievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .eq('is_unlocked', false);

    if (achievementsError) throw achievementsError;

    const unlockedAchievements: Achievement[] = [];

    for (const ua of userAchievements || []) {
      // Check if progress meets target
      if (ua.progress >= ua.achievement.target_value) {
        // Unlock the achievement
        const { error: updateError } = await supabase
          .from('user_achievements')
          .update({
            is_unlocked: true,
            unlocked_at: new Date().toISOString(),
          })
          .eq('id', ua.id);

        if (updateError) {
          console.error('Error unlocking achievement:', updateError);
          continue;
        }

        // Award points
        await supabase
          .from('profiles')
          .update({
            total_points: supabase.raw(`total_points + ${ua.achievement.points_reward}`),
          })
          .eq('id', userId);

        const achievement: Achievement = {
          id: ua.achievement.id,
          title: ua.achievement.title,
          description: ua.achievement.description,
          icon: ua.achievement.icon,
          tier: ua.achievement.tier,
          category: ua.achievement.category,
          points_reward: ua.achievement.points_reward,
          target_value: ua.achievement.target_value,
          is_unlocked: true,
          progress: ua.progress,
          unlocked_at: new Date().toISOString(),
        };

        unlockedAchievements.push(achievement);

        // Send notification
        await notificationService.sendAchievementNotification(
          achievement.title,
          achievement.points_reward
        );
      }
    }

    if (unlockedAchievements.length > 0) {
      console.log(' [ACHIEVEMENTS] Unlocked', unlockedAchievements.length, 'achievements');
    }

    return unlockedAchievements;
  } catch (error) {
    console.error('L [ACHIEVEMENTS] Error checking achievements:', error);
    return [];
  }
};

/**
 * Update achievement progress
 */
export const updateAchievementProgress = async (
  userId: string,
  achievementId: string,
  newProgress: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_achievements')
      .update({ progress: newProgress })
      .eq('user_id', userId)
      .eq('achievement_id', achievementId);

    if (error) throw error;

    console.log(' [ACHIEVEMENTS] Progress updated for achievement:', achievementId);
  } catch (error) {
    console.error('L [ACHIEVEMENTS] Error updating progress:', error);
  }
};

/**
 * Get active weekly challenges
 */
export const getWeeklyChallenges = async (userId: string): Promise<WeeklyChallenge[]> => {
  try {
    console.log('=Å [ACHIEVEMENTS] Fetching weekly challenges');

    const now = new Date().toISOString();

    // Get active challenges
    const { data: challenges, error: challengesError } = await supabase
      .from('weekly_challenges')
      .select('*')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('end_date', { ascending: true });

    if (challengesError) throw challengesError;

    // Get user's challenge progress
    const { data: progress, error: progressError } = await supabase
      .from('user_challenge_progress')
      .select('*')
      .eq('user_id', userId)
      .in('challenge_id', (challenges || []).map(c => c.id));

    if (progressError) throw progressError;

    const progressMap = new Map(progress?.map(p => [p.challenge_id, p]) || []);

    const weeklyChallenges: WeeklyChallenge[] = (challenges || []).map(c => {
      const userProgress = progressMap.get(c.id);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        challenge_type: c.challenge_type,
        target_value: c.target_value,
        reward_points: c.reward_points,
        start_date: c.start_date,
        end_date: c.end_date,
        is_active: true,
        is_completed: userProgress?.is_completed || false,
        progress: userProgress?.progress || 0,
      };
    });

    console.log(' [ACHIEVEMENTS] Fetched', weeklyChallenges.length, 'weekly challenges');
    return weeklyChallenges;
  } catch (error) {
    console.error('L [ACHIEVEMENTS] Error fetching weekly challenges:', error);
    return [];
  }
};

/**
 * Update weekly challenge progress
 */
export const updateChallengeProgress = async (
  userId: string,
  challengeId: string,
  newProgress: number
): Promise<boolean> => {
  try {
    // Get challenge details
    const { data: challenge } = await supabase
      .from('weekly_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge) return false;

    const isCompleted = newProgress >= challenge.target_value;

    // Upsert progress
    const { error } = await supabase
      .from('user_challenge_progress')
      .upsert({
        user_id: userId,
        challenge_id: challengeId,
        progress: newProgress,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      }, {
        onConflict: 'user_id,challenge_id',
      });

    if (error) throw error;

    // Award points if completed
    if (isCompleted) {
      await supabase
        .from('profiles')
        .update({
          total_points: supabase.raw(`total_points + ${challenge.reward_points}`),
        })
        .eq('id', userId);

      // Send notification
      await notificationService.sendChallengeNotification(
        challenge.title,
        challenge.reward_points
      );

      console.log(' [ACHIEVEMENTS] Challenge completed:', challenge.title);
      return true;
    }

    return false;
  } catch (error) {
    console.error('L [ACHIEVEMENTS] Error updating challenge progress:', error);
    return false;
  }
};

/**
 * Get streak rewards
 */
export const getStreakRewards = (): StreakReward[] => {
  return [
    {
      streak_days: 3,
      bonus_multiplier: 1.1,
      badge_title: 'Hot Start',
      badge_icon: 'flame',
    },
    {
      streak_days: 7,
      bonus_multiplier: 1.25,
      badge_title: 'On Fire',
      badge_icon: 'flame',
    },
    {
      streak_days: 14,
      bonus_multiplier: 1.5,
      badge_title: 'Blazing',
      badge_icon: 'flame',
    },
    {
      streak_days: 30,
      bonus_multiplier: 2.0,
      badge_title: 'Inferno',
      badge_icon: 'flame',
    },
    {
      streak_days: 60,
      bonus_multiplier: 2.5,
      badge_title: 'Legendary Streak',
      badge_icon: 'star',
    },
    {
      streak_days: 100,
      bonus_multiplier: 3.0,
      badge_title: 'Unstoppable',
      badge_icon: 'trophy',
    },
  ];
};

/**
 * Calculate streak bonus for points
 */
export const calculateStreakBonus = (basePoints: number, streakDays: number): number => {
  const streakRewards = getStreakRewards();

  // Find the highest streak reward the user qualifies for
  let multiplier = 1.0;
  for (const reward of streakRewards) {
    if (streakDays >= reward.streak_days) {
      multiplier = reward.bonus_multiplier;
    }
  }

  return Math.round(basePoints * multiplier);
};

/**
 * Check and update user streak
 */
export const updateUserStreak = async (userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  streakBroken: boolean;
}> => {
  try {
    console.log('=% [ACHIEVEMENTS] Updating user streak');

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak, longest_streak, last_prediction_date')
      .eq('id', userId)
      .single();

    if (!profile) {
      return { currentStreak: 0, longestStreak: 0, streakBroken: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastPrediction = profile.last_prediction_date
      ? new Date(profile.last_prediction_date)
      : null;

    if (lastPrediction) {
      lastPrediction.setHours(0, 0, 0, 0);
    }

    let currentStreak = profile.current_streak || 0;
    let longestStreak = profile.longest_streak || 0;
    let streakBroken = false;

    if (!lastPrediction) {
      // First prediction ever
      currentStreak = 1;
    } else {
      const daysDiff = Math.floor((today.getTime() - lastPrediction.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Same day, no change
      } else if (daysDiff === 1) {
        // Consecutive day
        currentStreak += 1;
      } else {
        // Streak broken
        streakBroken = true;
        currentStreak = 1;

        // Send streak reminder notification if streak was significant
        if (profile.current_streak >= 3) {
          await notificationService.sendStreakReminder(profile.current_streak);
        }
      }
    }

    // Update longest streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // Update profile
    await supabase
      .from('profiles')
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_prediction_date: today.toISOString(),
      })
      .eq('id', userId);

    console.log(' [ACHIEVEMENTS] Streak updated:', { currentStreak, longestStreak, streakBroken });

    return { currentStreak, longestStreak, streakBroken };
  } catch (error) {
    console.error('L [ACHIEVEMENTS] Error updating streak:', error);
    return { currentStreak: 0, longestStreak: 0, streakBroken: false };
  }
};

/**
 * Get user's milestone rewards
 */
export const getUserMilestones = async (userId: string): Promise<MilestoneReward[]> => {
  try {
    console.log('<– [ACHIEVEMENTS] Fetching milestones');

    const { data: profile } = await supabase
      .from('profiles')
      .select('total_predictions, total_points, accuracy_percentage')
      .eq('id', userId)
      .single();

    if (!profile) return [];

    const { data: claimed } = await supabase
      .from('milestone_claims')
      .select('milestone_type, milestone_value')
      .eq('user_id', userId);

    const claimedSet = new Set(
      claimed?.map(c => `${c.milestone_type}_${c.milestone_value}`) || []
    );

    // Define milestone tiers
    const predictionMilestones = [10, 25, 50, 100, 250, 500, 1000];
    const pointsMilestones = [100, 500, 1000, 5000, 10000, 25000, 50000];
    const accuracyMilestones = [50, 60, 70, 80, 90];

    const milestones: MilestoneReward[] = [];

    // Prediction milestones
    for (const value of predictionMilestones) {
      if (profile.total_predictions >= value) {
        milestones.push({
          milestone_type: 'predictions',
          milestone_value: value,
          reward_points: value * 10,
          reward_title: `${value} Predictions Made`,
          is_claimed: claimedSet.has(`predictions_${value}`),
        });
      }
    }

    // Points milestones
    for (const value of pointsMilestones) {
      if (profile.total_points >= value) {
        milestones.push({
          milestone_type: 'points',
          milestone_value: value,
          reward_points: Math.round(value * 0.1),
          reward_title: `${value} Points Earned`,
          is_claimed: claimedSet.has(`points_${value}`),
        });
      }
    }

    // Accuracy milestones
    for (const value of accuracyMilestones) {
      if (profile.accuracy_percentage >= value) {
        milestones.push({
          milestone_type: 'accuracy',
          milestone_value: value,
          reward_points: value * 5,
          reward_title: `${value}% Accuracy Achieved`,
          is_claimed: claimedSet.has(`accuracy_${value}`),
        });
      }
    }

    console.log(' [ACHIEVEMENTS] Fetched', milestones.length, 'milestones');
    return milestones;
  } catch (error) {
    console.error('L [ACHIEVEMENTS] Error fetching milestones:', error);
    return [];
  }
};

/**
 * Claim a milestone reward
 */
export const claimMilestone = async (
  userId: string,
  milestone: MilestoneReward
): Promise<boolean> => {
  try {
    // Record the claim
    const { error: claimError } = await supabase
      .from('milestone_claims')
      .insert({
        user_id: userId,
        milestone_type: milestone.milestone_type,
        milestone_value: milestone.milestone_value,
        points_awarded: milestone.reward_points,
        claimed_at: new Date().toISOString(),
      });

    if (claimError) throw claimError;

    // Award points
    await supabase
      .from('profiles')
      .update({
        total_points: supabase.raw(`total_points + ${milestone.reward_points}`),
      })
      .eq('id', userId);

    console.log(' [ACHIEVEMENTS] Milestone claimed:', milestone.reward_title);
    return true;
  } catch (error) {
    console.error('L [ACHIEVEMENTS] Error claiming milestone:', error);
    return false;
  }
};

/**
 * Initialize default achievements for new user
 */
export const initializeUserAchievements = async (userId: string): Promise<void> => {
  try {
    console.log('<¯ [ACHIEVEMENTS] Initializing achievements for new user');

    // Get all available achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*');

    if (!achievements || achievements.length === 0) return;

    // Create user achievement entries
    const userAchievements = achievements.map(achievement => ({
      user_id: userId,
      achievement_id: achievement.id,
      progress: 0,
      is_unlocked: false,
    }));

    const { error } = await supabase
      .from('user_achievements')
      .insert(userAchievements);

    if (error) throw error;

    console.log(' [ACHIEVEMENTS] Initialized', achievements.length, 'achievements');
  } catch (error) {
    console.error('L [ACHIEVEMENTS] Error initializing achievements:', error);
  }
};
