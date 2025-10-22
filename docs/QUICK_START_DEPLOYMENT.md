# Quick Start: Deploy Real-Time Data System

**Time**: ~15 minutes | **Difficulty**: Medium

This is the fast-track deployment guide. For detailed explanations, see [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md).

---

## Prerequisites

You need:
- ✅ Supabase account and project
- ✅ Project credentials (from dashboard)
- ⚠️ Supabase CLI (we'll install if needed)

---

## Step 1: Database Setup (5 min)

### Run the Migration

**Option 1: Via Supabase Dashboard** (Easiest)

1. Open https://supabase.com/dashboard → Your Project
2. Click **SQL Editor** → **New query**
3. Copy ALL contents from `docs/migration-006-data-sync-infrastructure.sql`
4. Paste and click **Run**
5. Wait for "Success. No rows returned"

**Verify:**
```sql
SELECT COUNT(*) FROM data_sources;
-- Should return: 10
```

✅ **Step 1 Complete** → Database tables created

---

## Step 2: Install Supabase CLI (3 min)

### macOS:
```bash
brew install supabase/tap/supabase
```

### Windows (Scoop):
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Linux:
```bash
brew install supabase/tap/supabase
```

**Verify:**
```bash
supabase --version
# Should show: v1.100.0 or higher
```

✅ **Step 2 Complete** → CLI installed

---

## Step 3: Link Your Project (2 min)

```bash
# Login
supabase login

# Link project (get ref from Dashboard > Settings > General)
supabase link --project-ref YOUR_PROJECT_REF
```

**You'll be prompted for your database password** (from Dashboard > Settings > Database)

✅ **Step 3 Complete** → Project linked

---

## Step 4: Deploy Edge Function (3 min)

From your project root:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy just sync-schedule
supabase functions deploy sync-schedule
```

**Expected output:**
```
Deploying sync-schedule...
Bundled in 245ms.
Deployed in 1.2s.
```

**Test it:**
```bash
# Get your service role key from: Dashboard > Settings > API
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-schedule' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

**Expected response:**
```json
{"success": true, "data": {...}}
```

✅ **Step 4 Complete** → Edge function deployed

---

## Step 5: Schedule Automatic Syncs (2 min)

In Supabase **SQL Editor**, run this:

### Enable pg_cron
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

### Schedule Daily Sync (6 AM UTC)
```sql
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
```

**Replace:**
- `YOUR_PROJECT_REF` → Your actual project ref
- `YOUR_SERVICE_ROLE_KEY` → Your actual service role key

**Verify:**
```sql
SELECT * FROM cron.job;
-- Should show: sync-schedule-daily
```

✅ **Step 5 Complete** → Automatic syncs configured

---

## Verification Checklist

Run these to confirm everything works:

### 1. Check Data Sources
```sql
SELECT name, category, is_active FROM data_sources;
```
**Expected**: 10 rows

### 2. Check Recent Syncs
```sql
SELECT * FROM v_recent_syncs LIMIT 5;
```
**Expected**: At least 1 row (from your manual test)

### 3. Check Source Health
```sql
SELECT * FROM v_source_health;
```
**Expected**: All sources showing stats

### 4. Manual Trigger Test
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-schedule' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```
**Expected**: `{"success": true}`

### 5. Check Function Logs

**Via Dashboard:**
- Go to **Edge Functions** → `sync-schedule` → **Logs**
- Should see successful execution

**Via CLI:**
```bash
supabase functions logs sync-schedule --tail
```

---

## You're Done! 🎉

The real-time data system is now:
- ✅ **Database**: Tracking all syncs and changes
- ✅ **Edge Function**: Ready to fetch data
- ✅ **Scheduled**: Runs automatically at 6 AM UTC daily
- ✅ **Monitored**: All operations logged

---

## What Happens Now?

**Every day at 6 AM UTC**, the system will:
1. Fetch racing schedule data
2. Compare with existing records
3. Detect and log any changes
4. Update database if needed
5. Track data quality metrics

**You can view this activity in:**
- SQL: `SELECT * FROM sync_history`
- SQL: `SELECT * FROM data_changes`
- Dashboard: Edge Functions → Logs

---

## Next Steps

### Immediate
1. **Monitor for 24 hours** - Check sync_history table tomorrow
2. **Verify first sync** - Should run at 6 AM UTC
3. **Review logs** - Check for any errors

### This Week
1. **Deploy sync-results** - Copy sync-schedule pattern
2. **Deploy sync-riders** - Copy sync-schedule pattern
3. **Connect app to real data** - Remove mock data

### This Month
1. **Implement live-timing** - For race days
2. **Add change notifications** - Alert users of schedule changes
3. **Pursue official partnerships** - Contact Feld Entertainment

---

## Troubleshooting

### "Function deployment failed"
```bash
# Update CLI
brew upgrade supabase

# Re-login
supabase logout && supabase login

# Re-link
supabase link --project-ref YOUR_PROJECT_REF

# Try again with debug
supabase functions deploy sync-schedule --debug
```

### "Unauthorized" when testing
- ✅ Using **service role key** (not anon key)
- ✅ Key is from Dashboard > Settings > API
- ✅ Key in header: `Authorization: Bearer <key>`

### "Scheduled job not running"
```sql
-- Check job exists
SELECT * FROM cron.job WHERE jobname = 'sync-schedule-daily';

-- Manually trigger it
SELECT cron.run_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'sync-schedule-daily')
);

-- Check if it ran
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
```

### "No data showing up"
The initial function uses **mock data** as a template. To fetch real data:
1. Implement HTML parsing for actual sources
2. Replace mock data in `sync-schedule/index.ts`
3. See `DATA_STRATEGY.md` for source URLs

---

## Quick Commands Reference

```bash
# Deploy functions
supabase functions deploy

# View logs
supabase functions logs sync-schedule --tail

# List all functions
supabase functions list

# Delete a function
supabase functions delete sync-schedule

# Run migration
supabase db push
```

```sql
-- View recent syncs
SELECT * FROM v_recent_syncs LIMIT 10;

-- Check source health
SELECT * FROM v_source_health;

-- View critical changes
SELECT * FROM v_critical_changes;

-- List scheduled jobs
SELECT * FROM cron.job;

-- Manually trigger job
SELECT cron.run_job(jobid) FROM cron.job WHERE jobname = 'sync-schedule-daily';

-- Delete scheduled job
SELECT cron.unschedule('sync-schedule-daily');
```

---

## Documentation

| File | Purpose |
|------|---------|
| `DEPLOYMENT_GUIDE.md` | Full deployment guide with troubleshooting |
| `QUICK_START_DEPLOYMENT.md` | This file - fast deployment |
| `DATA_STRATEGY.md` | Overall data strategy and sources |
| `REAL_TIME_DATA_SYSTEM_SUMMARY.md` | Technical system overview |
| `LEGAL_COMPLIANCE_GUIDE.md` | Legal considerations for data usage |
| `migration-006-data-sync-infrastructure.sql` | Database migration SQL |
| `supabase/README.md` | Edge functions development guide |

---

## Support

**Need help?**
- Review `DEPLOYMENT_GUIDE.md` for detailed steps
- Check Supabase docs: https://supabase.com/docs
- Review function logs for error messages

**System working?**
- Monitor daily: `SELECT * FROM v_source_health`
- Track changes: `SELECT * FROM data_changes ORDER BY detected_at DESC`
- Check quality: `SELECT * FROM data_quality_metrics WHERE date = CURRENT_DATE`

---

**Deployed**: _____________
**Status**: _____________
**Notes**: _____________
