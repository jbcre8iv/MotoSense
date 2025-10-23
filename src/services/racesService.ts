import { supabase } from './supabase';
import { Race } from '../types';

/**
 * Races Service - Fetch and manage race data
 */

/**
 * Get all races from database
 */
export const getRaces = async (): Promise<Race[]> => {
  console.log('[RACES SERVICE] Fetching all races');

  const { data, error } = await supabase
    .from('races')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('[RACES SERVICE] Error fetching races:', error);
    throw error;
  }

  // Map database fields to Race interface
  const races: Race[] = (data || []).map((race: any) => ({
    id: race.id,
    name: race.name,
    series: race.series,
    trackId: race.track_name, // Using track_name as trackId for now
    date: race.date,
    round: race.round,
    type: 'main', // Default type since it's not in database
    status: 'upcoming', // Default status since it's not in database
    season_id: race.season_id,
    is_simulation: race.is_simulation,
    actual_results: race.actual_results,
    results_revealed_at: race.results_revealed_at,
  }));

  console.log(`[RACES SERVICE] Fetched ${races.length} races`);
  return races;
};

/**
 * Get demo/simulation races only
 */
export const getDemoRaces = async (): Promise<Race[]> => {
  console.log('[RACES SERVICE] Fetching demo races');

  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('is_simulation', true)
    .order('date', { ascending: true });

  if (error) {
    console.error('[RACES SERVICE] Error fetching demo races:', error);
    throw error;
  }

  const races: Race[] = (data || []).map((race: any) => ({
    id: race.id,
    name: race.name,
    series: race.series,
    trackId: race.track_name,
    date: race.date,
    round: race.round,
    type: 'main',
    status: 'upcoming',
    season_id: race.season_id,
    is_simulation: race.is_simulation,
    actual_results: race.actual_results,
    results_revealed_at: race.results_revealed_at,
  }));

  console.log(`[RACES SERVICE] Fetched ${races.length} demo races`);
  return races;
};

/**
 * Get upcoming races
 */
export const getUpcomingRaces = async (): Promise<Race[]> => {
  console.log('[RACES SERVICE] Fetching upcoming races');

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('races')
    .select('*')
    .gte('date', now)
    .order('date', { ascending: true });

  if (error) {
    console.error('[RACES SERVICE] Error fetching upcoming races:', error);
    throw error;
  }

  const races: Race[] = (data || []).map((race: any) => ({
    id: race.id,
    name: race.name,
    series: race.series,
    trackId: race.track_name,
    date: race.date,
    round: race.round,
    type: 'main',
    status: 'upcoming',
    season_id: race.season_id,
    is_simulation: race.is_simulation,
    actual_results: race.actual_results,
    results_revealed_at: race.results_revealed_at,
  }));

  console.log(`[RACES SERVICE] Fetched ${races.length} upcoming races`);
  return races;
};

/**
 * Get single race by ID
 */
export const getRaceById = async (raceId: string): Promise<Race | null> => {
  console.log('[RACES SERVICE] Fetching race:', raceId);

  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('id', raceId)
    .single();

  if (error) {
    console.error('[RACES SERVICE] Error fetching race:', error);
    return null;
  }

  if (!data) return null;

  const race: Race = {
    id: data.id,
    name: data.name,
    series: data.series,
    trackId: data.track_name,
    date: data.date,
    round: data.round,
    type: 'main',
    status: 'upcoming',
    season_id: data.season_id,
    is_simulation: data.is_simulation,
    actual_results: data.actual_results,
    results_revealed_at: data.results_revealed_at,
  };

  return race;
};

export const racesService = {
  getRaces,
  getDemoRaces,
  getUpcomingRaces,
  getRaceById,
};
