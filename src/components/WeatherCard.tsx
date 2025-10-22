import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WeatherData } from '../types';
import { getWeatherForTrack, getWeatherImpact } from '../services/weatherService';

interface WeatherCardProps {
  trackId: string;
  latitude: number;
  longitude: number;
  trackName: string;
}

export default function WeatherCard({ trackId, latitude, longitude, trackName }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeather();
  }, [trackId, latitude, longitude]);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWeatherForTrack(trackId, latitude, longitude);
      if (data) {
        setWeather(data);
      } else {
        setError('Unable to fetch weather data');
      }
    } catch (err) {
      setError('Failed to load weather');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#00d9ff" />
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      </View>
    );
  }

  if (error || !weather) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error || 'No weather data available'}</Text>
      </View>
    );
  }

  const impact = getWeatherImpact(weather);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weather Forecast</Text>
        <Text style={styles.location}>{trackName}</Text>
      </View>

      <View style={styles.currentWeather}>
        <View style={styles.tempContainer}>
          <Text style={styles.temperature}>{weather.temperature}°F</Text>
          <Text style={styles.conditions}>{weather.conditions}</Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Wind:</Text>
            <Text style={styles.detailValue}>{weather.windSpeed} mph</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rain Chance:</Text>
            <Text style={styles.detailValue}>{weather.precipitation}%</Text>
          </View>
        </View>
      </View>

      <View style={[
        styles.impactCard,
        impact.severity === 'high' ? styles.impactHigh :
        impact.severity === 'medium' ? styles.impactMedium :
        styles.impactLow
      ]}>
        <Text style={styles.impactTitle}>
          Race Impact: {impact.severity.toUpperCase()}
        </Text>
        {impact.factors.map((factor, index) => (
          <Text key={index} style={styles.impactFactor}>
            • {factor}
          </Text>
        ))}
      </View>

      {weather.forecast.length > 0 && (
        <View style={styles.forecast}>
          <Text style={styles.forecastTitle}>7-Day Forecast</Text>
          {weather.forecast.slice(0, 3).map((day, index) => {
            const date = new Date(day.date);
            return (
              <View key={index} style={styles.forecastDay}>
                <Text style={styles.forecastDate}>
                  {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text style={styles.forecastConditions}>{day.conditions}</Text>
                <Text style={styles.forecastTemp}>
                  {day.highTemp}° / {day.lowTemp}°
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1f3a',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: '#8892b0',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 12,
    color: '#8892b0',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    padding: 20,
  },
  currentWeather: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  tempContainer: {
    flex: 1,
  },
  temperature: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  conditions: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 4,
  },
  details: {
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8892b0',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  impactCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  impactLow: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  impactMedium: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  impactHigh: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  impactFactor: {
    fontSize: 12,
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 18,
  },
  forecast: {
    marginTop: 8,
  },
  forecastTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  forecastDay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f4a',
  },
  forecastDate: {
    fontSize: 12,
    color: '#8892b0',
    flex: 1,
  },
  forecastConditions: {
    fontSize: 12,
    color: '#ffffff',
    flex: 2,
  },
  forecastTemp: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
});
