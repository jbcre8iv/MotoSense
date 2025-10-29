import { supabase } from './supabase';
import { Race, Season } from '../types';

export interface RaceInput {
  name: string;
  series: 'supercross' | 'motocross' | 'championship';
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
      season_year: 2025,
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

/**
 * Get the currently open race
 */
export const getCurrentRound = async (): Promise<Race | null> => {
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('status', 'open')
    .eq('is_simulation', true)
    .single();

  if (error) {
    console.log('[ADMIN SERVICE] No currently open round');
    return null;
  }

  return data;
};

/**
 * Progress to next round
 * - Closes current round
 * - Reveals results
 * - Opens next round
 */
export const progressRound = async (): Promise<{ success: boolean; message: string }> => {
  console.log('[ADMIN SERVICE] Progressing to next round...');

  // Get current open race
  const currentRace = await getCurrentRound();
  console.log('[ADMIN SERVICE] Current race:', currentRace?.id || 'none');

  // Get all races ordered by series and round
  const { data: allRaces, error: fetchError } = await supabase
    .from('races')
    .select('*')
    .eq('is_simulation', true)
    .order('date', { ascending: true });

  if (fetchError) {
    console.error('[ADMIN SERVICE] Fetch error:', fetchError);
    return { success: false, message: `Error fetching races: ${fetchError.message}` };
  }

  if (!allRaces) {
    console.error('[ADMIN SERVICE] No races found');
    return { success: false, message: 'No races found in database' };
  }

  console.log(`[ADMIN SERVICE] Found ${allRaces.length} simulation races`);
  console.log('[ADMIN SERVICE] Race statuses:', allRaces.map(r => ({ id: r.id, name: r.name, status: r.status })));

  // Find next race to open
  let nextRace: Race | null = null;

  if (!currentRace) {
    // No race open, open the first one
    console.log('[ADMIN SERVICE] No current race, looking for first upcoming race...');
    nextRace = allRaces.find(r => r.status === 'upcoming') || null;
    console.log('[ADMIN SERVICE] Next race to open:', nextRace?.id || 'none found');
  } else {
    // Close current race and mark as completed
    console.log('[ADMIN SERVICE] Closing current race:', currentRace.id);
    const { error: closeError } = await supabase
      .from('races')
      .update({
        status: 'completed',
        results_revealed_at: new Date().toISOString(),
      })
      .eq('id', currentRace.id);

    if (closeError) {
      console.error('[ADMIN SERVICE] Close error:', closeError);
      return { success: false, message: `Error closing current round: ${closeError.message}` };
    }

    // Find next upcoming race
    nextRace = allRaces.find(
      r => r.status === 'upcoming' && new Date(r.date) > new Date(currentRace.date)
    ) || null;
    console.log('[ADMIN SERVICE] Next race after current:', nextRace?.id || 'none found');
  }

  if (!nextRace) {
    console.log('[ADMIN SERVICE] No more rounds to open');
    return { success: false, message: 'No more rounds to open' };
  }

  // Open next race
  const now = new Date();
  const closesAt = new Date(now.getTime() + (nextRace.auto_progress_hours || 48) * 60 * 60 * 1000);

  console.log('[ADMIN SERVICE] Opening race:', nextRace.id, nextRace.name);
  const { error: openError, data: updateData } = await supabase
    .from('races')
    .update({
      status: 'open',
      opened_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
    })
    .eq('id', nextRace.id)
    .select();

  if (openError) {
    console.error('[ADMIN SERVICE] Open error:', openError);
    return { success: false, message: `Error opening next round: ${openError.message}` };
  }

  console.log('[ADMIN SERVICE] Race opened successfully:', updateData);

  return {
    success: true,
    message: `Opened ${nextRace.series} Round ${nextRace.round} - ${nextRace.name}`,
  };
};

/**
 * Go back one round (digress)
 * - Closes current round without marking complete
 * - Re-opens previous round
 */
export const digressRound = async (): Promise<{ success: boolean; message: string }> => {
  console.log('[ADMIN SERVICE] Digressing to previous round...');

  // Get current open race
  const currentRace = await getCurrentRound();

  if (!currentRace) {
    return { success: false, message: 'No round currently open' };
  }

  // Get all races ordered by date
  const { data: allRaces, error: fetchError } = await supabase
    .from('races')
    .select('*')
    .eq('is_simulation', true)
    .order('date', { ascending: true });

  if (fetchError || !allRaces) {
    return { success: false, message: 'Error fetching races' };
  }

  // Find previous completed race
  const previousRace = allRaces
    .filter(r => r.status === 'completed' && new Date(r.date) < new Date(currentRace.date))
    .pop(); // Get the last one (most recent)

  if (!previousRace) {
    return { success: false, message: 'No previous round to go back to' };
  }

  // Close current race (back to upcoming)
  const { error: closeError } = await supabase
    .from('races')
    .update({
      status: 'upcoming',
      opened_at: null,
      closes_at: null,
    })
    .eq('id', currentRace.id);

  if (closeError) {
    return { success: false, message: 'Error closing current round' };
  }

  // Re-open previous race
  const now = new Date();
  const closesAt = new Date(now.getTime() + (previousRace.auto_progress_hours || 48) * 60 * 60 * 1000);

  const { error: openError } = await supabase
    .from('races')
    .update({
      status: 'open',
      opened_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
      results_revealed_at: null, // Hide results again
    })
    .eq('id', previousRace.id);

  if (openError) {
    return { success: false, message: 'Error re-opening previous round' };
  }

  return {
    success: true,
    message: `Re-opened ${previousRace.series} Round ${previousRace.round} - ${previousRace.name}`,
  };
};

/**
 * Reset demo season - Set all demo races back to upcoming status
 * Used for beta testing to reset the season for a fresh start
 */
export const resetDemoSeason = async (): Promise<{ success: boolean; message: string }> => {
  console.log('[ADMIN SERVICE] Resetting demo season...');

  try {
    // Reset all simulation races to upcoming status
    const { error } = await supabase
      .from('races')
      .update({
        status: 'upcoming',
        opened_at: null,
        closes_at: null,
        results_revealed_at: null,
      })
      .eq('is_simulation', true);

    if (error) {
      console.error('[ADMIN SERVICE] Error resetting demo season:', error);
      return { success: false, message: `Error resetting season: ${error.message}` };
    }

    console.log('[ADMIN SERVICE] Demo season reset successfully');
    return { success: true, message: 'Demo season reset! All races are now upcoming.' };
  } catch (error: any) {
    console.error('[ADMIN SERVICE] Reset error:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
};

export const adminService = {
  getSeasons,
  getDemoSeason,
  createRace,
  updateRaceResults,
  getDemoRaces,
  deleteRace,
  getCurrentRound,
  progressRound,
  digressRound,
  resetDemoSeason,
};
