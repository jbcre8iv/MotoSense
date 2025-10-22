import { Achievement, AchievementCategory, AchievementTier } from '../types';

// Define all available achievements
export const ACHIEVEMENTS: Achievement[] = [
  // PREDICTIONS CATEGORY
  {
    id: 'first_prediction',
    type: 'first_prediction',
    title: 'First Blood',
    description: 'Make your first prediction',
    isUnlocked: false,
    icon: 'star',
    category: 'predictions',
    tier: 'bronze',
    currentProgress: 0,
    targetProgress: 1,
    rewardPoints: 100,
  },
  {
    id: 'predictions_5',
    type: 'prediction_count',
    title: 'Getting Started',
    description: 'Make 5 predictions',
    isUnlocked: false,
    icon: 'trending-up',
    category: 'predictions',
    tier: 'bronze',
    currentProgress: 0,
    targetProgress: 5,
    rewardPoints: 250,
  },
  {
    id: 'predictions_10',
    type: 'prediction_count',
    title: 'Dedicated Fan',
    description: 'Make 10 predictions',
    isUnlocked: false,
    icon: 'flame',
    category: 'predictions',
    tier: 'silver',
    currentProgress: 0,
    targetProgress: 10,
    rewardPoints: 500,
  },
  {
    id: 'predictions_25',
    type: 'prediction_count',
    title: 'Race Analyst',
    description: 'Make 25 predictions',
    isUnlocked: false,
    icon: 'analytics',
    category: 'predictions',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 25,
    rewardPoints: 1000,
  },
  {
    id: 'predictions_50',
    type: 'prediction_count',
    title: 'Prediction Master',
    description: 'Make 50 predictions',
    isUnlocked: false,
    icon: 'trophy',
    category: 'predictions',
    tier: 'platinum',
    currentProgress: 0,
    targetProgress: 50,
    rewardPoints: 2500,
  },

  // ACCURACY CATEGORY
  {
    id: 'accuracy_50',
    type: 'accuracy_threshold',
    title: 'Sharp Eye',
    description: 'Achieve 50% accuracy (min 5 predictions)',
    isUnlocked: false,
    icon: 'eye',
    category: 'accuracy',
    tier: 'bronze',
    currentProgress: 0,
    targetProgress: 50,
    rewardPoints: 300,
  },
  {
    id: 'accuracy_70',
    type: 'accuracy_threshold',
    title: 'Track Reader',
    description: 'Achieve 70% accuracy (min 10 predictions)',
    isUnlocked: false,
    icon: 'glasses',
    category: 'accuracy',
    tier: 'silver',
    currentProgress: 0,
    targetProgress: 70,
    rewardPoints: 750,
  },
  {
    id: 'accuracy_80',
    type: 'accuracy_threshold',
    title: 'Race Whisperer',
    description: 'Achieve 80% accuracy (min 15 predictions)',
    isUnlocked: false,
    icon: 'sparkles',
    category: 'accuracy',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 80,
    rewardPoints: 1500,
  },
  {
    id: 'perfect_prediction',
    type: 'perfect_race',
    title: 'Perfect Weekend',
    description: 'Predict all 5 positions correctly in a single race',
    isUnlocked: false,
    icon: 'checkmark-circle',
    category: 'accuracy',
    tier: 'platinum',
    currentProgress: 0,
    targetProgress: 1,
    rewardPoints: 5000,
  },

  // STREAKS CATEGORY
  {
    id: 'streak_3',
    type: 'streak_count',
    title: 'On a Roll',
    description: 'Predict 3 races in a row',
    isUnlocked: false,
    icon: 'flash',
    category: 'streaks',
    tier: 'bronze',
    currentProgress: 0,
    targetProgress: 3,
    rewardPoints: 200,
  },
  {
    id: 'streak_5',
    type: 'streak_count',
    title: 'Hot Streak',
    description: 'Predict 5 races in a row',
    isUnlocked: false,
    icon: 'flame',
    category: 'streaks',
    tier: 'silver',
    currentProgress: 0,
    targetProgress: 5,
    rewardPoints: 500,
  },
  {
    id: 'streak_10',
    type: 'streak_count',
    title: 'Unstoppable',
    description: 'Predict 10 races in a row',
    isUnlocked: false,
    icon: 'rocket',
    category: 'streaks',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 10,
    rewardPoints: 1200,
  },
  {
    id: 'streak_20',
    type: 'streak_count',
    title: 'Legend Status',
    description: 'Predict 20 races in a row',
    isUnlocked: false,
    icon: 'medal',
    category: 'streaks',
    tier: 'platinum',
    currentProgress: 0,
    targetProgress: 20,
    rewardPoints: 3000,
  },

  // SPECIAL CATEGORY
  {
    id: 'early_bird',
    type: 'early_prediction',
    title: 'Early Bird',
    description: 'Make a prediction more than 24 hours before race',
    isUnlocked: false,
    icon: 'time',
    category: 'special',
    tier: 'bronze',
    currentProgress: 0,
    targetProgress: 1,
    rewardPoints: 150,
  },
  {
    id: 'weather_warrior',
    type: 'rain_predictions',
    title: 'Weather Warrior',
    description: 'Make 5 predictions for races with rain forecasted',
    isUnlocked: false,
    icon: 'rainy',
    category: 'special',
    tier: 'silver',
    currentProgress: 0,
    targetProgress: 5,
    rewardPoints: 400,
  },
  {
    id: 'track_specialist',
    type: 'same_track',
    title: 'Track Specialist',
    description: 'Make predictions for 3 races at the same track',
    isUnlocked: false,
    icon: 'map',
    category: 'special',
    tier: 'silver',
    currentProgress: 0,
    targetProgress: 3,
    rewardPoints: 350,
  },
  {
    id: 'underdog_pick',
    type: 'underdog_correct',
    title: 'Upset Alert',
    description: 'Correctly predict an underdog in top 3',
    isUnlocked: false,
    icon: 'trophy',
    category: 'special',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 1,
    rewardPoints: 800,
  },
  {
    id: 'rookie_podium',
    type: 'rookie_prediction',
    title: 'Rookie Scout',
    description: 'Predict a rookie finishing on the podium',
    isUnlocked: false,
    icon: 'star',
    category: 'special',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 1,
    rewardPoints: 700,
  },
  {
    id: 'last_minute',
    type: 'late_prediction',
    title: 'Clutch Call',
    description: 'Make a prediction within 1 hour of race start',
    isUnlocked: false,
    icon: 'timer',
    category: 'special',
    tier: 'bronze',
    currentProgress: 0,
    targetProgress: 1,
    rewardPoints: 100,
  },

  // SOCIAL CATEGORY
  {
    id: 'first_group',
    type: 'create_group',
    title: 'Group Founder',
    description: 'Create your first group',
    isUnlocked: false,
    icon: 'people',
    category: 'social',
    tier: 'bronze',
    currentProgress: 0,
    targetProgress: 1,
    rewardPoints: 200,
  },
  {
    id: 'group_10_members',
    type: 'group_size',
    title: 'Community Builder',
    description: 'Grow a group to 10 members',
    isUnlocked: false,
    icon: 'people-circle',
    category: 'social',
    tier: 'silver',
    currentProgress: 0,
    targetProgress: 10,
    rewardPoints: 600,
  },
  {
    id: 'group_25_members',
    type: 'group_size',
    title: 'League Commissioner',
    description: 'Grow a group to 25 members',
    isUnlocked: false,
    icon: 'trophy',
    category: 'social',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 25,
    rewardPoints: 1500,
  },
  {
    id: 'win_group',
    type: 'win_group_leaderboard',
    title: 'Group Champion',
    description: 'Finish #1 in a group leaderboard',
    isUnlocked: false,
    icon: 'medal',
    category: 'social',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 1,
    rewardPoints: 1000,
  },
  {
    id: 'beat_friend',
    type: 'beat_friend_score',
    title: 'Friendly Rivalry',
    description: 'Beat a friend\'s score on a race',
    isUnlocked: false,
    icon: 'flame',
    category: 'social',
    tier: 'bronze',
    currentProgress: 0,
    targetProgress: 1,
    rewardPoints: 150,
  },
  {
    id: 'join_3_groups',
    type: 'join_groups',
    title: 'Social Butterfly',
    description: 'Join 3 different groups',
    isUnlocked: false,
    icon: 'people',
    category: 'social',
    tier: 'silver',
    currentProgress: 0,
    targetProgress: 3,
    rewardPoints: 400,
  },

  // LOYALTY CATEGORY
  {
    id: 'full_season_sx',
    type: 'full_season',
    title: 'Supercross Faithful',
    description: 'Make predictions for entire Supercross season',
    isUnlocked: false,
    icon: 'checkmark-done',
    category: 'loyalty',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 17, // 17 rounds in SX
    rewardPoints: 2000,
  },
  {
    id: 'full_season_mx',
    type: 'full_season',
    title: 'Motocross Devotee',
    description: 'Make predictions for entire Motocross season',
    isUnlocked: false,
    icon: 'checkmark-done',
    category: 'loyalty',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 12, // 12 rounds in MX
    rewardPoints: 1800,
  },
  {
    id: 'two_seasons',
    type: 'seasons_completed',
    title: 'Veteran Predictor',
    description: 'Complete predictions for 2 full seasons',
    isUnlocked: false,
    icon: 'calendar',
    category: 'loyalty',
    tier: 'platinum',
    currentProgress: 0,
    targetProgress: 2,
    rewardPoints: 5000,
  },
  {
    id: 'three_seasons',
    type: 'seasons_completed',
    title: 'Die Hard Fan',
    description: 'Complete predictions for 3 full seasons',
    isUnlocked: false,
    icon: 'infinite',
    category: 'loyalty',
    tier: 'platinum',
    currentProgress: 0,
    targetProgress: 3,
    rewardPoints: 10000,
  },
  {
    id: 'opening_day',
    type: 'season_opener',
    title: 'Opening Day Tradition',
    description: 'Make predictions for 3 consecutive season openers',
    isUnlocked: false,
    icon: 'flag',
    category: 'loyalty',
    tier: 'silver',
    currentProgress: 0,
    targetProgress: 3,
    rewardPoints: 500,
  },

  // SERIES MASTERY
  {
    id: 'sx_specialist',
    type: 'series_accuracy',
    title: 'Supercross Specialist',
    description: 'Achieve 75% accuracy in Supercross (min 10 races)',
    isUnlocked: false,
    icon: 'flash',
    category: 'special',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 75,
    rewardPoints: 1200,
  },
  {
    id: 'mx_master',
    type: 'series_accuracy',
    title: 'Motocross Master',
    description: 'Achieve 75% accuracy in Motocross (min 10 races)',
    isUnlocked: false,
    icon: 'flash',
    category: 'special',
    tier: 'gold',
    currentProgress: 0,
    targetProgress: 75,
    rewardPoints: 1200,
  },
  {
    id: 'championship_predictor',
    type: 'series_accuracy',
    title: 'Championship Predictor',
    description: 'Achieve 75% accuracy in Championship rounds (min 5 races)',
    isUnlocked: false,
    icon: 'trophy',
    category: 'special',
    tier: 'platinum',
    currentProgress: 0,
    targetProgress: 75,
    rewardPoints: 2000,
  },
];

// Helper function to get tier color
export const getTierColor = (tier: AchievementTier): string => {
  switch (tier) {
    case 'bronze':
      return '#CD7F32';
    case 'silver':
      return '#C0C0C0';
    case 'gold':
      return '#FFD700';
    case 'platinum':
      return '#E5E4E2';
    default:
      return '#8892b0';
  }
};

// Helper function to get category color
export const getCategoryColor = (category: AchievementCategory): string => {
  switch (category) {
    case 'predictions':
      return '#00d9ff';
    case 'accuracy':
      return '#4caf50';
    case 'streaks':
      return '#ff6b6b';
    case 'special':
      return '#ffd93d';
    case 'social':
      return '#9c27b0'; // Purple
    case 'loyalty':
      return '#ff9800'; // Orange
    default:
      return '#8892b0';
  }
};

// Helper function to get achievement count by tier
export const getAchievementsByTier = (tier: AchievementTier): Achievement[] => {
  return ACHIEVEMENTS.filter(a => a.tier === tier);
};

// Helper function to get achievement count by category
export const getAchievementsByCategory = (category: AchievementCategory): Achievement[] => {
  return ACHIEVEMENTS.filter(a => a.category === category);
};

// Get total possible points
export const getTotalPossiblePoints = (): number => {
  return ACHIEVEMENTS.reduce((sum, achievement) => sum + achievement.rewardPoints, 0);
};
