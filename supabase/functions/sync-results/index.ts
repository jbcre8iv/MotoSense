/**
 * Supabase Edge Function: sync-results
 *
 * Syncs race results data from official sources
 * Detects when results are posted and triggers score calculations
 *
 * Trigger: Every 2 hours on race days (Sat/Sun via pg_cron) or manual invocation
 *
 * Usage:
 *   POST https://your-project.supabase.co/functions/v1/sync-results
 *   Headers: Authorization: Bearer <service-role-key>
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
  sanitizeString,
  type SyncResult,
  type DataChange,
} from '../_shared/utils.ts'

// ============================================================================
// Types
// ============================================================================

interface RaceResultItem {
  raceId: string; // e.g., "sx-2025-r01"
  riderId: string; // e.g., "jett-lawrence"
  position: number; // 1-22
  points: number; // Championship points earned
  laps?: number;
  status: string; // 'finished', 'dnf', 'dns', 'dsq'
  totalTime?: string; // "20:15.234"
  bestLapTime?: string; // "00:45.123"
  gap?: string; // "+5.234" or "1 lap"
}

interface RaceWithResults {
  raceId: string;
  raceName: string;
  date: string;
  results: RaceResultItem[];
}

// ============================================================================
// Configuration
// ============================================================================

const SOURCE_NAME = 'SupercrossLIVE Results';
const SOURCE_URL = 'https://www.supercrosslive.com/results';

// Backup sources for validation
const BACKUP_SOURCES = [
  'https://racerxonline.com/sx/2025/results',
  'https://mxgpresults.com/sx/2025/',
];

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  try {
    console.log('🏁 Starting results sync...');

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
      // Fetch results data
      console.log(`📡 Fetching from ${SOURCE_URL}...`);
      const resultsData = await fetchResultsData(SOURCE_URL);

      const totalResults = resultsData.reduce((sum, race) => sum + race.results.length, 0);
      syncResult.recordsFetched = totalResults;
      console.log(`✅ Fetched results for ${resultsData.length} races (${totalResults} entries)`);

      // Check for content changes
      const resultsJson = JSON.stringify(resultsData);
      const contentChanged = await hasContentChanged(
        supabase,
        source.id,
        SOURCE_URL,
        resultsJson
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

      // Process each race with results
      for (const raceData of resultsData) {
        // Check if race exists
        const { data: existingRace } = await supabase
          .from('races')
          .select('id, has_results')
          .eq('id', raceData.raceId)
          .single();

        if (!existingRace) {
          console.warn(`⚠️  Race not found: ${raceData.raceId}`);
          continue;
        }

        const isNewResults = !existingRace.has_results;

        // Process each result
        for (const result of raceData.results) {
          // Validate result data
          if (!validateResultData(result)) {
            console.warn(`⚠️  Invalid result data:`, result);
            continue;
          }

          // Check if result exists
          const { data: existingResult } = await supabase
            .from('race_results')
            .select('*')
            .eq('race_id', result.raceId)
            .eq('rider_id', result.riderId)
            .single();

          if (existingResult) {
            // Check for changes
            const changes = detectResultChanges(existingResult, result);

            if (changes.length > 0) {
              // Update result
              await supabase
                .from('race_results')
                .update({
                  position: result.position,
                  points: result.points,
                  laps: result.laps,
                  status: result.status,
                  total_time: result.totalTime,
                  best_lap_time: result.bestLapTime,
                  gap: result.gap,
                  updated_at: new Date().toISOString(),
                })
                .eq('race_id', result.raceId)
                .eq('rider_id', result.riderId);

              syncResult.recordsUpdated++;
              syncResult.changes!.push(...changes);

              console.log(`📝 Updated result: ${result.riderId} in ${result.raceId}`);
            }
          } else {
            // Insert new result
            await supabase
              .from('race_results')
              .insert({
                race_id: result.raceId,
                rider_id: result.riderId,
                position: result.position,
                points: result.points,
                laps: result.laps,
                status: result.status,
                total_time: result.totalTime,
                best_lap_time: result.bestLapTime,
                gap: result.gap,
              });

            syncResult.recordsInserted++;

            console.log(`➕ Inserted result: ${result.riderId} P${result.position}`);
          }
        }

        // Mark race as having results
        if (isNewResults) {
          await supabase
            .from('races')
            .update({
              has_results: true,
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', raceData.raceId);

          syncResult.changes!.push({
            entityType: 'race',
            entityId: raceData.raceId,
            changeType: 'updated',
            fieldName: 'has_results',
            oldValue: 'false',
            newValue: 'true',
            significance: 'critical', // Results posted is critical!
          });

          console.log(`🏆 Results posted for: ${raceData.raceName}`);

          // Trigger score calculations for this race
          await triggerScoreCalculations(supabase, raceData.raceId);
        }
      }

      syncResult.success = true;
      console.log('✅ Results sync completed successfully');

    } catch (error: any) {
      syncResult.error = error.message;
      console.error('❌ Sync failed:', error);
    }

    // Log completion
    await logSyncComplete(supabase, syncId, syncResult);

    if (syncResult.success) {
      return successResponse({
        message: 'Results sync completed',
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
 * Fetch results data from source
 * NOTE: This is a placeholder implementation.
 * Real implementation would parse HTML or call actual API
 */
async function fetchResultsData(url: string): Promise<RaceWithResults[]> {
  // For now, return mock data structure
  // In production, this would scrape the website or call an API

  // Example using fetch and parsing (pseudo-code):
  /*
  const response = await fetchWithRetry(url);
  const html = await response.text();

  // Parse HTML to extract results
  // This would be specific to the website's structure
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract race results from DOM
  const raceElements = doc.querySelectorAll('.race-results');
  const races = Array.from(raceElements).map(parseRaceResults);

  return races;
  */

  // Mock data for demonstration
  const mockResults: RaceWithResults[] = [
    {
      raceId: 'sx-2025-r01',
      raceName: 'Anaheim 1',
      date: '2025-01-11',
      results: [
        {
          raceId: 'sx-2025-r01',
          riderId: 'jett-lawrence',
          position: 1,
          points: 26,
          laps: 20,
          status: 'finished',
          totalTime: '20:15.234',
          bestLapTime: '00:45.123',
          gap: '0.000',
        },
        {
          raceId: 'sx-2025-r01',
          riderId: 'chase-sexton',
          position: 2,
          points: 23,
          laps: 20,
          status: 'finished',
          totalTime: '20:20.456',
          bestLapTime: '00:45.678',
          gap: '+5.222',
        },
        {
          raceId: 'sx-2025-r01',
          riderId: 'cooper-webb',
          position: 3,
          points: 21,
          laps: 20,
          status: 'finished',
          totalTime: '20:25.789',
          bestLapTime: '00:46.012',
          gap: '+10.555',
        },
        // More results would be fetched from actual source
      ],
    },
    {
      raceId: 'sx-2025-r02',
      raceName: 'San Diego',
      date: '2025-01-18',
      results: [
        {
          raceId: 'sx-2025-r02',
          riderId: 'chase-sexton',
          position: 1,
          points: 26,
          laps: 20,
          status: 'finished',
          totalTime: '19:45.123',
          bestLapTime: '00:44.567',
          gap: '0.000',
        },
        {
          raceId: 'sx-2025-r02',
          riderId: 'jett-lawrence',
          position: 2,
          points: 23,
          laps: 20,
          status: 'finished',
          totalTime: '19:48.456',
          bestLapTime: '00:44.890',
          gap: '+3.333',
        },
        {
          raceId: 'sx-2025-r02',
          riderId: 'eli-tomac',
          position: 3,
          points: 21,
          laps: 20,
          status: 'finished',
          totalTime: '19:52.789',
          bestLapTime: '00:45.234',
          gap: '+7.666',
        },
      ],
    },
  ];

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return mockResults;
}

// ============================================================================
// Data Validation
// ============================================================================

function validateResultData(result: RaceResultItem): boolean {
  // Required fields
  if (!result.raceId || !result.riderId) {
    return false;
  }

  // Valid position
  if (typeof result.position !== 'number' || result.position < 1 || result.position > 22) {
    return false;
  }

  // Valid points
  if (typeof result.points !== 'number' || result.points < 0 || result.points > 26) {
    return false;
  }

  // Valid status
  const validStatuses = ['finished', 'dnf', 'dns', 'dsq'];
  if (!validStatuses.includes(result.status)) {
    return false;
  }

  // If finished, should have laps
  if (result.status === 'finished' && (!result.laps || result.laps < 1)) {
    return false;
  }

  return true;
}

// ============================================================================
// Change Detection
// ============================================================================

function detectResultChanges(
  oldResult: any,
  newResult: RaceResultItem
): DataChange[] {
  const changes: DataChange[] = [];

  // Check position change (significant!)
  if (oldResult.position !== newResult.position) {
    changes.push({
      entityType: 'result',
      entityId: `${newResult.raceId}-${newResult.riderId}`,
      changeType: 'updated',
      fieldName: 'position',
      oldValue: String(oldResult.position),
      newValue: String(newResult.position),
      significance: 'high', // Position changes are important
    });
  }

  // Check points change
  if (oldResult.points !== newResult.points) {
    changes.push({
      entityType: 'result',
      entityId: `${newResult.raceId}-${newResult.riderId}`,
      changeType: 'updated',
      fieldName: 'points',
      oldValue: String(oldResult.points),
      newValue: String(newResult.points),
      significance: 'high',
    });
  }

  // Check status change (e.g., finished → dsq)
  if (oldResult.status !== newResult.status) {
    changes.push({
      entityType: 'result',
      entityId: `${newResult.raceId}-${newResult.riderId}`,
      changeType: 'updated',
      fieldName: 'status',
      oldValue: oldResult.status,
      newValue: newResult.status,
      significance: 'critical', // Status changes can affect standings
    });
  }

  // Time changes are informational
  if (oldResult.total_time !== newResult.totalTime) {
    changes.push({
      entityType: 'result',
      entityId: `${newResult.raceId}-${newResult.riderId}`,
      changeType: 'updated',
      fieldName: 'total_time',
      oldValue: oldResult.total_time,
      newValue: newResult.totalTime,
      significance: 'low',
    });
  }

  return changes;
}

// ============================================================================
// Score Calculation Trigger
// ============================================================================

/**
 * Triggers prediction score calculations for a race
 * This calls the existing calculate_prediction_scores function
 */
async function triggerScoreCalculations(supabase: any, raceId: string) {
  try {
    console.log(`🎯 Triggering score calculations for ${raceId}...`);

    // Call the existing RPC function that calculates scores
    const { error } = await supabase
      .rpc('calculate_prediction_scores', {
        p_race_id: raceId
      });

    if (error) {
      console.error(`❌ Score calculation failed for ${raceId}:`, error);
      return;
    }

    console.log(`✅ Score calculations completed for ${raceId}`);

    // Update leaderboard
    const { error: leaderboardError } = await supabase
      .rpc('update_leaderboard');

    if (leaderboardError) {
      console.error('❌ Leaderboard update failed:', leaderboardError);
      return;
    }

    console.log('✅ Leaderboard updated');

  } catch (error: any) {
    console.error('❌ Error triggering calculations:', error);
  }
}
