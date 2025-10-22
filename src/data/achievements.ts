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
    default:
      return '#8892b0';
  }
};
