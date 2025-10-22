import axios from 'axios';
import { WeatherData, WeatherForecast } from '../types';

const WEATHER_API_BASE = 'https://api.weather.gov';

export interface WeatherAPIResponse {
  properties: {
    periods: Array<{
      number: number;
      name: string;
      startTime: string;
      temperature: number;
      temperatureUnit: string;
      shortForecast: string;
      detailedForecast: string;
      windSpeed: string;
      probabilityOfPrecipitation: {
        value: number | null;
      };
    }>;
  };
}

/**
 * Get grid points for a given latitude and longitude
 * This is required before fetching the forecast
 */
async function getGridPoints(latitude: number, longitude: number) {
  try {
    const response = await axios.get(
      `${WEATHER_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      {
        headers: {
          'User-Agent': 'MotoSense App (educational racing predictions)',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching grid points:', error);
    throw error;
  }
}

/**
 * Fetch weather forecast for a given track location
 */
export async function getWeatherForTrack(
  trackId: string,
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  try {
    // First, get the grid points
    const pointsData = await getGridPoints(latitude, longitude);
    const forecastUrl = pointsData.properties.forecast;

    // Then fetch the forecast
    const forecastResponse = await axios.get<WeatherAPIResponse>(forecastUrl, {
      headers: {
        'User-Agent': 'MotoSense App (educational racing predictions)',
      },
    });

    const periods = forecastResponse.data.properties.periods;

    if (!periods || periods.length === 0) {
      return null;
    }

    // Current conditions (first period)
    const current = periods[0];

    // Parse wind speed (e.g., "10 to 15 mph" -> 12.5)
    const windSpeedMatch = current.windSpeed.match(/(\d+)/);
    const windSpeed = windSpeedMatch ? parseInt(windSpeedMatch[1]) : 0;

    // Build forecast array (next 7 days)
    const forecast: WeatherForecast[] = [];
    for (let i = 0; i < Math.min(periods.length, 14); i += 2) {
      // Every 2 periods typically covers a day (day + night)
      const period = periods[i];
      const nextPeriod = periods[i + 1];

      forecast.push({
        date: period.startTime,
        highTemp: period.temperature,
        lowTemp: nextPeriod?.temperature || period.temperature,
        conditions: period.shortForecast,
        precipChance: period.probabilityOfPrecipitation?.value || 0,
      });
    }

    const weatherData: WeatherData = {
      trackId,
      timestamp: new Date().toISOString(),
      temperature: current.temperature,
      conditions: current.shortForecast,
      windSpeed,
      humidity: 0, // Weather.gov doesn't provide humidity in forecast endpoint
      precipitation: current.probabilityOfPrecipitation?.value || 0,
      forecast: forecast.slice(0, 7), // Only keep 7 days
    };

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

/**
 * Get weather impact analysis for racing
 */
export function getWeatherImpact(weather: WeatherData): {
  severity: 'low' | 'medium' | 'high';
  factors: string[];
} {
  const factors: string[] = [];
  let severityScore = 0;

  // Rain analysis
  if (weather.precipitation > 70) {
    factors.push('High chance of rain - expect slower lap times and increased crashes');
    severityScore += 3;
  } else if (weather.precipitation > 40) {
    factors.push('Moderate rain chance - track may become slippery');
    severityScore += 2;
  }

  // Temperature analysis
  if (weather.temperature > 90) {
    factors.push('High temperature - may affect tire grip and rider endurance');
    severityScore += 2;
  } else if (weather.temperature < 40) {
    factors.push('Cold conditions - harder tire compounds, reduced grip');
    severityScore += 2;
  }

  // Wind analysis
  if (weather.windSpeed > 20) {
    factors.push('Strong winds - may affect jumps and rider control');
    severityScore += 2;
  } else if (weather.windSpeed > 15) {
    factors.push('Moderate winds - slight impact on certain sections');
    severityScore += 1;
  }

  // Conditions analysis
  if (weather.conditions.toLowerCase().includes('rain') ||
      weather.conditions.toLowerCase().includes('storm')) {
    factors.push('Wet conditions expected - major impact on race strategy');
    severityScore += 3;
  }

  if (factors.length === 0) {
    factors.push('Favorable racing conditions');
  }

  const severity = severityScore >= 5 ? 'high' : severityScore >= 3 ? 'medium' : 'low';

  return { severity, factors };
}
