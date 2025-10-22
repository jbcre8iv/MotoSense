// Core data types for MotoSense app

export interface Rider {
  id: string;
  name: string;
  number: number;
  team: string;
  bike: string;
  careerWins: number;
  careerPodiums: number;
  championships: number;
  bio?: string;
  imageUrl?: string;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
  };
}

export interface Track {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  type: 'indoor' | 'outdoor';
  soilType: string;
  trackLength: number; // in miles
  imageUrl?: string;
}

export type RaceType = 'practice' | 'qualifying' | 'heat' | 'main';
export type Series = 'supercross' | 'motocross' | 'arenacross';

export interface Race {
  id: string;
  name: string;
  series: Series;
  trackId: string;
  date: string; // ISO date string
  round: number;
  type: RaceType;
  status: 'upcoming' | 'live' | 'completed';
}

export interface RaceResult {
  id: string;
  raceId: string;
  riderId: string;
  position: number;
  lapTimes?: number[];
  dnf?: boolean; // Did Not Finish
}

export interface Prediction {
  id: string;
  userId: string;
  raceId: string;
  predictions: {
    riderId: string;
    predictedPosition: number;
  }[];
  timestamp: string;
  confidenceScore?: number;
}

export interface UserProfile {
  id: string;
  username: string;
  totalPredictions: number;
  accuracyPercentage: number;
  racingIQLevel: number;
  favoriteRiders: string[]; // rider IDs
  achievements: Achievement[];
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  lastPredictionDate?: string;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type AchievementCategory = 'predictions' | 'accuracy' | 'streaks' | 'special';

export interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  earnedDate?: string;
  isUnlocked: boolean;
  icon: string;
  category: AchievementCategory;
  tier: AchievementTier;
  currentProgress: number;
  targetProgress: number;
  rewardPoints?: number;
}

export interface WeatherData {
  trackId: string;
  timestamp: string;
  temperature: number; // Fahrenheit
  conditions: string; // e.g., "Sunny", "Rainy", "Cloudy"
  windSpeed: number; // mph
  humidity: number; // percentage
  precipitation: number; // percentage chance
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  date: string;
  highTemp: number;
  lowTemp: number;
  conditions: string;
  precipChance: number;
}

export interface AIPrediction {
  raceId: string;
  predictions: {
    riderId: string;
    predictedPosition: number;
    confidence: number; // 0-100
    reasoning: string;
  }[];
  generatedAt: string;
}
