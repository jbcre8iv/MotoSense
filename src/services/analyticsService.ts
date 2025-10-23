/**
 * Analytics Service - Phase 3 Enhancement
 *
 * Advanced analytics powered by real Supabase data
 * Provides insights, trends, and performance breakdowns
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import { supabase } from './supabase';

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

export interface RiderPerformance {
  riderId: string;
  riderName: string;
  riderNumber: string;
  timesPredicted: number;
  timesCorrect: number;
  accuracy: number;
  totalPoints: number;
}

export interface TrackPerformance {
  trackName: string;
  trackLocation: string;
  raceCount: number;
  totalPoints: number;
  averagePoints: number;
  accuracy: number;
}

export interface UserStats {
  totalPredictions: number;
  totalPoints: number;
  averagePoints: number;
  overallAccuracy: number;
  bestRacePoints: number;
  worstRacePoints: number;
  perfectPredictions: number;
  currentStreak: number;
  longestStreak: number;
  bonusPoints: number;
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
 * Get comprehensive user statistics from Supabase
 */
export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    const { data: scores, error } = await supabase
      .from('prediction_scores')
      .select('points_earned, bonus_points')
      .eq('user_id', userId);

    if (error || !scores || scores.length === 0) return null;

    const totalPredictions = scores.length;
    const totalPoints = scores.reduce((sum, s) => sum + (s.points_earned || 0), 0);
    const bonusPoints = scores.reduce((sum, s) => sum + (s.bonus_points || 0), 0);
    const averagePoints = totalPoints / totalPredictions;

    const pointsArray = scores.map(s => s.points_earned || 0);
    const bestRacePoints = Math.max(...pointsArray);
    const worstRacePoints = Math.min(...pointsArray);
    const perfectPredictions = scores.filter(s => s.points_earned >= 50).length;

    // Calculate accuracy (predictions earning any points)
    const scoringPredictions = scores.filter(s => s.points_earned > 0).length;
    const overallAccuracy = (scoringPredictions / totalPredictions) * 100;

    // Calculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(scores);

    return {
      totalPredictions,
      totalPoints,
      averagePoints,
      overallAccuracy,
      bestRacePoints,
      worstRacePoints,
      perfectPredictions,
      currentStreak,
      longestStreak,
      bonusPoints
    };
  } catch (error) {
    console.error('[ANALYTICS] Error fetching user stats:', error);
    return null;
  }
};

/**
 * Calculate current and longest streaks
 */
const calculateStreaks = (scores: any[]): { currentStreak: number; longestStreak: number } => {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  scores.forEach((score, index) => {
    const hasPoints = (score.points_earned || 0) > 0;

    if (hasPoints) {
      tempStreak++;
      if (index === 0) currentStreak = tempStreak;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (index === 0) currentStreak = 0;
      tempStreak = 0;
    }
  });

  return { currentStreak, longestStreak };
};

/**
 * Get rider prediction performance statistics
 */
export const getRiderPerformance = async (userId: string): Promise<RiderPerformance[]> => {
  try {
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('predictions, race_id')
      .eq('user_id', userId);

    if (predError || !predictions) return [];

    const { data: results, error: resultsError } = await supabase
      .from('race_results')
      .select('race_id, results');

    if (resultsError || !results) return [];

    const resultsMap = new Map(results.map(r => [r.race_id, r.results]));

    // Track rider stats
    const riderStats = new Map<string, {
      predicted: number;
      correct: number;
      points: number;
    }>();

    predictions.forEach(pred => {
      const top5 = pred.predictions?.top5 || [];
      const raceResults = resultsMap.get(pred.race_id);

      top5.forEach((riderId: string, index: number) => {
        const stats = riderStats.get(riderId) || { predicted: 0, correct: 0, points: 0 };
        stats.predicted++;

        if (raceResults && Array.isArray(raceResults)) {
          const actualPosition = raceResults.indexOf(riderId);
          if (actualPosition === index) {
            stats.correct++;
            stats.points += 10;
          } else if (actualPosition >= 0 && actualPosition < 5) {
            stats.points += 3;
          }
        }

        riderStats.set(riderId, stats);
      });
    });

    // Get rider details
    const riderIds = Array.from(riderStats.keys());
    const { data: riders } = await supabase
      .from('riders')
      .select('id, name, number')
      .in('id', riderIds);

    if (!riders) return [];

    return riders.map(rider => {
      const stats = riderStats.get(rider.id)!;
      return {
        riderId: rider.id,
        riderName: rider.name,
        riderNumber: rider.number,
        timesPredicted: stats.predicted,
        timesCorrect: stats.correct,
        accuracy: (stats.correct / stats.predicted) * 100,
        totalPoints: stats.points
      };
    }).sort((a, b) => b.accuracy - a.accuracy);
  } catch (error) {
    console.error('[ANALYTICS] Error fetching rider performance:', error);
    return [];
  }
};

/**
 * Get track performance statistics
 */
export const getTrackPerformance = async (userId: string): Promise<TrackPerformance[]> => {
  try {
    const { data, error } = await supabase
      .from('prediction_scores')
      .select(`
        points_earned,
        race:races(track_name, track_location)
      `)
      .eq('user_id', userId);

    if (error || !data) return [];

    const trackStats = new Map<string, {
      location: string;
      races: number;
      totalPoints: number;
      correctPredictions: number;
    }>();

    data.forEach(score => {
      if (!score.race?.track_name) return;

      const trackName = score.race.track_name;
      const stats = trackStats.get(trackName) || {
        location: score.race.track_location || 'Unknown',
        races: 0,
        totalPoints: 0,
        correctPredictions: 0
      };

      stats.races++;
      stats.totalPoints += score.points_earned || 0;
      if (score.points_earned > 0) stats.correctPredictions++;

      trackStats.set(trackName, stats);
    });

    const tracks: TrackPerformance[] = [];
    trackStats.forEach((stats, trackName) => {
      const averagePoints = stats.totalPoints / stats.races;
      tracks.push({
        trackName,
        trackLocation: stats.location,
        raceCount: stats.races,
        totalPoints: stats.totalPoints,
        averagePoints,
        accuracy: (stats.correctPredictions / stats.races) * 100
      });
    });

    return tracks.sort((a, b) => b.averagePoints - a.averagePoints);
  } catch (error) {
    console.error('[ANALYTICS] Error fetching track performance:', error);
    return [];
  }
};

/**
 * Get insights based on user's analytics
 */
export const getInsights = async (userId: string): Promise<string[]> => {
  const insights: string[] = [];

  try {
    const stats = await getUserStats(userId);
    const riders = await getRiderPerformance(userId);
    const tracks = await getTrackPerformance(userId);

    if (!stats) return insights;

    // Accuracy insight
    if (stats.overallAccuracy > 70) {
      insights.push(`🎯 Excellent ${stats.overallAccuracy.toFixed(1)}% accuracy!`);
    } else if (stats.overallAccuracy > 50) {
      insights.push(`📊 ${stats.overallAccuracy.toFixed(1)}% accuracy - room to grow!`);
    }

    // Streak insight
    if (stats.currentStreak >= 3) {
      insights.push(`🔥 On a ${stats.currentStreak}-race streak!`);
    }

    // Perfect predictions
    if (stats.perfectPredictions > 0) {
      insights.push(`💯 ${stats.perfectPredictions} perfect prediction${stats.perfectPredictions > 1 ? 's' : ''}!`);
    }

    // Top rider
    if (riders.length > 0 && riders[0].accuracy > 60) {
      insights.push(`⭐ Best at predicting #${riders[0].riderNumber} ${riders[0].riderName}`);
    }

    // Top track
    if (tracks.length > 0 && tracks[0].averagePoints > 30) {
      insights.push(`🏁 Your best track: ${tracks[0].trackName}`);
    }

    // Bonus points
    if (stats.bonusPoints > 0) {
      insights.push(`✨ Earned ${stats.bonusPoints} bonus points!`);
    }

    return insights;
  } catch (error) {
    console.error('[ANALYTICS] Error generating insights:', error);
    return insights;
  }
};

/**
 * Legacy: Get user's performance history from AsyncStorage
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
 * Calculate performance metrics over time (Supabase-powered)
 */
export const getPerformanceOverTime = async (userId?: string): Promise<PerformanceOverTime> => {
  try {
    if (!userId) {
      // Fall back to legacy AsyncStorage method
      return await getPerformanceOverTimeLegacy();
    }

    const { data: scores, error } = await supabase
      .from('prediction_scores')
      .select(`
        points_earned,
        race:races(date)
      `)
      .eq('user_id', userId)
      .order('race.date', { ascending: true });

    if (error || !scores) {
      return { accuracy: [], points: [], predictions: [] };
    }

    // Group by week
    const weekGroups = new Map<string, {
      totalPoints: number;
      scoringPredictions: number;
      totalPredictions: number;
    }>();

    scores.forEach(score => {
      if (!score.race?.date) return;

      const date = new Date(score.race.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const existing = weekGroups.get(weekKey) || {
        totalPoints: 0,
        scoringPredictions: 0,
        totalPredictions: 0
      };

      existing.totalPoints += score.points_earned || 0;
      existing.totalPredictions++;
      if (score.points_earned > 0) existing.scoringPredictions++;

      weekGroups.set(weekKey, existing);
    });

    // Convert to arrays (last 7 weeks)
    const weeks = Array.from(weekGroups.entries()).slice(-7);

    const accuracy: PerformanceDataPoint[] = weeks.map(([date, stats]) => ({
      date,
      value: (stats.scoringPredictions / stats.totalPredictions) * 100,
      label: `${((stats.scoringPredictions / stats.totalPredictions) * 100).toFixed(0)}%`
    }));

    const points: PerformanceDataPoint[] = weeks.map(([date, stats]) => ({
      date,
      value: stats.totalPoints,
      label: `${stats.totalPoints}pts`
    }));

    const predictions: PerformanceDataPoint[] = weeks.map(([date, stats]) => ({
      date,
      value: stats.totalPredictions,
      label: `${stats.totalPredictions}`
    }));

    return { accuracy, points, predictions };
  } catch (error) {
    console.error('[ANALYTICS] Error fetching performance over time:', error);
    return { accuracy: [], points: [], predictions: [] };
  }
};

/**
 * Legacy: Calculate performance metrics over time from AsyncStorage
 */
const getPerformanceOverTimeLegacy = async (): Promise<PerformanceOverTime> => {
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
 * Calculate accuracy by position (Supabase-powered)
 */
export const getPositionAccuracy = async (userId?: string): Promise<PositionAccuracy[]> => {
  if (!userId) {
    // Fall back to legacy method
    return await getPositionAccuracyLegacy();
  }

  try {
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('predictions, race_id')
      .eq('user_id', userId);

    if (predError || !predictions) {
      return getEmptyPositionStats();
    }

    const { data: results, error: resultsError } = await supabase
      .from('race_results')
      .select('race_id, results');

    if (resultsError || !results) {
      return getEmptyPositionStats();
    }

    const resultsMap = new Map(results.map(r => [r.race_id, r.results]));

    // Track accuracy by position
    const positionStats = Array(5).fill(null).map(() => ({
      correct: 0,
      total: 0
    }));

    predictions.forEach(pred => {
      const top5 = pred.predictions?.top5 || [];
      const raceResults = resultsMap.get(pred.race_id);

      if (!raceResults || !Array.isArray(raceResults)) return;

      top5.forEach((riderId: string, index: number) => {
        positionStats[index].total++;
        if (raceResults[index] === riderId) {
          positionStats[index].correct++;
        }
      });
    });

    return positionStats.map((stats, index) => ({
      position: index + 1,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
    }));
  } catch (error) {
    console.error('[ANALYTICS] Error fetching position accuracy:', error);
    return getEmptyPositionStats();
  }
};

/**
 * Get empty position stats structure
 */
const getEmptyPositionStats = (): PositionAccuracy[] => {
  return Array(5).fill(null).map((_, index) => ({
    position: index + 1,
    correct: 0,
    total: 0,
    accuracy: 0
  }));
};

/**
 * Legacy: Calculate accuracy by position from AsyncStorage
 */
const getPositionAccuracyLegacy = async (): Promise<PositionAccuracy[]> => {
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
