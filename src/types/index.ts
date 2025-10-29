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
export type Series = 'supercross' | 'motocross' | 'championship';
export type SeasonStatus = 'upcoming' | 'active' | 'demo' | 'completed';

// NEW: Season interface for multi-season support
export interface Season {
  id: string;
  year: number;
  name: string;
  description?: string;
  status: SeasonStatus;
  is_simulation: boolean; // true = demo/practice, false = live
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export type RaceStatus = 'upcoming' | 'open' | 'completed';

export interface Race {
  id: string;
  name: string;
  series: Series;
  trackId: string;
  date: string; // ISO date string
  round: number;
  type: RaceType;
  status: RaceStatus; // Beta progression: upcoming → open → completed
  // NEW: Season fields
  season_id?: string;
  is_simulation?: boolean; // true = demo mode (2025 replay), false = live
  actual_results?: {
    [className: string]: Array<{
      riderId: string;
      position: number;
      points?: number;
    }>;
  };
  results_revealed_at?: string;
  // NEW: Beta progression fields
  opened_at?: string; // When predictions became available
  closes_at?: string; // When predictions auto-close
  auto_progress_hours?: number; // Hours until auto-progression (default 48)
}

export interface RaceResult {
  id: string;
  raceId: string;
  riderId: string;
  position: number;
  lapTimes?: number[];
  dnf?: boolean; // Did Not Finish
}

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

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
  confidenceLevel?: ConfidenceLevel; // 1-5 stars
  // NEW: Season fields
  season_id?: string;
  is_simulation?: boolean; // true = demo mode prediction
}

export interface ConfidenceMultiplier {
  level: ConfidenceLevel;
  multiplier: number;
  label: string;
  description: string;
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
  lastRaceRound?: number; // Track the last race round predicted for streak calculation
  predictedRaceIds?: string[]; // Track which races have been predicted
}

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type AchievementCategory = 'predictions' | 'accuracy' | 'streaks' | 'special' | 'social' | 'loyalty';

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
