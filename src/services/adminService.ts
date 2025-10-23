import { supabase } from './supabase';
import { Race, Season } from '../types';

export interface RaceInput {
  name: string;
  series: 'supercross' | 'motocross' | 'arenacross';
  trackName?: string;
  trackLocation?: string;
  date: string; // ISO format
  round: number;
  type: 'practice' | 'qualifying' | 'heat' | 'main';
  status: 'upcoming' | 'live' | 'completed';
  season_id: string;
  is_simulation: boolean;
  actual_results?: {
    [className: string]: Array<{
      riderId: string;
      position: number;
      points?: number;
    }>;
  };
}

/**
 * Admin Service - Manual data entry for demo mode
 * Purpose: Allow manual entry of 2025 season races for beta testing
 */

/**
 * Get all seasons
 */
export const getSeasons = async (): Promise<Season[]> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('year', { ascending: false });

  if (error) {
    console.error('[ADMIN SERVICE] Error fetching seasons:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get demo season (2025)
 */
export const getDemoSeason = async (): Promise<Season | null> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'demo')
    .single();

  if (error) {
    console.error('[ADMIN SERVICE] Error fetching demo season:', error);
    return null;
  }

  return data;
};

/**
 * Create a new race (manual entry)
 */
export const createRace = async (raceData: RaceInput): Promise<Race> => {
  console.log('[ADMIN SERVICE] Creating race:', raceData);

  const { data, error } = await supabase
    .from('races')
    .insert([{
      name: raceData.name,
      series: raceData.series,
      track_name: raceData.trackName || raceData.name,
      track_location: raceData.trackLocation || 'TBD',
      date: raceData.date,
      round: raceData.round,
      season_id: raceData.season_id,
      is_simulation: raceData.is_simulation,
      actual_results: raceData.actual_results || null,
      results_revealed_at: null,
    }])
    .select()
    .single();

  if (error) {
    console.error('[ADMIN SERVICE] Error creating race:', error);
    throw error;
  }

  console.log('[ADMIN SERVICE] Race created successfully:', data);
  return data;
};

/**
 * Update race results (for demo mode reveals)
 */
export const updateRaceResults = async (
  raceId: string,
  actualResults: {
    [className: string]: Array<{
      riderId: string;
      position: number;
      points?: number;
    }>;
  }
): Promise<void> => {
  console.log('[ADMIN SERVICE] Updating race results for:', raceId);

  const { error } = await supabase
    .from('races')
    .update({
      actual_results: actualResults,
      status: 'completed',
    })
    .eq('id', raceId);

  if (error) {
    console.error('[ADMIN SERVICE] Error updating race results:', error);
    throw error;
  }

  console.log('[ADMIN SERVICE] Race results updated successfully');
};

/**
 * Get all demo races
 */
export const getDemoRaces = async (): Promise<Race[]> => {
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('is_simulation', true)
    .order('date', { ascending: true });

  if (error) {
    console.error('[ADMIN SERVICE] Error fetching demo races:', error);
    throw error;
  }

  return data || [];
};

/**
 * Delete a race (admin only)
 */
export const deleteRace = async (raceId: string): Promise<void> => {
  console.log('[ADMIN SERVICE] Deleting race:', raceId);

  const { error } = await supabase
    .from('races')
    .delete()
    .eq('id', raceId);

  if (error) {
    console.error('[ADMIN SERVICE] Error deleting race:', error);
    throw error;
  }

  console.log('[ADMIN SERVICE] Race deleted successfully');
};

export const adminService = {
  getSeasons,
  getDemoSeason,
  createRace,
  updateRaceResults,
  getDemoRaces,
  deleteRace,
};
