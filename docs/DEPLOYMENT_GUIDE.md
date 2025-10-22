# Real-Time Data System - Deployment Guide

## Overview

This guide walks you through deploying the real-time data synchronization system for MotoSense. The deployment consists of three main steps:

1. **Database Setup**: Run migration to create sync infrastructure tables
2. **Edge Functions**: Deploy serverless functions for data fetching
3. **Scheduling**: Configure automatic syncs using pg_cron

**Estimated Time**: 30-45 minutes

---

## Prerequisites

Before starting, ensure you have:

- [x] Supabase project created (you already have this)
- [x] Database credentials (from Supabase dashboard)
- [x] Service role key (for edge functions)
- [ ] Supabase CLI installed (optional, can use dashboard)
- [ ] Project files ready (`migration-006`, edge functions)

---

## Step 1: Run Database Migration

The migration creates all necessary tables for the data sync system.

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your MotoSense project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy Migration SQL**
   - Open file: `docs/migration-006-data-sync-infrastructure.sql`
   - Copy the entire contents (all 421 lines)

4. **Paste and Run**
   - Paste into SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Wait for completion (should take 5-10 seconds)

5. **Verify Success**
   - Check for "Success. No rows returned" message
   - Go to "Table Editor" in sidebar
   - You should see new tables:
     - `data_sources`
     - `sync_history`
     - `data_changes`
     - `data_quality_metrics`
     - `content_snapshots`

### Option B: Via Supabase CLI

If you have the CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project (get ref from dashboard Settings > General)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Or run the SQL file directly
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f docs/migration-006-data-sync-infrastructure.sql
```

---

## Step 2: Deploy Edge Functions

Edge functions handle the actual data fetching from external sources.

### Option A: Via Supabase Dashboard (Manual Setup)

**Note**: As of now, edge functions must be deployed via CLI. Skip to Option B.

### Option B: Via Supabase CLI (Required)

#### 2.1 Install Supabase CLI

**macOS (Homebrew):**
```bash
brew install supabase/tap/supabase
```

**Windows (Scoop):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Linux:**
```bash
brew install supabase/tap/supabase
```

**Verify installation:**
```bash
supabase --version
```

#### 2.2 Login and Link Project

```bash
# Login to Supabase
supabase login

# Link your project
# Get project-ref from: Dashboard > Settings > General > Reference ID
supabase link --project-ref <your-project-ref>
```

#### 2.3 Set Environment Variables

Create `.env` file in project root:

```bash
# .env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Get these from: **Dashboard > Settings > API**

#### 2.4 Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy sync-schedule
```

**Expected output:**
```
Deploying sync-schedule (project ref: abc-def-123)
Bundled sync-schedule in 245ms.
Deployed sync-schedule in 1.2s.
```

#### 2.5 Verify Deployment

```bash
# List deployed functions
supabase functions list

# Test the function
curl -i --location --request POST \
  'https://<your-project-ref>.supabase.co/functions/v1/sync-schedule' \
  --header 'Authorization: Bearer <your-service-role-key>' \
  --header 'Content-Type: application/json'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "message": "Schedule sync completed",
    "stats": {
      "fetched": 0,
      "inserted": 0,
      "updated": 0,
      "changesDetected": 0
    }
  }
}
```

---

## Step 3: Configure Scheduled Jobs

Use pg_cron to automatically run syncs on a schedule.

### 3.1 Enable pg_cron Extension

**Via Dashboard:**
1. Go to **Database > Extensions**
2. Search for "pg_cron"
3. Toggle it on

**Via SQL:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 3.2 Grant Permissions

Run this in SQL Editor:

```sql
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

### 3.3 Schedule Sync Jobs

Run these in SQL Editor to set up automatic syncs:

#### Daily Schedule Sync (6 AM UTC)

```sql
SELECT cron.schedule(
  'sync-schedule-daily',
  '0 6 * * *',  -- 6 AM UTC every day
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project-ref>.supabase.co/functions/v1/sync-schedule',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <your-service-role-key>'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

#### Results Sync (Every 2 hours on race days)

```sql
SELECT cron.schedule(
  'sync-results-race-days',
  '0 */2 * * 0,6',  -- Every 2 hours on Sat/Sun
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project-ref>.supabase.co/functions/v1/sync-results',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <your-service-role-key>'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Note**: Replace `<your-project-ref>` and `<your-service-role-key>` with your actual values.

### 3.4 Verify Scheduled Jobs

```sql
-- List all scheduled jobs
SELECT * FROM cron.job;

-- Check job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

## Step 4: Test the System

### 4.1 Verify Database Tables

Check that tables were created and seeded:

```sql
-- Check data sources (should have 10 entries)
SELECT name, category, is_active, reliability_score
FROM data_sources;

-- Check sync history (should be empty initially)
SELECT * FROM sync_history
ORDER BY started_at DESC
LIMIT 5;

-- Test helper function
SELECT log_sync_start(
  (SELECT id FROM data_sources WHERE name = 'SupercrossLIVE - Schedule' LIMIT 1),
  'manual',
  '{"test": true}'::jsonb
);
```

### 4.2 Manual Function Test

Trigger the sync function manually:

```bash
curl -X POST \
  'https://<your-project-ref>.supabase.co/functions/v1/sync-schedule' \
  -H 'Authorization: Bearer <your-service-role-key>' \
  -H 'Content-Type: application/json'
```

**Check results:**
```sql
-- View recent syncs
SELECT * FROM v_recent_syncs
ORDER BY started_at DESC
LIMIT 5;

-- Check source health
SELECT * FROM v_source_health;

-- See any changes detected
SELECT * FROM data_changes
ORDER BY detected_at DESC
LIMIT 10;
```

### 4.3 Monitor Function Logs

**Via Dashboard:**
1. Go to **Edge Functions** in sidebar
2. Click on `sync-schedule`
3. Click "Logs" tab
4. View real-time execution logs

**Via CLI:**
```bash
supabase functions logs sync-schedule
```

---

## Step 5: Set Up Additional Sync Functions

The `sync-schedule` function is just a template. You'll need to create similar functions for:

### 5.1 Sync Results Function

Copy the `sync-schedule` pattern to create `sync-results`:

```bash
# Create new function directory
mkdir -p supabase/functions/sync-results

# Copy template
cp supabase/functions/sync-schedule/index.ts supabase/functions/sync-results/index.ts

# Modify for results data (update SOURCE_NAME, entity type, etc.)
# Deploy
supabase functions deploy sync-results
```

**Key changes needed:**
- SOURCE_NAME: `'SupercrossLIVE - Results'`
- Entity type: `'result'`
- Data structure: Race results format
- Validation: Result-specific checks

### 5.2 Sync Riders Function

For rider/team data:

```bash
mkdir -p supabase/functions/sync-riders
cp supabase/functions/sync-schedule/index.ts supabase/functions/sync-riders/index.ts
# Modify and deploy
supabase functions deploy sync-riders
```

### 5.3 Live Timing Function (Race Days Only)

For real-time race updates:

```bash
mkdir -p supabase/functions/live-timing
# Implement WebSocket or polling logic
supabase functions deploy live-timing
```

Schedule for race days only (Saturdays):
```sql
SELECT cron.schedule(
  'live-timing-race-day',
  '*/30 * * * 6',  -- Every 30 seconds on Saturdays
  $$ /* HTTP post to live-timing function */ $$
);
```

---

## Step 6: Connect App to Real Data

Once syncs are running and data is flowing:

### 6.1 Update App Data Layer

The app currently uses mock data. Switch to real Supabase data:

**Example in `racesService.ts`:**
```typescript
// Before (mock data)
import mockRaces from '../data/mockRaces';

// After (real data)
export async function getRaces() {
  const { data, error } = await supabase
    .from('races')
    .select('*, tracks(*)')
    .order('date', { ascending: true });

  if (error) throw error;
  return data;
}
```

### 6.2 Remove Mock Data Files

Once fully migrated:
```bash
# Remove mock data files
rm src/data/mockRaces.ts
rm src/data/mockRiders.ts
rm src/data/mockTracks.ts
```

### 6.3 Add Data Freshness Indicators

Show users when data was last updated:

```typescript
// Get last sync time
const { data: lastSync } = await supabase
  .from('v_recent_syncs')
  .select('completed_at')
  .eq('status', 'success')
  .order('completed_at', { ascending: false })
  .limit(1)
  .single();

// Display: "Last updated: 2 hours ago"
```

---

## Troubleshooting

### Migration Issues

**Problem**: "relation already exists" error

**Solution**:
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'data_%';

-- Drop and re-run if needed
DROP TABLE IF EXISTS data_sources CASCADE;
-- Then re-run migration
```

### Edge Function Deployment Issues

**Problem**: "Function deployment failed"

**Solution**:
```bash
# Check CLI version (need v1.100.0+)
supabase --version

# Update if needed
brew upgrade supabase

# Re-login
supabase logout
supabase login

# Re-link project
supabase link --project-ref <your-ref>

# Try deploying again
supabase functions deploy sync-schedule --debug
```

**Problem**: "Unauthorized" when testing function

**Solution**:
- Verify you're using the **service role key**, not anon key
- Check key in Dashboard > Settings > API
- Ensure key is in Authorization header: `Bearer <key>`

### Scheduling Issues

**Problem**: Scheduled jobs not running

**Solution**:
```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job status
SELECT * FROM cron.job WHERE jobname = 'sync-schedule-daily';

-- Check recent job runs
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-schedule-daily')
ORDER BY start_time DESC
LIMIT 5;

-- Manually run a job to test
SELECT cron.run_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'sync-schedule-daily')
);
```

**Problem**: Function times out

**Solution**:
- Increase timeout in edge function (default 30s, max 10min)
- Add to function:
```typescript
serve(async (req) => {
  // ... your code
}, { timeout: 60 }); // 60 seconds
```

### Rate Limiting Issues

**Problem**: "Rate limit exceeded" in logs

**Solution**:
```sql
-- Check current rate limits
SELECT name, rate_limit_requests, rate_limit_period
FROM data_sources
WHERE is_active = true;

-- Adjust if needed
UPDATE data_sources
SET rate_limit_requests = 20,  -- Reduce from 30
    rate_limit_period = 3600    -- Per hour
WHERE name = 'SupercrossLIVE - Schedule';
```

---

## Monitoring & Maintenance

### Daily Monitoring Queries

Run these regularly to ensure system health:

```sql
-- Source health (last 7 days)
SELECT * FROM v_source_health
ORDER BY failed_syncs_7d DESC;

-- Recent syncs
SELECT * FROM v_recent_syncs
WHERE started_at > NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;

-- Critical changes not notified
SELECT * FROM v_critical_changes
WHERE notified = false;

-- Data quality scores
SELECT
  ds.name,
  dqm.overall_score,
  dqm.date
FROM data_quality_metrics dqm
JOIN data_sources ds ON ds.id = dqm.source_id
WHERE dqm.date = CURRENT_DATE
ORDER BY dqm.overall_score ASC;
```

### Set Up Alerts

**Low Quality Score Alert:**
```sql
-- Create function to send alert
CREATE OR REPLACE FUNCTION alert_low_quality()
RETURNS trigger AS $$
BEGIN
  IF NEW.overall_score < 0.80 THEN
    -- Log to admin table or send notification
    INSERT INTO admin_alerts (alert_type, message)
    VALUES (
      'low_quality',
      format('Source %s has quality score of %s', NEW.source_id, NEW.overall_score)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER check_quality_score
AFTER INSERT ON data_quality_metrics
FOR EACH ROW
EXECUTE FUNCTION alert_low_quality();
```

### Backup Considerations

The sync system is stateless (data can be re-fetched), but preserve:

- `data_sources` table (configuration)
- `data_changes` table (change history)
- `sync_history` table (audit trail)

```sql
-- Backup data sources config
COPY data_sources TO '/tmp/data_sources_backup.csv' CSV HEADER;

-- Backup sync history
COPY (
  SELECT * FROM sync_history
  WHERE started_at > NOW() - INTERVAL '90 days'
) TO '/tmp/sync_history_backup.csv' CSV HEADER;
```

---

## Performance Optimization

### After First Month

**1. Archive Old Sync History:**
```sql
-- Create archive table
CREATE TABLE sync_history_archive (LIKE sync_history);

-- Move old records (keep last 30 days in main table)
INSERT INTO sync_history_archive
SELECT * FROM sync_history
WHERE completed_at < NOW() - INTERVAL '30 days';

DELETE FROM sync_history
WHERE completed_at < NOW() - INTERVAL '30 days';
```

**2. Vacuum Tables:**
```sql
VACUUM ANALYZE sync_history;
VACUUM ANALYZE data_changes;
VACUUM ANALYZE content_snapshots;
```

**3. Review Source Reliability:**
```sql
-- Disable unreliable sources
UPDATE data_sources
SET is_active = false
WHERE reliability_score < 0.70;
```

---

## Next Steps After Deployment

Once everything is deployed and running:

1. **Monitor for 1 week**
   - Check sync success rates
   - Verify data accuracy
   - Review error logs

2. **Implement Remaining Functions**
   - sync-results
   - sync-riders
   - live-timing

3. **Add User-Facing Features**
   - Data freshness indicators
   - Change notifications
   - Error reporting

4. **Pursue Official Partnerships**
   - Contact Feld Entertainment
   - Demonstrate app value
   - Negotiate API access

5. **Scale as Needed**
   - Upgrade Supabase tier if needed
   - Add CDN for static data
   - Implement caching strategies

---

## Deployment Checklist

Use this checklist to track your progress:

### Database Setup
- [ ] Migration file reviewed
- [ ] Migration run successfully in Supabase
- [ ] Tables created (data_sources, sync_history, etc.)
- [ ] 10 data sources seeded
- [ ] Helper functions work
- [ ] Monitoring views accessible

### Edge Functions
- [ ] Supabase CLI installed
- [ ] Project linked via CLI
- [ ] Environment variables configured
- [ ] sync-schedule function deployed
- [ ] Function tested manually
- [ ] Logs accessible

### Scheduling
- [ ] pg_cron extension enabled
- [ ] Permissions granted
- [ ] Daily schedule sync configured
- [ ] Jobs verified in cron.job table
- [ ] Test job run successfully

### Testing
- [ ] Manual sync completed
- [ ] Data appears in sync_history
- [ ] Changes tracked in data_changes
- [ ] No errors in function logs
- [ ] Source health looks good

### Documentation
- [ ] Team understands system
- [ ] Monitoring queries bookmarked
- [ ] Alert system configured
- [ ] Backup strategy in place

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Edge Functions Guide**: https://supabase.com/docs/guides/functions
- **pg_cron Docs**: https://github.com/citusdata/pg_cron
- **Project Files**:
  - `docs/DATA_STRATEGY.md` - Overall strategy
  - `docs/REAL_TIME_DATA_SYSTEM_SUMMARY.md` - System overview
  - `supabase/README.md` - Function deployment guide

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Project Ref**: _____________

**Notes**:
