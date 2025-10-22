# Data Sources Implementation Guide

**Official Source Priority for MotoSense**

---

## Source Priority (Most to Least Authoritative)

### Tier 1: Official Sites (Highest Priority)

| Rank | Source | URL | Reliability | Use For |
|------|--------|-----|-------------|---------|
| **#1** | SuperMotocross (Official) | https://www.supermotocross.com/ | 1.00 | Primary - All data types |
| **#2** | SupercrossLIVE (Official) | https://www.supercrosslive.com/ | 0.98 | Secondary - Schedule, Results, Live |
| **#3** | ProMotocross (Official) | https://promotocross.com/ | 0.98 | Tertiary - Motocross specific |

### Tier 2: Highly Accurate Third-Party

| Rank | Source | URL | Reliability | Use For |
|------|--------|-----|-------------|---------|
| **#4** | Racer X Online | https://racerxonline.com/ | 0.95 | Validation, News, Results |

---

## Data Fetching Strategy

### Multi-Source Validation (Recommended)

For critical data (schedules, results), fetch from **multiple sources** and validate:

```typescript
// Fetch from top 3 sources
const sources = [
  fetchFromSuperMotocross(),     // Official #1
  fetchFromSupercrossLIVE(),     // Official #2
  fetchFromProMotocross(),       // Official #3
];

// Require 2 out of 3 agreement
const validated = validateConsensus(sources, {
  minimumAgreement: 2,
  tiebreaker: 'supermotocross' // Use #1 if tied
});
```

### Single-Source (Fast, for updates)

For updates where speed matters, use **primary source only**:

```typescript
// Fast fetch from most reliable
const data = await fetchFromSuperMotocross();
```

---

## Implementation Plan

### Phase 1: Primary Source (supermotocross.com)

**Priority**: Highest
**Status**: To be implemented

#### What to Fetch:
- **Schedule**: All races (Supercross + Motocross + SuperMotocross)
- **Results**: Positions, points, lap times
- **Riders**: Numbers, teams, status
- **Standings**: Championship points
- **Live Timing**: Real-time race positions (if available)

#### Implementation Steps:

1. **Study HTML Structure**
   ```bash
   curl https://www.supermotocross.com/schedule
   curl https://www.supermotocross.com/results
   curl https://www.supermotocross.com/riders
   ```

2. **Identify Data Patterns**
   - Find CSS classes or HTML structure for race data
   - Locate date formats, rider names, positions
   - Map their data to our schema

3. **Write Parser Function**
   ```typescript
   async function fetchFromSuperMotocross(dataType: 'schedule' | 'results' | 'riders') {
     const url = getUrlForDataType(dataType);
     const response = await fetchWithRetry(url);
     const html = await response.text();

     return parseSupermotocrossHTML(html, dataType);
   }
   ```

4. **Update sync-schedule Function**
   ```typescript
   const SOURCE_URL = 'https://www.supermotocross.com/schedule';
   const SOURCE_NAME = 'SuperMotocross Official';
   ```

---

### Phase 2: Secondary Source (supercrosslive.com)

**Priority**: High (backup/validation)
**Status**: To be implemented

#### What to Fetch:
- **Schedule**: Supercross only
- **Results**: Real-time and final
- **Live Timing**: Live race positions, lap times
- **Videos**: Race highlights (optional)

#### Use Cases:
1. **Validation**: Cross-reference with primary source
2. **Live Timing**: May have better live data
3. **Backup**: If primary source fails

#### Implementation:
```typescript
// In sync-schedule/index.ts
const PRIMARY_URL = 'https://www.supermotocross.com/schedule';
const BACKUP_URL = 'https://www.supercrosslive.com/schedule';

try {
  data = await fetchFromPrimary(PRIMARY_URL);
} catch (error) {
  console.warn('Primary failed, using backup');
  data = await fetchFromBackup(BACKUP_URL);
}
```

---

### Phase 3: Tertiary Source (promotocross.com)

**Priority**: Medium (Motocross specific)
**Status**: To be implemented

#### What to Fetch:
- **Schedule**: Lucas Oil Pro Motocross only
- **Results**: Outdoor racing
- **Riders**: Motocross-specific rosters
- **Tracks**: Outdoor track details

#### Use Cases:
1. **Motocross Specialization**: Better outdoor racing data
2. **Validation**: Third opinion for consensus
3. **Track Info**: Outdoor venue details

#### Implementation:
```typescript
// Only for MX series
if (series === 'mx') {
  const mxData = await fetchFromProMotocross();
  data = mergeSources([primaryData, mxData]);
}
```

---

### Phase 4: Validation Source (racerxonline.com)

**Priority**: Validation only (not primary)
**Status**: To be implemented

#### What to Fetch:
- **Results**: Post-race validation
- **News**: Rider injuries, team changes
- **Historical**: Past season data

#### Use Cases:
1. **Validation**: Cross-check critical data
2. **News Monitoring**: Injury updates, breaking news
3. **Discrepancy Resolution**: Tie-breaker

#### Implementation:
```typescript
// Validation check
const primaryResult = await fetchFromSuperMotocross();
const validationResult = await fetchFromRacerX();

if (primaryResult.winner !== validationResult.winner) {
  console.error('DISCREPANCY DETECTED:', {
    primary: primaryResult.winner,
    validation: validationResult.winner
  });
  // Flag for manual review
  await flagForReview(raceId, 'winner_mismatch');
}
```

---

## Multi-Source Consensus Algorithm

### Strategy: 2-of-3 Agreement

```typescript
interface SourceResult<T> {
  source: string;
  data: T;
  reliability: number;
}

async function fetchWithConsensus<T>(
  fetchers: Array<() => Promise<T>>,
  options: {
    minimumAgreement: number;
    compareFunc: (a: T, b: T) => boolean;
    tiebreaker?: string;
  }
): Promise<T> {

  // Fetch from all sources in parallel
  const results = await Promise.allSettled(
    fetchers.map(async (fetcher, index) => {
      try {
        const data = await fetcher();
        return {
          source: SOURCE_NAMES[index],
          data,
          reliability: SOURCE_RELIABILITY[index],
        };
      } catch (error) {
        return null;
      }
    })
  );

  // Filter successful fetches
  const successful = results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  if (successful.length === 0) {
    throw new Error('All sources failed');
  }

  // Find consensus
  const groups = groupByEquality(successful, options.compareFunc);

  // Find group with enough agreement
  for (const group of groups) {
    if (group.length >= options.minimumAgreement) {
      // Use highest reliability source from group
      return group.sort((a, b) => b.reliability - a.reliability)[0].data;
    }
  }

  // No consensus, use tiebreaker (highest reliability)
  if (options.tiebreaker) {
    const tiebreaker = successful.find(r => r.source === options.tiebreaker);
    if (tiebreaker) return tiebreaker.data;
  }

  // Fallback: highest reliability
  return successful.sort((a, b) => b.reliability - a.reliability)[0].data;
}
```

### Usage Example:

```typescript
// Fetch schedule with consensus
const schedule = await fetchWithConsensus(
  [
    () => fetchFromSuperMotocross('schedule'),
    () => fetchFromSupercrossLIVE('schedule'),
    () => fetchFromProMotocross('schedule'),
  ],
  {
    minimumAgreement: 2,
    compareFunc: (a, b) => {
      // Compare race dates (critical field)
      return a.map(r => r.date).join(',') === b.map(r => r.date).join(',');
    },
    tiebreaker: 'supermotocross',
  }
);
```

---

## HTML Scraping Templates

### Template 1: Schedule Data

```typescript
async function parseScheduleHTML(html: string, source: string): Promise<RaceScheduleItem[]> {

  // Example patterns (adjust based on actual HTML)

  if (source === 'supermotocross') {
    // Pattern for supermotocross.com
    const racePattern = /<div class="race-card">(.*?)<\/div>/gs;
    const matches = [...html.matchAll(racePattern)];

    return matches.map(match => {
      const raceHtml = match[1];

      // Extract data using regex or DOM parser
      const dateMatch = raceHtml.match(/<time.*?datetime="(.*?)">/);
      const nameMatch = raceHtml.match(/<h3.*?>(.*?)<\/h3>/);
      const venueMatch = raceHtml.match(/<span class="venue">(.*?)<\/span>/);

      return {
        id: generateRaceId(nameMatch[1], dateMatch[1]),
        name: nameMatch[1],
        date: dateMatch[1],
        venue: venueMatch[1],
        // ... other fields
      };
    });
  }

  if (source === 'supercrosslive') {
    // Pattern for supercrosslive.com
    // ... adjust based on their HTML structure
  }

  // ... other sources
}
```

### Template 2: Results Data

```typescript
async function parseResultsHTML(html: string, source: string): Promise<RaceResultItem[]> {

  if (source === 'supermotocross') {
    // Example: Results in a table
    const tablePattern = /<table class="results">(.*?)<\/table>/s;
    const tableMatch = html.match(tablePattern);

    if (!tableMatch) return [];

    const rowPattern = /<tr[^>]*>(.*?)<\/tr>/gs;
    const rows = [...tableMatch[1].matchAll(rowPattern)];

    return rows.slice(1).map(row => { // Skip header row
      const cells = row[1].match(/<td[^>]*>(.*?)<\/td>/gs);

      return {
        position: parseInt(cells[0].match(/\d+/)[0]),
        riderName: cells[1].match(/>([^<]+)</)[1],
        points: parseInt(cells[2].match(/\d+/)[0]),
        // ... other fields
      };
    });
  }

  // ... other sources
}
```

### Template 3: Rider Data

```typescript
async function parseRidersHTML(html: string, source: string): Promise<RiderDataItem[]> {

  if (source === 'supermotocross') {
    const riderPattern = /<div class="rider-profile">(.*?)<\/div>/gs;
    const matches = [...html.matchAll(riderPattern)];

    return matches.map(match => {
      const riderHtml = match[1];

      return {
        name: extractName(riderHtml),
        number: extractNumber(riderHtml),
        team: extractTeam(riderHtml),
        status: extractStatus(riderHtml),
        // ... other fields
      };
    });
  }

  // ... other sources
}
```

---

## Updating Sync Functions

### Update sync-schedule/index.ts

```typescript
// Before (mock data)
const SOURCE_NAME = 'SupercrossLIVE Schedule';
const SOURCE_URL = 'https://www.supercrosslive.com/schedule';

// After (actual implementation)
const PRIMARY_SOURCE = {
  name: 'SuperMotocross Official',
  url: 'https://www.supermotocross.com/schedule',
  reliability: 1.00,
};

const BACKUP_SOURCES = [
  {
    name: 'SupercrossLIVE Schedule',
    url: 'https://www.supercrosslive.com/schedule',
    reliability: 0.98,
  },
  {
    name: 'ProMotocross Schedule',
    url: 'https://promotocross.com/schedule',
    reliability: 0.98,
  },
];

async function fetchScheduleData(url: string): Promise<RaceScheduleItem[]> {
  const response = await fetchWithRetry(url);
  const html = await response.text();

  // Determine source from URL
  const source = getSourceFromUrl(url);

  // Parse HTML based on source
  return parseScheduleHTML(html, source);
}
```

### Update sync-results/index.ts

```typescript
const PRIMARY_SOURCE = {
  name: 'SuperMotocross Results',
  url: 'https://www.supermotocross.com/results',
  reliability: 1.00,
};

const VALIDATION_SOURCES = [
  {
    name: 'SupercrossLIVE Results',
    url: 'https://www.supercrosslive.com/results',
    reliability: 0.98,
  },
  {
    name: 'Racer X Results',
    url: 'https://racerxonline.com/results',
    reliability: 0.95,
  },
];

// Fetch with validation
async function fetchResultsData(raceId: string): Promise<RaceWithResults> {
  // Fetch from primary
  const primary = await fetchFromSource(PRIMARY_SOURCE.url, raceId);

  // Validate with secondary (optional but recommended)
  try {
    const validation = await fetchFromSource(VALIDATION_SOURCES[0].url, raceId);

    if (!resultsMatch(primary, validation)) {
      console.warn('Results mismatch between sources!', {
        primary: primary.results.slice(0, 3),
        validation: validation.results.slice(0, 3),
      });
      // Flag for manual review
      await flagDiscrepancy(raceId, 'results_mismatch');
    }
  } catch (error) {
    console.warn('Validation failed, using primary only');
  }

  return primary;
}
```

### Update sync-riders/index.ts

```typescript
const PRIMARY_SOURCE = {
  name: 'SuperMotocross Riders',
  url: 'https://www.supermotocross.com/riders',
  reliability: 1.00,
};

async function fetchRidersData(url: string): Promise<RiderDataItem[]> {
  const response = await fetchWithRetry(url);
  const html = await response.text();

  const source = getSourceFromUrl(url);
  return parseRidersHTML(html, source);
}
```

---

## Testing Strategy

### Step 1: Manual Testing (Browser)

```bash
# Visit each source in browser
open https://www.supermotocross.com/schedule
open https://www.supercrosslive.com/schedule
open https://promotocross.com/schedule
open https://racerxonline.com/
```

**Study**:
- HTML structure
- CSS classes
- Data format (dates, names, etc.)
- Any JavaScript-rendered content

### Step 2: cURL Testing

```bash
# Fetch raw HTML
curl -H "User-Agent: MotoSenseBot/1.0" \
  https://www.supermotocross.com/schedule > schedule.html

# Examine HTML
cat schedule.html | grep -i "race"
```

### Step 3: Parser Testing

```typescript
// Test parser with real HTML
const testHtml = await Deno.readTextFile('./test-data/schedule.html');
const parsed = parseScheduleHTML(testHtml, 'supermotocross');
console.log('Parsed races:', parsed);
```

### Step 4: Integration Testing

```bash
# Deploy function
supabase functions deploy sync-schedule

# Test with real data
curl -X POST \
  'https://YOUR_REF.supabase.co/functions/v1/sync-schedule' \
  -H 'Authorization: Bearer YOUR_KEY'

# Check database
psql -c "SELECT * FROM races ORDER BY date DESC LIMIT 5;"
```

---

## Handling Edge Cases

### JavaScript-Rendered Content

If sites use JavaScript to load data:

**Option 1: Find API endpoint** (inspect Network tab)
```typescript
// Many sites have hidden API endpoints
const apiUrl = 'https://www.supermotocross.com/api/schedule';
const response = await fetch(apiUrl);
const data = await response.json(); // Already parsed!
```

**Option 2: Use headless browser** (Puppeteer/Playwright)
```typescript
import puppeteer from 'puppeteer';

async function fetchWithBrowser(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector('.race-card'); // Wait for content
  const html = await page.content();
  await browser.close();
  return html;
}
```

### Rate Limiting

All sources already configured with rate limits in database:
- SuperMotocross: 30 req/hour
- SupercrossLIVE: 30 req/hour
- ProMotocross: 30 req/hour
- Racer X: 60 req/hour

Enforced automatically by `checkRateLimit()` in shared utilities.

### Data Discrepancies

When sources disagree:

```typescript
function handleDiscrepancy(field: string, sources: SourceResult[]) {
  // Log for manual review
  await supabase.from('data_discrepancies').insert({
    field,
    race_id: raceId,
    sources: sources.map(s => ({ name: s.source, value: s.data[field] })),
    resolved: false,
  });

  // Use highest reliability source
  const best = sources.sort((a, b) => b.reliability - a.reliability)[0];
  return best.data[field];
}
```

---

## Migration Update

Update `migration-006-data-sync-infrastructure.sql` with correct sources:

```sql
-- Update existing sources with correct URLs
UPDATE data_sources SET
  url = 'https://www.supermotocross.com/schedule',
  reliability_score = 1.00,
  is_official = true
WHERE name = 'SuperMotocross Official';

-- Add new official sources
INSERT INTO data_sources (name, category, url, is_official, reliability_score, rate_limit_requests, rate_limit_period)
VALUES
  ('SuperMotocross Official', 'schedule', 'https://www.supermotocross.com/schedule', true, 1.00, 30, 3600),
  ('SuperMotocross Results', 'results', 'https://www.supermotocross.com/results', true, 1.00, 30, 3600),
  ('SuperMotocross Riders', 'riders', 'https://www.supermotocross.com/riders', true, 1.00, 30, 3600),

  ('SupercrossLIVE Schedule', 'schedule', 'https://www.supercrosslive.com/schedule', true, 0.98, 30, 3600),
  ('SupercrossLIVE Results', 'results', 'https://www.supercrosslive.com/results', true, 0.98, 30, 3600),
  ('SupercrossLIVE Live Timing', 'live', 'https://www.supercrosslive.com/live', true, 0.98, 60, 60),

  ('ProMotocross Schedule', 'schedule', 'https://promotocross.com/schedule', true, 0.98, 30, 3600),
  ('ProMotocross Results', 'results', 'https://promotocross.com/results', true, 0.98, 30, 3600),

  ('Racer X Results', 'results', 'https://racerxonline.com/results', false, 0.95, 60, 3600),
  ('Racer X News', 'news', 'https://racerxonline.com/news', false, 0.95, 60, 3600);
```

---

## Implementation Roadmap

### Week 1: Primary Source (SuperMotocross)
- [ ] Study HTML structure of supermotocross.com
- [ ] Implement schedule parser
- [ ] Implement results parser
- [ ] Implement riders parser
- [ ] Test with real data
- [ ] Deploy and monitor

### Week 2: Secondary Source (SupercrossLIVE)
- [ ] Study HTML structure
- [ ] Implement parsers
- [ ] Add as backup to sync functions
- [ ] Test validation between sources
- [ ] Deploy

### Week 3: Tertiary Source (ProMotocross)
- [ ] Study HTML structure (MX-specific)
- [ ] Implement parsers
- [ ] Add MX-specific logic
- [ ] Test with outdoor racing data
- [ ] Deploy

### Week 4: Validation Source (Racer X)
- [ ] Study HTML structure
- [ ] Implement validation checks
- [ ] Add discrepancy detection
- [ ] Test conflict resolution
- [ ] Deploy

### Week 5: Multi-Source Consensus
- [ ] Implement consensus algorithm
- [ ] Add 2-of-3 validation
- [ ] Test with all sources
- [ ] Monitor for discrepancies
- [ ] Optimize

---

## Monitoring Multi-Source Health

### Query: Source Agreement Rate

```sql
-- How often do sources agree?
SELECT
  dc.field_name,
  COUNT(*) as discrepancies,
  COUNT(DISTINCT dc.entity_id) as affected_entities
FROM data_changes dc
JOIN sync_history sh ON sh.id = dc.sync_history_id
WHERE dc.significance IN ('high', 'critical')
  AND sh.started_at > NOW() - INTERVAL '7 days'
GROUP BY dc.field_name
ORDER BY discrepancies DESC;
```

### Query: Source Reliability Over Time

```sql
-- Track which sources fail most often
SELECT
  ds.name,
  ds.reliability_score,
  COUNT(*) FILTER (WHERE sh.status = 'success') as successes,
  COUNT(*) FILTER (WHERE sh.status = 'failed') as failures,
  ROUND(
    COUNT(*) FILTER (WHERE sh.status = 'success')::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as success_rate_percent
FROM data_sources ds
JOIN sync_history sh ON sh.source_id = ds.id
WHERE sh.started_at > NOW() - INTERVAL '30 days'
GROUP BY ds.id, ds.name, ds.reliability_score
ORDER BY success_rate_percent ASC;
```

---

## Summary

### Official Sources (In Priority Order)

1. **supermotocross.com** - Primary, highest reliability (1.00)
2. **supercrosslive.com** - Secondary, Supercross specific (0.98)
3. **promotocross.com** - Tertiary, Motocross specific (0.98)
4. **racerxonline.com** - Validation, highly accurate (0.95)

### Implementation Strategy

✅ **Use multi-source validation** for critical data (schedules, results)
✅ **Fetch from primary first**, fallback to backups if needed
✅ **Cross-reference results** between sources to catch errors
✅ **Flag discrepancies** for manual review
✅ **Adjust reliability scores** based on observed accuracy

### Next Actions

1. Study HTML structure of each site
2. Implement parsers (start with supermotocross.com)
3. Update sync functions with real URLs
4. Test with live data
5. Deploy incrementally
6. Monitor for discrepancies

---

**All sources identified and prioritized. Ready to implement real data fetching!**

