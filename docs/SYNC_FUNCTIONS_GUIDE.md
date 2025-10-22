# Sync Functions - Complete Guide

**Last Updated**: January 2025

---

## Overview

MotoSense uses three specialized Supabase Edge Functions to keep racing data synchronized in real-time:

1. **sync-schedule** - Race schedules and dates
2. **sync-results** - Race results and positions
3. **sync-riders** - Rider/team information

All functions follow the same pattern and share common utilities for consistency and maintainability.

---

## Function Comparison

| Function | Purpose | Trigger Frequency | Criticality | Score Impact |
|----------|---------|-------------------|-------------|--------------|
| **sync-schedule** | Race dates & venues | Daily (6 AM UTC) | High | Indirect (locks predictions) |
| **sync-results** | Race results & positions | Every 2 hours (race days) | Critical | Direct (triggers scoring) |
| **sync-riders** | Rider/team data | Weekly (Monday) | Medium | Indirect (prediction context) |

---

## 1. sync-schedule

### Purpose
Keeps race schedule up-to-date, including dates, venues, and status changes.

### Data Fetched
- Race ID, name, series (SX/MX)
- Round number
- Date and time
- Track/venue information
- Status (upcoming/completed)

### Key Features
- **Detects rescheduled races** (critical change)
- **Marks past races as completed** automatically
- **Tracks venue changes** (high priority)
- Uses SHA-256 hashing to avoid unnecessary updates

### Change Significance
- **CRITICAL**: Date changed (race rescheduled)
- **HIGH**: Venue changed
- **MEDIUM**: Name or status changed
- **LOW**: Minor corrections

### Sample Workflow
```
1. Fetch schedule from source
2. Compare with stored snapshot (SHA-256)
3. If changed:
   - Validate each race
   - Update existing or insert new
   - Detect significant changes
   - Mark past races as completed
4. Log results to sync_history
```

### Scheduling Recommendation
```sql
-- Daily at 6 AM UTC
SELECT cron.schedule(
  'sync-schedule-daily',
  '0 6 * * *',
  $$ /* HTTP post to function */ $$
);
```

### File Location
`supabase/functions/sync-schedule/index.ts` (411 lines)

---

## 2. sync-results

### Purpose
Fetches and stores race results as soon as they're posted, triggers score calculations for predictions.

### Data Fetched
- Race ID and rider ID
- Position (1-22)
- Championship points earned
- Lap count
- Status (finished/DNF/DNS/DSQ)
- Total time, best lap time
- Gap to leader

### Key Features
- **Triggers prediction scoring** automatically when results are posted
- **Marks race as having results** (critical for app state)
- **Updates leaderboard** after scoring
- Validates positions, points, and status

### Change Significance
- **CRITICAL**: Results posted for first time, status changed (e.g., DSQ)
- **HIGH**: Position or points changed
- **MEDIUM**: Time adjustments
- **LOW**: Minor data corrections

### Sample Workflow
```
1. Fetch results from source
2. Compare with stored snapshot (SHA-256)
3. If changed:
   - For each race with results:
     - Validate result data
     - Update/insert results
     - Detect changes
   - If new results:
     - Mark race as having results
     - Trigger score calculations (RPC)
     - Update leaderboard
4. Log results to sync_history
```

### Score Calculation Integration
```typescript
// Automatically calls existing RPC function
await supabase.rpc('calculate_prediction_scores', {
  p_race_id: raceId
});

// Then updates leaderboard
await supabase.rpc('update_leaderboard');
```

### Scheduling Recommendation
```sql
-- Every 2 hours on race days (Sat/Sun)
SELECT cron.schedule(
  'sync-results-race-days',
  '0 */2 * * 0,6',
  $$ /* HTTP post to function */ $$
);
```

**Why every 2 hours?**
- Results usually posted 1-2 hours after race ends
- Races typically finish around 7-10 PM local time
- Frequent enough to catch results quickly
- Not so frequent to waste resources

### File Location
`supabase/functions/sync-results/index.ts` (530 lines)

---

## 3. sync-riders

### Purpose
Keeps rider information current, including team changes and injury status.

### Data Fetched
- Rider ID, first/last name
- Race number
- Team name
- Series (SX, MX, or both)
- Nationality, birth date
- Status (active/injured/retired)
- Injury details (if applicable)
- Photo URL
- Social media links

### Key Features
- **Tracks injury status** (critical for predictions)
- **Detects team changes** (high priority)
- **Number changes** tracked
- Validates all rider data before insert/update

### Change Significance
- **CRITICAL**: Status changed (active ↔ injured ↔ retired)
- **HIGH**: Team changed, injury details updated
- **MEDIUM**: Number changed
- **LOW**: Name corrections, social media updates

### Sample Workflow
```
1. Fetch rider list from source
2. Compare with stored snapshot (SHA-256)
3. If changed:
   - For each rider:
     - Validate data
     - Update existing or insert new
     - Detect significant changes
4. Log results to sync_history
```

### Scheduling Recommendation
```sql
-- Weekly on Monday at 6 AM UTC
SELECT cron.schedule(
  'sync-riders-weekly',
  '0 6 * * 1',
  $$ /* HTTP post to function */ $$
);
```

**Why weekly?**
- Rider data changes infrequently (teams, numbers, injuries)
- Weekly is sufficient for most updates
- Can trigger manually for urgent changes (injury announcements)

### File Location
`supabase/functions/sync-riders/index.ts` (482 lines)

---

## Shared Architecture

All three functions share the same structure and utilities:

### Common Pattern

```typescript
serve(async (req) => {
  // 1. Get data source configuration
  const { data: source } = await supabase
    .from('data_sources')
    .select('*')
    .eq('name', SOURCE_NAME)
    .single();

  // 2. Check if active
  if (!source.is_active) {
    return errorResponse('Data source is inactive', 403);
  }

  // 3. Check rate limits
  if (!checkRateLimit(source.id, rateLimit)) {
    return errorResponse('Rate limit exceeded', 429);
  }

  // 4. Start sync logging
  const syncId = await logSyncStart(supabase, source.id, 'scheduled');

  // 5. Fetch data from source
  const data = await fetchData(SOURCE_URL);

  // 6. Check for content changes (SHA-256)
  const contentChanged = await hasContentChanged(
    supabase, source.id, SOURCE_URL, JSON.stringify(data)
  );

  if (!contentChanged) {
    // Skip update, log completion
    return successResponse({ message: 'No changes detected' });
  }

  // 7. Process each item
  for (const item of data) {
    // Validate
    // Check if exists
    // Update or insert
    // Detect changes
  }

  // 8. Log completion
  await logSyncComplete(supabase, syncId, syncResult);

  return successResponse({ stats: {...} });
})
```

### Shared Utilities (`_shared/utils.ts`)

**Change Detection**:
- `hashContent()` - SHA-256 hashing
- `hasContentChanged()` - Compare with stored snapshot

**Rate Limiting**:
- `checkRateLimit()` - In-memory rate limit enforcement

**HTTP**:
- `fetchWithRetry()` - Exponential backoff retry logic

**Logging**:
- `logSyncStart()` - Begin sync operation
- `logSyncComplete()` - Finish with statistics

**Validation**:
- `isValidDate()` - Date string validation
- `sanitizeString()` - Input sanitization

**Responses**:
- `errorResponse()` - Formatted error
- `successResponse()` - Formatted success

---

## Deployment

### Step 1: Deploy All Functions

```bash
# Deploy all at once
supabase functions deploy

# Or individually
supabase functions deploy sync-schedule
supabase functions deploy sync-results
supabase functions deploy sync-riders
```

### Step 2: Schedule Automatic Syncs

Run this SQL in Supabase SQL Editor:

```sql
-- sync-schedule: Daily at 6 AM UTC
SELECT cron.schedule(
  'sync-schedule-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-schedule',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- sync-results: Every 2 hours on Sat/Sun
SELECT cron.schedule(
  'sync-results-race-days',
  '0 */2 * * 0,6',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- sync-riders: Weekly on Monday
SELECT cron.schedule(
  'sync-riders-weekly',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-riders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Step 3: Verify Scheduled Jobs

```sql
-- List all scheduled jobs
SELECT * FROM cron.job;

-- Check recent runs
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

## Testing

### Manual Trigger (cURL)

```bash
# Test sync-schedule
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-schedule' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'

# Test sync-results
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-results' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'

# Test sync-riders
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-riders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "message": "Schedule sync completed",
    "stats": {
      "fetched": 17,
      "inserted": 0,
      "updated": 2,
      "changesDetected": 2
    }
  }
}
```

### Verify in Database

```sql
-- View recent syncs
SELECT * FROM v_recent_syncs
ORDER BY started_at DESC
LIMIT 10;

-- Check for changes
SELECT * FROM data_changes
WHERE detected_at > NOW() - INTERVAL '1 hour'
ORDER BY detected_at DESC;

-- Source health
SELECT * FROM v_source_health;
```

---

## Monitoring

### Daily Health Check

```sql
-- Overall sync health (last 24 hours)
SELECT
  ds.name,
  COUNT(*) as sync_count,
  SUM(CASE WHEN sh.status = 'success' THEN 1 ELSE 0 END) as successes,
  SUM(CASE WHEN sh.status = 'failed' THEN 1 ELSE 0 END) as failures,
  AVG(sh.duration_ms) as avg_duration_ms
FROM sync_history sh
JOIN data_sources ds ON ds.id = sh.source_id
WHERE sh.started_at > NOW() - INTERVAL '24 hours'
GROUP BY ds.name
ORDER BY failures DESC;
```

### Critical Changes Alert

```sql
-- Unhandled critical changes
SELECT
  dc.entity_type,
  dc.entity_id,
  dc.change_type,
  dc.field_name,
  dc.old_value,
  dc.new_value,
  dc.detected_at
FROM data_changes dc
WHERE dc.significance = 'critical'
  AND dc.notified = false
ORDER BY dc.detected_at DESC;
```

### Function Logs

**Via Dashboard**:
- Go to Edge Functions → Select function → Logs tab

**Via CLI**:
```bash
supabase functions logs sync-schedule --tail
supabase functions logs sync-results --tail
supabase functions logs sync-riders --tail
```

---

## Troubleshooting

### Function Not Running

**Check if scheduled**:
```sql
SELECT * FROM cron.job WHERE jobname LIKE 'sync-%';
```

**Manually trigger**:
```sql
SELECT cron.run_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'sync-schedule-daily')
);
```

**Check run history**:
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-schedule-daily')
ORDER BY start_time DESC
LIMIT 5;
```

### Rate Limit Errors

**Check source config**:
```sql
SELECT name, rate_limit_requests, rate_limit_period
FROM data_sources
WHERE name LIKE 'SupercrossLIVE%';
```

**Adjust limits**:
```sql
UPDATE data_sources
SET rate_limit_requests = 20,  -- Reduce from 30
    rate_limit_period = 3600
WHERE name = 'SupercrossLIVE Schedule';
```

### No Changes Detected

This is normal if:
- Source content hasn't changed
- Recent sync already captured changes
- Content hash matches stored snapshot

**Force re-sync** (bypass hash check):
```sql
-- Delete content snapshot to force re-check
DELETE FROM content_snapshots
WHERE source_id = (
  SELECT id FROM data_sources WHERE name = 'SupercrossLIVE Schedule'
);
```

### Score Calculations Not Triggering

**Check if results marked**:
```sql
SELECT id, name, has_results
FROM races
WHERE date >= '2025-01-01'
ORDER BY date DESC;
```

**Manually trigger scoring**:
```sql
-- For specific race
SELECT calculate_prediction_scores('sx-2025-r01');

-- Update leaderboard
SELECT update_leaderboard();
```

---

## Implementing Real Data Sources

The functions currently use **mock data** as templates. To connect to real sources:

### 1. Choose Parsing Method

**Option A: HTML Scraping (Most Common)**
```typescript
const response = await fetchWithRetry(url);
const html = await response.text();

// Use regex or DOM parsing
const schedulePattern = /<div class="race-item">(.*?)<\/div>/g;
const matches = [...html.matchAll(schedulePattern)];
```

**Option B: JSON API (If Available)**
```typescript
const response = await fetchWithRetry(url);
const data = await response.json();

// Map API response to our format
const races = data.races.map(apiRace => ({
  id: apiRace.slug,
  name: apiRace.title,
  date: apiRace.start_date,
  // ... map other fields
}));
```

### 2. Update fetchData Function

Replace mock data section in each function:

**In sync-schedule/index.ts**:
```typescript
async function fetchScheduleData(url: string): Promise<RaceScheduleItem[]> {
  const response = await fetchWithRetry(url);
  const html = await response.text();

  // YOUR PARSING LOGIC HERE
  // Extract races from HTML
  const races = parseScheduleHTML(html);

  return races;
}

function parseScheduleHTML(html: string): RaceScheduleItem[] {
  // Implement parsing specific to source website structure
  // See DATA_STRATEGY.md for source URLs
}
```

### 3. Test Thoroughly

```bash
# Test with real data
curl -X POST 'https://YOUR_REF.supabase.co/functions/v1/sync-schedule' \
  -H 'Authorization: Bearer YOUR_KEY'

# Check logs
supabase functions logs sync-schedule --tail

# Verify data
SELECT * FROM races ORDER BY date DESC LIMIT 5;
```

---

## Performance Considerations

### Function Timeouts

Default: 30 seconds
Maximum: 10 minutes

**To increase**:
```typescript
serve(async (req) => {
  // Your code
}, { timeout: 60 }); // 60 seconds
```

### Large Result Sets

If fetching 100+ results, consider batching inserts:

```typescript
// Instead of individual inserts
for (const result of results) {
  await supabase.from('race_results').insert(result);
}

// Batch insert (faster)
await supabase.from('race_results').insert(results);
```

### Database Connections

Edge functions use connection pooling automatically. No special configuration needed.

---

## Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **Functions Built** | ✅ 3/3 | schedule, results, riders |
| **Pattern Consistency** | ✅ Complete | All follow same structure |
| **Shared Utilities** | ✅ Integrated | Change detection, logging, etc. |
| **Deployment Ready** | ✅ Yes | Templates with mock data |
| **Real Data** | ⚠️ Pending | Need HTML parsing implementation |
| **Score Integration** | ✅ Yes | sync-results triggers calculations |
| **Documentation** | ✅ Complete | This guide + deployment docs |

---

## Next Steps

1. **Deploy functions** (5 min)
   ```bash
   supabase functions deploy
   ```

2. **Schedule jobs** (5 min)
   - Run scheduling SQL
   - Verify in cron.job table

3. **Test manually** (10 min)
   - Trigger each function via cURL
   - Check sync_history
   - Review function logs

4. **Implement real parsing** (4-6 hours per function)
   - Study source website HTML structure
   - Write parsing functions
   - Test and validate data

5. **Monitor** (ongoing)
   - Daily health checks
   - Critical change alerts
   - Source reliability tracking

---

**All three sync functions are production-ready templates. Deploy now with mock data, implement real parsing incrementally.**

---

*Created: January 2025*
*Functions: 3 (schedule, results, riders)*
*Total Code: ~1,400 lines*
*Status: Ready to Deploy*
