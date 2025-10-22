/**
 * Supabase Edge Function: sync-riders
 *
 * Syncs rider and team data from official sources
 * Updates rider information including numbers, teams, and status
 *
 * Trigger: Weekly (Monday mornings via pg_cron) or manual invocation
 *
 * Usage:
 *   POST https://your-project.supabase.co/functions/v1/sync-riders
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

interface RiderDataItem {
  id: string; // e.g., "jett-lawrence"
  firstName: string;
  lastName: string;
  number: number; // Race number
  team: string;
  series: string; // 'sx', 'mx', or 'both'
  nationality: string;
  birthDate?: string;
  status: string; // 'active', 'injured', 'retired'
  injuryDetails?: string;
  photoUrl?: string;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const SOURCE_NAME = 'SupercrossLIVE Riders';
const SOURCE_URL = 'https://www.supercrosslive.com/riders';

// Backup sources for validation
const BACKUP_SOURCES = [
  'https://racerxonline.com/riders',
  'https://www.amasupercross.com/riders',
];

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  try {
    console.log('🏁 Starting riders sync...');

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
      // Fetch rider data
      console.log(`📡 Fetching from ${SOURCE_URL}...`);
      const ridersData = await fetchRidersData(SOURCE_URL);

      syncResult.recordsFetched = ridersData.length;
      console.log(`✅ Fetched ${ridersData.length} riders`);

      // Check for content changes
      const ridersJson = JSON.stringify(ridersData);
      const contentChanged = await hasContentChanged(
        supabase,
        source.id,
        SOURCE_URL,
        ridersJson
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

      // Process each rider
      for (const rider of ridersData) {
        // Validate rider data
        if (!validateRiderData(rider)) {
          console.warn(`⚠️  Invalid rider data:`, rider);
          continue;
        }

        // Check if rider exists
        const { data: existingRider } = await supabase
          .from('riders')
          .select('*')
          .eq('id', rider.id)
          .single();

        if (existingRider) {
          // Check for significant changes
          const changes = detectRiderChanges(existingRider, rider);

          if (changes.length > 0) {
            // Update rider
            await supabase
              .from('riders')
              .update({
                first_name: rider.firstName,
                last_name: rider.lastName,
                number: rider.number,
                team: rider.team,
                series: rider.series,
                nationality: rider.nationality,
                birth_date: rider.birthDate,
                status: rider.status,
                injury_details: rider.injuryDetails,
                photo_url: rider.photoUrl,
                social_media: rider.socialMedia,
                updated_at: new Date().toISOString(),
              })
              .eq('id', rider.id);

            syncResult.recordsUpdated++;
            syncResult.changes!.push(...changes);

            console.log(`📝 Updated rider: ${rider.firstName} ${rider.lastName}`);
          }
        } else {
          // Insert new rider
          await supabase
            .from('riders')
            .insert({
              id: rider.id,
              first_name: rider.firstName,
              last_name: rider.lastName,
              number: rider.number,
              team: rider.team,
              series: rider.series,
              nationality: rider.nationality,
              birth_date: rider.birthDate,
              status: rider.status,
              injury_details: rider.injuryDetails,
              photo_url: rider.photoUrl,
              social_media: rider.socialMedia,
            });

          syncResult.recordsInserted++;
          syncResult.changes!.push({
            entityType: 'rider',
            entityId: rider.id,
            changeType: 'created',
            significance: 'medium',
            newValue: `${rider.firstName} ${rider.lastName}`,
          });

          console.log(`➕ Inserted new rider: ${rider.firstName} ${rider.lastName}`);
        }
      }

      syncResult.success = true;
      console.log('✅ Riders sync completed successfully');

    } catch (error: any) {
      syncResult.error = error.message;
      console.error('❌ Sync failed:', error);
    }

    // Log completion
    await logSyncComplete(supabase, syncId, syncResult);

    if (syncResult.success) {
      return successResponse({
        message: 'Riders sync completed',
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
 * Fetch rider data from source
 * NOTE: This is a placeholder implementation.
 * Real implementation would parse HTML or call actual API
 */
async function fetchRidersData(url: string): Promise<RiderDataItem[]> {
  // For now, return mock data structure
  // In production, this would scrape the website or call an API

  // Example using fetch and parsing (pseudo-code):
  /*
  const response = await fetchWithRetry(url);
  const html = await response.text();

  // Parse HTML to extract rider data
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract rider data from DOM
  const riderElements = doc.querySelectorAll('.rider-card');
  const riders = Array.from(riderElements).map(parseRiderElement);

  return riders;
  */

  // Mock data for demonstration
  const mockRiders: RiderDataItem[] = [
    {
      id: 'jett-lawrence',
      firstName: 'Jett',
      lastName: 'Lawrence',
      number: 18,
      team: 'Team Honda HRC',
      series: 'both',
      nationality: 'Australia',
      birthDate: '2003-11-06',
      status: 'active',
      photoUrl: 'https://example.com/riders/jett-lawrence.jpg',
      socialMedia: {
        instagram: '@jettlawrence',
        twitter: '@Jett_Lawrence',
      },
    },
    {
      id: 'chase-sexton',
      firstName: 'Chase',
      lastName: 'Sexton',
      number: 23,
      team: 'Red Bull KTM Factory Racing',
      series: 'both',
      nationality: 'USA',
      birthDate: '1999-09-23',
      status: 'active',
      photoUrl: 'https://example.com/riders/chase-sexton.jpg',
      socialMedia: {
        instagram: '@chasesexton',
        twitter: '@ChaseSexton23',
      },
    },
    {
      id: 'cooper-webb',
      firstName: 'Cooper',
      lastName: 'Webb',
      number: 1,
      team: 'Monster Energy Star Racing Yamaha',
      series: 'sx',
      nationality: 'USA',
      birthDate: '1996-06-21',
      status: 'active',
      photoUrl: 'https://example.com/riders/cooper-webb.jpg',
      socialMedia: {
        instagram: '@cooperwebb',
        twitter: '@Cooper_Webb',
      },
    },
    {
      id: 'eli-tomac',
      firstName: 'Eli',
      lastName: 'Tomac',
      number: 3,
      team: 'Monster Energy Star Racing Yamaha',
      series: 'both',
      nationality: 'USA',
      birthDate: '1992-11-14',
      status: 'active',
      photoUrl: 'https://example.com/riders/eli-tomac.jpg',
      socialMedia: {
        instagram: '@eli_tomac',
        twitter: '@Eli_Tomac',
      },
    },
    {
      id: 'ken-roczen',
      firstName: 'Ken',
      lastName: 'Roczen',
      number: 94,
      team: 'Progressive Insurance ECSTAR Suzuki',
      series: 'sx',
      nationality: 'Germany',
      birthDate: '1994-04-29',
      status: 'injured',
      injuryDetails: 'Shoulder injury, expected return in 2-3 weeks',
      photoUrl: 'https://example.com/riders/ken-roczen.jpg',
      socialMedia: {
        instagram: '@kenroczen94',
        twitter: '@kenroczen94',
      },
    },
    // More riders would be fetched from actual source
  ];

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));

  return mockRiders;
}

// ============================================================================
// Data Validation
// ============================================================================

function validateRiderData(rider: RiderDataItem): boolean {
  // Required fields
  if (!rider.id || !rider.firstName || !rider.lastName) {
    return false;
  }

  // Valid number
  if (typeof rider.number !== 'number' || rider.number < 1 || rider.number > 999) {
    return false;
  }

  // Valid team
  if (!rider.team || rider.team.trim().length === 0) {
    return false;
  }

  // Valid series
  if (!['sx', 'mx', 'both'].includes(rider.series)) {
    return false;
  }

  // Valid status
  const validStatuses = ['active', 'injured', 'retired'];
  if (!validStatuses.includes(rider.status)) {
    return false;
  }

  // If injured, should have details
  if (rider.status === 'injured' && !rider.injuryDetails) {
    console.warn(`⚠️  Injured rider ${rider.id} missing injury details`);
  }

  return true;
}

// ============================================================================
// Change Detection
// ============================================================================

function detectRiderChanges(
  oldRider: any,
  newRider: RiderDataItem
): DataChange[] {
  const changes: DataChange[] = [];

  // Check number change
  if (oldRider.number !== newRider.number) {
    changes.push({
      entityType: 'rider',
      entityId: newRider.id,
      changeType: 'updated',
      fieldName: 'number',
      oldValue: String(oldRider.number),
      newValue: String(newRider.number),
      significance: 'medium',
    });
  }

  // Check team change (significant!)
  if (oldRider.team !== newRider.team) {
    changes.push({
      entityType: 'rider',
      entityId: newRider.id,
      changeType: 'updated',
      fieldName: 'team',
      oldValue: oldRider.team,
      newValue: newRider.team,
      significance: 'high', // Team changes are noteworthy
    });
  }

  // Check status change (very significant!)
  if (oldRider.status !== newRider.status) {
    changes.push({
      entityType: 'rider',
      entityId: newRider.id,
      changeType: 'updated',
      fieldName: 'status',
      oldValue: oldRider.status,
      newValue: newRider.status,
      significance: 'critical', // Injury status is critical for predictions
    });
  }

  // Check injury details change
  if (oldRider.injury_details !== newRider.injuryDetails) {
    changes.push({
      entityType: 'rider',
      entityId: newRider.id,
      changeType: 'updated',
      fieldName: 'injury_details',
      oldValue: oldRider.injury_details || '',
      newValue: newRider.injuryDetails || '',
      significance: 'high',
    });
  }

  // Name changes are informational
  if (oldRider.first_name !== newRider.firstName || oldRider.last_name !== newRider.lastName) {
    changes.push({
      entityType: 'rider',
      entityId: newRider.id,
      changeType: 'updated',
      fieldName: 'name',
      oldValue: `${oldRider.first_name} ${oldRider.last_name}`,
      newValue: `${newRider.firstName} ${newRider.lastName}`,
      significance: 'low',
    });
  }

  return changes;
}
