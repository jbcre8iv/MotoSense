import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

export interface PerformanceDataPoint {
  date: string;
  value: number;
  label: string;
}

export interface PerformanceOverTime {
  accuracy: PerformanceDataPoint[];
  points: PerformanceDataPoint[];
  predictions: PerformanceDataPoint[];
}

export interface PositionAccuracy {
  position: number;
  correct: number;
  total: number;
  accuracy: number;
}

export interface AnalyticsData {
  performanceOverTime: PerformanceOverTime;
  positionAccuracy: PositionAccuracy[];
  recentPerformance: {
    last5Accuracy: number;
    last10Accuracy: number;
    allTimeAccuracy: number;
  };
  streakInfo: {
    current: number;
    best: number;
    averageStreak: number;
  };
}

/**
 * Get user's performance history
 */
const getPredictionHistory = async (): Promise<any[]> => {
  try {
    const historyJson = await AsyncStorage.getItem('@prediction_history');
    if (!historyJson) return [];

    const history = JSON.parse(historyJson);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('[ANALYTICS] Error loading prediction history:', error);
    return [];
  }
};

/**
 * Calculate performance metrics over time
 */
export const getPerformanceOverTime = async (): Promise<PerformanceOverTime> => {
  const history = await getPredictionHistory();

  // Group predictions by date
  const dateGroups: Record<string, any[]> = {};

  history.forEach((entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    if (!dateGroups[date]) {
      dateGroups[date] = [];
    }
    dateGroups[date].push(entry);
  });

  // Calculate metrics for each date
  const dates = Object.keys(dateGroups).slice(-7); // Last 7 data points

  const accuracy: PerformanceDataPoint[] = [];
  const points: PerformanceDataPoint[] = [];
  const predictions: PerformanceDataPoint[] = [];

  dates.forEach((date) => {
    const entries = dateGroups[date];
    const totalPredictions = entries.length;

    // For now, simulate accuracy (will be real when we have race results)
    const simulatedAccuracy = Math.floor(Math.random() * 30) + 60; // 60-90%
    const calculatedPoints = simulatedAccuracy * 10;

    accuracy.push({
      date,
      value: simulatedAccuracy,
      label: `${simulatedAccuracy}%`,
    });

    points.push({
      date,
      value: calculatedPoints,
      label: `${calculatedPoints}pts`,
    });

    predictions.push({
      date,
      value: totalPredictions,
      label: `${totalPredictions}`,
    });
  });

  return {
    accuracy,
    points,
    predictions,
  };
};

/**
 * Calculate accuracy by position
 */
export const getPositionAccuracy = async (): Promise<PositionAccuracy[]> => {
  const history = await getPredictionHistory();

  // Initialize counters for each position
  const positionStats: Record<number, { correct: number; total: number }> = {
    1: { correct: 0, total: 0 },
    2: { correct: 0, total: 0 },
    3: { correct: 0, total: 0 },
    4: { correct: 0, total: 0 },
    5: { correct: 0, total: 0 },
  };

  // Count predictions for each position
  history.forEach((entry) => {
    if (entry.predictions) {
      Object.keys(entry.predictions).forEach((pos) => {
        const position = parseInt(pos);
        if (positionStats[position]) {
          positionStats[position].total++;
          // Simulate correct predictions (will be real when we have race results)
          if (Math.random() > 0.4) {
            positionStats[position].correct++;
          }
        }
      });
    }
  });

  // Calculate accuracy for each position
  return Object.entries(positionStats).map(([pos, stats]) => {
    const position = parseInt(pos);
    const accuracy = stats.total > 0
      ? Math.round((stats.correct / stats.total) * 100)
      : 0;

    return {
      position,
      correct: stats.correct,
      total: stats.total,
      accuracy,
    };
  });
};

/**
 * Calculate recent performance comparison
 */
export const getRecentPerformance = async () => {
  const history = await getPredictionHistory();

  // Simulate accuracy calculations
  const last5 = history.slice(-5);
  const last10 = history.slice(-10);

  const calculateAccuracy = (entries: any[]) => {
    if (entries.length === 0) return 0;
    // Simulate (will be real when we have race results)
    return Math.floor(Math.random() * 30) + 60;
  };

  return {
    last5Accuracy: calculateAccuracy(last5),
    last10Accuracy: calculateAccuracy(last10),
    allTimeAccuracy: calculateAccuracy(history),
  };
};

/**
 * Get streak information
 */
export const getStreakInfo = async (profile: UserProfile) => {
  const history = await getPredictionHistory();

  // Calculate average streak
  let totalStreakSum = 0;
  let streakCount = 0;

  history.forEach((entry) => {
    if (entry.streak !== undefined) {
      totalStreakSum += entry.streak;
      streakCount++;
    }
  });

  const averageStreak = streakCount > 0
    ? Math.round(totalStreakSum / streakCount)
    : 0;

  return {
    current: profile.currentStreak,
    best: profile.longestStreak,
    averageStreak,
  };
};

/**
 * Get all analytics data
 */
export const getAnalyticsData = async (profile: UserProfile): Promise<AnalyticsData> => {
  try {
    console.log('📊 [ANALYTICS] Calculating analytics data...');

    const [
      performanceOverTime,
      positionAccuracy,
      recentPerformance,
      streakInfo,
    ] = await Promise.all([
      getPerformanceOverTime(),
      getPositionAccuracy(),
      getRecentPerformance(),
      getStreakInfo(profile),
    ]);

    console.log('✅ [ANALYTICS] Analytics data calculated');

    return {
      performanceOverTime,
      positionAccuracy,
      recentPerformance,
      streakInfo,
    };
  } catch (error) {
    console.error('❌ [ANALYTICS] Error calculating analytics:', error);
    throw error;
  }
};
