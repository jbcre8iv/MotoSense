import { supabase } from '../lib/supabase';

export interface Challenge {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  reward: number; // bonus points
  expiresAt: string; // ISO date string
  currentProgress: number;
  targetProgress: number;
  challengeType: ChallengeType;
  isCompleted: boolean;
  icon: string;
}

export type ChallengeType =
  | 'make_predictions' // Make X predictions
  | 'accuracy_target' // Achieve X% accuracy
  | 'streak_maintain' // Maintain streak
  | 'underdog_pick' // Predict an underdog
  | 'early_bird' // Predict 24h early
  | 'perfect_race' // All 5 correct
  | 'social_share' // Share with friends
  | 'group_activity'; // Group participation

/**
 * Get daily challenges for the current day
 */
export const getDailyChallenges = async (userId: string): Promise<Challenge[]> => {
  try {
    console.log('🎯 [CHALLENGES] Fetching daily challenges...');

    // For now, return mock challenges
    // TODO: Store in Supabase and track completion
    const dailyChallenges = generateDailyChallenges();

    console.log(`✅ [CHALLENGES] ${dailyChallenges.length} daily challenges`);
    return dailyChallenges;
  } catch (error) {
    console.error('❌ [CHALLENGES] Error fetching daily challenges:', error);
    return [];
  }
};

/**
 * Get weekly challenges
 */
export const getWeeklyChallenges = async (userId: string): Promise<Challenge[]> => {
  try {
    console.log('🎯 [CHALLENGES] Fetching weekly challenges...');

    const weeklyChallenges = generateWeeklyChallenges();

    console.log(`✅ [CHALLENGES] ${weeklyChallenges.length} weekly challenges`);
    return weeklyChallenges;
  } catch (error) {
    console.error('❌ [CHALLENGES] Error fetching weekly challenges:', error);
    return [];
  }
};

/**
 * Generate daily challenges (rotates each day)
 */
const generateDailyChallenges = (): Challenge[] => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0-6

  // Rotate challenges based on day of week
  const challengePool: Omit<Challenge, 'id' | 'expiresAt' | 'currentProgress' | 'isCompleted'>[] = [
    {
      type: 'daily',
      title: 'Prediction Day',
      description: 'Make 1 prediction today',
      reward: 50,
      targetProgress: 1,
      challengeType: 'make_predictions',
      icon: 'checkmark-circle',
    },
    {
      type: 'daily',
      title: 'Early Bird Special',
      description: 'Make a prediction 24+ hours before race',
      reward: 75,
      targetProgress: 1,
      challengeType: 'early_bird',
      icon: 'time',
    },
    {
      type: 'daily',
      title: 'Accuracy Challenge',
      description: 'Achieve 70% accuracy on today\'s predictions',
      reward: 100,
      targetProgress: 70,
      challengeType: 'accuracy_target',
      icon: 'target',
    },
    {
      type: 'daily',
      title: 'Underdog Hunter',
      description: 'Predict an underdog in top 5',
      reward: 80,
      targetProgress: 1,
      challengeType: 'underdog_pick',
      icon: 'trophy',
    },
    {
      type: 'daily',
      title: 'Share the Love',
      description: 'Invite a friend to join your group',
      reward: 60,
      targetProgress: 1,
      challengeType: 'social_share',
      icon: 'share',
    },
    {
      type: 'daily',
      title: 'Streak Keeper',
      description: 'Maintain your active streak',
      reward: 40,
      targetProgress: 1,
      challengeType: 'streak_maintain',
      icon: 'flame',
    },
    {
      type: 'daily',
      title: 'Group Champion',
      description: 'Beat your group average today',
      reward: 70,
      targetProgress: 1,
      challengeType: 'group_activity',
      icon: 'people',
    },
  ];

  // Select 3 challenges based on day of week
  const dailyChallenges: Challenge[] = [];
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  for (let i = 0; i < 3; i++) {
    const index = (dayOfWeek + i) % challengePool.length;
    const challenge = challengePool[index];

    dailyChallenges.push({
      ...challenge,
      id: `daily-${today.toISOString().split('T')[0]}-${i}`,
      expiresAt: endOfDay.toISOString(),
      currentProgress: 0,
      isCompleted: false,
    });
  }

  return dailyChallenges;
};

/**
 * Generate weekly challenges (resets every Monday)
 */
const generateWeeklyChallenges = (): Challenge[] => {
  const today = new Date();

  // Calculate end of week (Sunday 23:59:59)
  const endOfWeek = new Date(today);
  const daysUntilSunday = 7 - today.getDay();
  endOfWeek.setDate(today.getDate() + daysUntilSunday);
  endOfWeek.setHours(23, 59, 59, 999);

  // Get week number for ID generation
  const weekNumber = getWeekNumber(today);

  return [
    {
      id: `weekly-${weekNumber}-1`,
      type: 'weekly',
      title: 'Weekly Predictor',
      description: 'Make 3 predictions this week',
      reward: 200,
      expiresAt: endOfWeek.toISOString(),
      currentProgress: 0,
      targetProgress: 3,
      challengeType: 'make_predictions',
      isCompleted: false,
      icon: 'calendar',
    },
    {
      id: `weekly-${weekNumber}-2`,
      type: 'weekly',
      title: 'Perfect Weekend',
      description: 'Get all 5 positions correct in any race this week',
      reward: 500,
      expiresAt: endOfWeek.toISOString(),
      currentProgress: 0,
      targetProgress: 1,
      challengeType: 'perfect_race',
      isCompleted: false,
      icon: 'star',
    },
    {
      id: `weekly-${weekNumber}-3`,
      title: 'Social Networker',
      type: 'weekly',
      description: 'Compete in 2 different groups',
      reward: 150,
      expiresAt: endOfWeek.toISOString(),
      currentProgress: 0,
      targetProgress: 2,
      challengeType: 'group_activity',
      isCompleted: false,
      icon: 'people-circle',
    },
  ];
};

/**
 * Get ISO week number
 */
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

/**
 * Update challenge progress
 */
export const updateChallengeProgress = async (
  userId: string,
  challengeId: string,
  progress: number
): Promise<void> => {
  try {
    console.log(`📈 [CHALLENGES] Updating challenge ${challengeId}: ${progress}`);

    // TODO: Store in Supabase
    // For now, track in memory

    console.log('✅ [CHALLENGES] Progress updated');
  } catch (error) {
    console.error('❌ [CHALLENGES] Error updating progress:', error);
  }
};

/**
 * Complete a challenge and award points
 */
export const completeChallenge = async (
  userId: string,
  challenge: Challenge
): Promise<void> => {
  try {
    console.log(`🎉 [CHALLENGES] Challenge completed: ${challenge.title} (+${challenge.reward} pts)`);

    // Award bonus points to user
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_points')
      .eq('id', userId)
      .single();

    if (profile) {
      const newPoints = (profile.total_points || 0) + challenge.reward;

      await supabase
        .from('profiles')
        .update({ total_points: newPoints })
        .eq('id', userId);

      console.log(`✅ [CHALLENGES] Awarded ${challenge.reward} bonus points`);
    }

    // TODO: Mark challenge as completed in database
    // TODO: Send notification about challenge completion
  } catch (error) {
    console.error('❌ [CHALLENGES] Error completing challenge:', error);
  }
};

/**
 * Check if challenges should trigger based on user action
 */
export const checkChallengeCompletion = async (
  userId: string,
  action: {
    type: 'prediction' | 'accuracy' | 'streak' | 'social';
    data?: any;
  }
): Promise<void> => {
  try {
    const dailyChallenges = await getDailyChallenges(userId);
    const weeklyChallenges = await getWeeklyChallenges(userId);
    const allChallenges = [...dailyChallenges, ...weeklyChallenges];

    for (const challenge of allChallenges) {
      if (challenge.isCompleted) continue;

      let shouldComplete = false;

      switch (action.type) {
        case 'prediction':
          if (challenge.challengeType === 'make_predictions') {
            challenge.currentProgress += 1;
            if (challenge.currentProgress >= challenge.targetProgress) {
              shouldComplete = true;
            }
          }
          break;

        case 'accuracy':
          if (challenge.challengeType === 'accuracy_target') {
            if (action.data?.accuracy >= challenge.targetProgress) {
              shouldComplete = true;
            }
          }
          break;

        case 'streak':
          if (challenge.challengeType === 'streak_maintain') {
            shouldComplete = true;
          }
          break;

        case 'social':
          if (challenge.challengeType === 'social_share' || challenge.challengeType === 'group_activity') {
            challenge.currentProgress += 1;
            if (challenge.currentProgress >= challenge.targetProgress) {
              shouldComplete = true;
            }
          }
          break;
      }

      if (shouldComplete) {
        await completeChallenge(userId, challenge);
        challenge.isCompleted = true;
      }
    }
  } catch (error) {
    console.error('❌ [CHALLENGES] Error checking completion:', error);
  }
};
