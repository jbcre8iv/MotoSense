# MotoSense Supabase Edge Functions

This directory contains Supabase Edge Functions for automated data syncing and real-time updates.

## Directory Structure

```
supabase/
├── functions/
│   ├── _shared/
│   │   └── utils.ts           # Shared utilities
│   ├── sync-schedule/
│   │   └── index.ts           # Schedule sync function
│   ├── sync-results/
│   │   └── index.ts           # Results sync function (TODO)
│   ├── sync-riders/
│   │   └── index.ts           # Rider data sync function (TODO)
│   └── live-timing/
│       └── index.ts           # Live timing monitor (TODO)
└── README.md                   # This file
```

## Prerequisites

1. **Supabase CLI** installed globally:
   ```bash
   npm install -g supabase
   ```

2. **Supabase Project** created at [supabase.com](https://supabase.com)

3. **Database Migrations** run (migration-006-data-sync-infrastructure.sql)

## Setup

### 1. Link to Your Supabase Project

```bash
supabase link --project-ref your-project-ref
```

Your project ref can be found in your Supabase project URL:
`https://your-project-ref.supabase.co`

### 2. Set Environment Variables

Edge functions need access to environment variables. Set them in your Supabase dashboard:

Go to: **Settings** → **Edge Functions** → **Environment Variables**

Required variables:
- `SUPABASE_URL`: Your project URL (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (auto-provided)

Optional variables:
- `ADMIN_EMAIL`: Email for critical alerts
- `ENABLE_NOTIFICATIONS`: `true` or `false`

## Deployment

### Deploy All Functions

```bash
supabase functions deploy
```

### Deploy Specific Function

```bash
supabase functions deploy sync-schedule
```

### Deploy with Environment Variables

```bash
supabase functions deploy sync-schedule --env-file .env.local
```

## Testing

### Test Locally

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Serve function locally:
   ```bash
   supabase functions serve sync-schedule
   ```

3. Test with curl:
   ```bash
   curl --request POST \
     --url http://localhost:54321/functions/v1/sync-schedule \
     --header 'Authorization: Bearer YOUR_ANON_KEY'
   ```

### Test in Production

```bash
curl --request POST \
  --url https://your-project-ref.supabase.co/functions/v1/sync-schedule \
  --header 'Authorization: Bearer YOUR_ANON_KEY'
```

## Scheduling

### Using pg_cron (Recommended)

Supabase Edge Functions can be triggered by pg_cron for scheduled execution.

1. Enable pg_cron extension in Supabase dashboard:
   **Database** → **Extensions** → Enable `pg_cron`

2. Create scheduled jobs via SQL Editor:

```sql
-- Schedule sync-schedule to run daily at 6 AM UTC
SELECT cron.schedule(
  'sync-schedule-daily',
  '0 6 * * *', -- Cron expression: 6 AM daily
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/sync-schedule',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- Schedule sync-results to run every 2 hours
SELECT cron.schedule(
  'sync-results-hourly',
  '0 */2 * * *', -- Every 2 hours
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/sync-results',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- Schedule live-timing to run every 30 seconds on race days (Saturday/Sunday)
SELECT cron.schedule(
  'live-timing-race-day',
  '*/30 * * * 0,6', -- Every 30 seconds on Sat/Sun
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/live-timing',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

3. View scheduled jobs:
```sql
SELECT * FROM cron.job;
```

4. Delete a job:
```sql
SELECT cron.unschedule('sync-schedule-daily');
```

### Alternative: GitHub Actions

You can also trigger functions via GitHub Actions for more complex workflows:

```yaml
# .github/workflows/sync-data.yml
name: Sync Race Data

on:
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync Schedule
        run: |
          curl --request POST \
            --url ${{ secrets.SUPABASE_URL }}/functions/v1/sync-schedule \
            --header 'Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}'
```

## Monitoring

### View Function Logs

In Supabase Dashboard:
**Edge Functions** → Select function → **Logs**

### View Sync History

```sql
-- Recent syncs
SELECT * FROM v_recent_syncs
ORDER BY started_at DESC
LIMIT 20;

-- Failed syncs
SELECT * FROM sync_history
WHERE status = 'failed'
ORDER BY started_at DESC;

-- Source health
SELECT * FROM v_source_health
ORDER BY failed_syncs_7d DESC;
```

### View Critical Changes

```sql
-- Unnotified critical changes
SELECT * FROM v_critical_changes
WHERE notified = false;

-- All recent changes
SELECT * FROM data_changes
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY significance DESC, created_at DESC;
```

## Function Documentation

### sync-schedule

**Purpose**: Syncs race schedule data from official sources

**Trigger**: Daily at 6 AM UTC

**Sources**:
- Primary: SupercrossLIVE Schedule
- Backup: Racer X, MXGP Results

**Output**:
```json
{
  "success": true,
  "data": {
    "message": "Schedule sync completed",
    "stats": {
      "fetched": 17,
      "inserted": 2,
      "updated": 3,
      "changesDetected": 5
    }
  },
  "timestamp": "2025-01-22T12:00:00.000Z"
}
```

**Error Handling**:
- Retries failed requests with exponential backoff
- Falls back to backup sources if primary fails
- Logs all errors to `sync_history` table

### sync-results (TODO)

**Purpose**: Syncs race results after events complete

**Trigger**: Every 2 hours, or immediately after race

**Implementation Notes**:
- Cross-reference multiple sources for accuracy
- Trigger score calculations after successful sync
- Notify users of score updates

### sync-riders (TODO)

**Purpose**: Updates rider information, teams, and stats

**Trigger**: Weekly on Mondays

**Implementation Notes**:
- Scrape official team websites
- Track rider injuries and status changes
- Update rider numbers and bike changes

### live-timing (TODO)

**Purpose**: Real-time position updates during races

**Trigger**: Every 30 seconds on race days (Sat/Sun)

**Implementation Notes**:
- WebSocket or rapid polling of live timing
- Only runs on race days to save resources
- Triggers push notifications for position changes

## Rate Limiting

All functions respect rate limits configured in the `data_sources` table:

```sql
SELECT name, rate_limit_requests, rate_limit_period
FROM data_sources
WHERE is_active = true;
```

Example: SupercrossLIVE allows 30 requests per hour.

The `checkRateLimit()` utility enforces these limits.

## Error Recovery

### Automatic Recovery

Functions include automatic retry logic:
- 3 retry attempts with exponential backoff
- Falls back to backup sources
- Marks sources as unhealthy after consecutive failures

### Manual Recovery

If a sync fails completely:

1. Check sync history:
```sql
SELECT * FROM sync_history
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 5;
```

2. Check error message for cause

3. Manually trigger sync:
```bash
curl --request POST \
  --url https://your-project-ref.supabase.co/functions/v1/sync-schedule \
  --header 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

4. If source is consistently failing, disable it:
```sql
UPDATE data_sources
SET is_active = false
WHERE name = 'Source Name';
```

## Security

### Authentication

All edge functions require authentication via Bearer token:
- **Public endpoints**: Use `SUPABASE_ANON_KEY`
- **Internal/scheduled**: Use `SUPABASE_SERVICE_ROLE_KEY`

### Row Level Security

The `data_sources`, `sync_history`, and related tables have RLS policies:
- Admins can view all sync data
- Regular users cannot access sync internals
- System operations use service role key

### Rate Limiting

Built-in rate limiting prevents:
- Overloading external data sources
- DDoS concerns
- Excessive costs

## Costs

### Supabase Edge Functions

**Free Tier**:
- 500,000 invocations/month
- 2 GB outbound data transfer

**Estimated Usage**:
- Daily syncs: ~30 invocations/day = 900/month
- Hourly syncs: ~720 invocations/month
- Race day timing: ~240 invocations/race day

**Total**: ~2,000 invocations/month (well within free tier)

### Pro Tips

1. **Batch operations**: Sync multiple items per invocation
2. **Cache aggressively**: Use content snapshots to avoid unnecessary updates
3. **Optimize on race days**: Only run live timing when actually needed

## Troubleshooting

### Function won't deploy

```bash
# Check for syntax errors
deno check supabase/functions/sync-schedule/index.ts

# Deploy with verbose output
supabase functions deploy sync-schedule --debug
```

### Function times out

- Increase timeout (max 60 seconds for edge functions)
- Reduce batch size
- Optimize queries

### Function can't access database

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check RLS policies allow service role access

### Rate limit errors (429)

- Check `data_sources` table for rate limits
- Reduce sync frequency
- Wait for rate limit period to reset

## Development

### Adding a New Sync Function

1. Create directory: `supabase/functions/sync-your-feature/`

2. Create `index.ts` following the pattern:
```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createSupabaseClient, /* ... */ } from '../_shared/utils.ts'

serve(async (req) => {
  // 1. Get source config
  // 2. Check rate limits
  // 3. Start sync logging
  // 4. Fetch data
  // 5. Validate data
  // 6. Update database
  // 7. Log completion
  // 8. Return response
})
```

3. Test locally:
```bash
supabase functions serve sync-your-feature
```

4. Deploy:
```bash
supabase functions deploy sync-your-feature
```

5. Schedule (if needed):
```sql
SELECT cron.schedule(
  'sync-your-feature-schedule',
  '0 12 * * *',
  $$ /* http_post */ $$
);
```

## Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
- [MotoSense Data Strategy](../docs/DATA_STRATEGY.md)

## Support

For issues or questions:
1. Check function logs in Supabase dashboard
2. Review sync_history table for error messages
3. Consult DATA_STRATEGY.md for architecture overview
4. Open issue in GitHub repository

---

*Last Updated: January 2025*
