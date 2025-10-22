/**
 * Supabase Edge Function: sync-schedule
 *
 * Syncs race schedule data from official sources
 * Detects changes and updates database
 *
 * Trigger: Scheduled (daily via pg_cron) or manual invocation
 *
 * Usage:
 *   POST https://your-project.supabase.co/functions/v1/sync-schedule
 *   Headers: Authorization: Bearer <anon-key>
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import {
  createSupabaseClient,
  fetchWithRetry,
  hasContentChanged,
  logSyncStart,
  logSyncComplete,
  checkRateLimit,
  errorResponse,
  successResponse,
  isValidDate,
  sanitizeString,
  type SyncResult,
  type DataChange,
} from '../_shared/utils.ts'

// ============================================================================
// Types
// ============================================================================

interface RaceScheduleItem {
  id: string; // e.g., "sx-2025-r01"
  name: string; // e.g., "Anaheim 1"
  series: string; // 'sx' or 'mx'
  round: number;
  date: string; // ISO date string
  trackId: string;
  status: string; // 'upcoming' or 'completed'
  venue?: string;
  city?: string;
  state?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const SOURCE_NAME = 'SupercrossLIVE Schedule';
const SOURCE_URL = 'https://www.supercrosslive.com/schedule';

// Backup sources for validation
const BACKUP_SOURCES = [
  'https://racerxonline.com/sx/2025/races',
  'https://mxgpresults.com/sx/2025/',
];

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  try {
    console.log('🏁 Starting schedule sync...');

    const supabase = createSupabaseClient();

    // Get source configuration
    const { data: source, error: sourceError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('name', SOURCE_NAME)
      .single();

    if (sourceError || !source) {
      return errorResponse('Data source not found', 404);
    }

    // Check if source is active
    if (!source.is_active) {
      return errorResponse('Data source is inactive', 403);
    }

    // Check rate limits
    const rateLimit = {
      requests: source.rate_limit_requests,
      period: source.rate_limit_period,
    };

    if (!checkRateLimit(source.id, rateLimit)) {
      return errorResponse('Rate limit exceeded', 429);
    }

    // Start sync logging
    const syncId = await logSyncStart(supabase, source.id, 'scheduled');

    let syncResult: SyncResult = {
      success: false,
      recordsFetched: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      changes: [],
    };

    try {
      // Fetch schedule data
      console.log(`📡 Fetching from ${SOURCE_URL}...`);
      const scheduleData = await fetchScheduleData(SOURCE_URL);

      syncResult.recordsFetched = scheduleData.length;
      console.log(`✅ Fetched ${scheduleData.length} races`);

      // Check for content changes
      const scheduleJson = JSON.stringify(scheduleData);
      const contentChanged = await hasContentChanged(
        supabase,
        source.id,
        SOURCE_URL,
        scheduleJson
      );

      if (!contentChanged) {
        console.log('ℹ️  No changes detected. Skipping update.');
        syncResult.success = true;
        await logSyncComplete(supabase, syncId, syncResult);
        return successResponse({
          message: 'No changes detected',
          recordsFetched: syncResult.recordsFetched,
        });
      }

      console.log('🔄 Changes detected. Processing updates...');

      // Process each race
      for (const race of scheduleData) {
        // Validate race data
        if (!validateRaceData(race)) {
          console.warn(`⚠️  Invalid race data:`, race);
          continue;
        }

        // Check if race exists
        const { data: existingRace } = await supabase
          .from('races')
          .select('*')
          .eq('id', race.id)
          .single();

        if (existingRace) {
          // Check for significant changes
          const changes = detectChanges(existingRace, race);

          if (changes.length > 0) {
            // Update race
            await supabase
              .from('races')
              .update({
                name: race.name,
                date: race.date,
                status: race.status,
                track_id: race.trackId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', race.id);

            syncResult.recordsUpdated++;
            syncResult.changes!.push(...changes);

            console.log(`📝 Updated race: ${race.name}`);
          }
        } else {
          // Insert new race
          await supabase
            .from('races')
            .insert({
              id: race.id,
              name: race.name,
              series: race.series,
              round: race.round,
              date: race.date,
              status: race.status,
              track_id: race.trackId,
            });

          syncResult.recordsInserted++;
          syncResult.changes!.push({
            entityType: 'race',
            entityId: race.id,
            changeType: 'created',
            significance: 'high',
            newValue: race.name,
          });

          console.log(`➕ Inserted new race: ${race.name}`);
        }
      }

      // Mark races as completed if date has passed
      const today = new Date().toISOString().split('T')[0];
      const { data: pastRaces } = await supabase
        .from('races')
        .select('id, name')
        .lt('date', today)
        .eq('status', 'upcoming');

      if (pastRaces && pastRaces.length > 0) {
        await supabase
          .from('races')
          .update({ status: 'completed' })
          .in('id', pastRaces.map(r => r.id));

        syncResult.recordsUpdated += pastRaces.length;
        console.log(`✅ Marked ${pastRaces.length} races as completed`);
      }

      syncResult.success = true;
      console.log('✅ Schedule sync completed successfully');

    } catch (error: any) {
      syncResult.error = error.message;
      console.error('❌ Sync failed:', error);
    }

    // Log completion
    await logSyncComplete(supabase, syncId, syncResult);

    if (syncResult.success) {
      return successResponse({
        message: 'Schedule sync completed',
        stats: {
          fetched: syncResult.recordsFetched,
          inserted: syncResult.recordsInserted,
          updated: syncResult.recordsUpdated,
          changesDetected: syncResult.changes!.length,
        },
      });
    } else {
      return errorResponse(syncResult.error || 'Sync failed');
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return errorResponse(error.message);
  }
})

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch schedule data from source
 * NOTE: This is a placeholder implementation.
 * Real implementation would parse HTML or call actual API
 */
async function fetchScheduleData(url: string): Promise<RaceScheduleItem[]> {
  // For now, return mock data structure
  // In production, this would scrape the website or call an API

  // Example using fetch and parsing (pseudo-code):
  /*
  const response = await fetchWithRetry(url);
  const html = await response.text();

  // Parse HTML to extract schedule (using DOMParser or regex)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract race data from DOM
  const raceElements = doc.querySelectorAll('.race-item');
  const races = Array.from(raceElements).map(parseRaceElement);

  return races;
  */

  // Mock data for demonstration
  const mockSchedule: RaceScheduleItem[] = [
    {
      id: 'sx-2025-r01',
      name: 'Anaheim 1',
      series: 'sx',
      round: 1,
      date: '2025-01-11',
      trackId: 'angel-stadium',
      status: 'completed',
      venue: 'Angel Stadium',
      city: 'Anaheim',
      state: 'CA',
    },
    {
      id: 'sx-2025-r02',
      name: 'San Diego',
      series: 'sx',
      round: 2,
      date: '2025-01-18',
      trackId: 'snapdragon-stadium',
      status: 'completed',
      venue: 'Snapdragon Stadium',
      city: 'San Diego',
      state: 'CA',
    },
    // More races would be fetched from actual source
  ];

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return mockSchedule;
}

// ============================================================================
// Data Validation
// ============================================================================

function validateRaceData(race: RaceScheduleItem): boolean {
  // Required fields
  if (!race.id || !race.name || !race.date) {
    return false;
  }

  // Valid date
  if (!isValidDate(race.date)) {
    return false;
  }

  // Valid series
  if (!['sx', 'mx'].includes(race.series)) {
    return false;
  }

  // Valid round number
  if (typeof race.round !== 'number' || race.round < 1 || race.round > 20) {
    return false;
  }

  // Valid status
  if (!['upcoming', 'completed'].includes(race.status)) {
    return false;
  }

  return true;
}

// ============================================================================
// Change Detection
// ============================================================================

function detectChanges(
  oldRace: any,
  newRace: RaceScheduleItem
): DataChange[] {
  const changes: DataChange[] = [];

  // Check date change (rescheduled race)
  if (oldRace.date !== newRace.date) {
    changes.push({
      entityType: 'race',
      entityId: newRace.id,
      changeType: 'rescheduled',
      fieldName: 'date',
      oldValue: oldRace.date,
      newValue: newRace.date,
      significance: 'critical', // Date changes are critical!
    });
  }

  // Check name change
  if (oldRace.name !== newRace.name) {
    changes.push({
      entityType: 'race',
      entityId: newRace.id,
      changeType: 'updated',
      fieldName: 'name',
      oldValue: oldRace.name,
      newValue: newRace.name,
      significance: 'medium',
    });
  }

  // Check venue change
  if (oldRace.track_id !== newRace.trackId) {
    changes.push({
      entityType: 'race',
      entityId: newRace.id,
      changeType: 'updated',
      fieldName: 'track_id',
      oldValue: oldRace.track_id,
      newValue: newRace.trackId,
      significance: 'high', // Venue changes are important
    });
  }

  // Check status change
  if (oldRace.status !== newRace.status) {
    changes.push({
      entityType: 'race',
      entityId: newRace.id,
      changeType: 'updated',
      fieldName: 'status',
      oldValue: oldRace.status,
      newValue: newRace.status,
      significance: 'medium',
    });
  }

  return changes;
}
