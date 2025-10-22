# MotoSense Real-Time Data Strategy

## Executive Summary

This document outlines the comprehensive data architecture for MotoSense to provide the most accurate, real-time racing data to users. Since official Supercross/Motocross APIs are not publicly available, we'll implement a multi-tiered approach combining official sources, third-party providers, and automated monitoring.

---

## Current Situation

### Research Findings (January 2025)

**Official Sources:**
- ❌ **No Public API**: AMA Supercross and Monster Energy do not provide public APIs
- ✅ **Official Websites**:
  - `results.supercrosslive.com` - Official race results
  - `live.supercrosslive.com` - Live timing during races
  - `www.supercrosslive.com` - Event information
- 🔒 **Exclusive Data Partner**: ALT Sports Data has exclusive rights to SMX data for sports betting
- 📱 **SMX App**: SuperMotocross Video Pass app provides live timing

**Third-Party Sources:**
- ✅ **Racer X Online** (`racerxonline.com`) - Reliable results and news
- ✅ **MXGP Results** (`mxgpresults.com`) - Comprehensive results database
- ✅ **Cycle News** (`cyclenews.com`) - Race coverage and results
- ✅ **Vital MX** (`vitalmx.com`) - Community and results

**Weather:**
- ✅ **Open-Meteo API** - Already implemented, excellent free weather API

---

## Data Requirements by Category

### 1. Race Schedule & Events (Critical)
- **Data Points**: Date, time, venue, series (SX/MX), round number, status
- **Update Frequency**: Daily check, immediate on change
- **Primary Source**: SupercrossLIVE official schedule
- **Backup Sources**: Racer X, MXGP Results
- **Reliability**: 🟢 High

### 2. Track Information (Critical)
- **Data Points**: Name, location, coordinates, type (supercross/outdoor), soil type, length, capacity
- **Update Frequency**: Weekly (track config changes)
- **Primary Source**: Official event pages, venue websites
- **Backup Sources**: Racer X track guides, Vital MX
- **Reliability**: 🟢 High

### 3. Race Results (Critical)
- **Data Points**: Position 1-20, rider IDs, lap times, DNS/DNF status
- **Update Frequency**: Real-time during race, final within 1 hour post-race
- **Primary Source**: results.supercrosslive.com
- **Backup Sources**: Racer X, MXGP Results, Cycle News
- **Reliability**: 🟢 High

### 4. Rider Information (High Priority)
- **Data Points**: Name, number, team, bike, career stats, bio, social media
- **Update Frequency**: Weekly (team changes, injuries)
- **Primary Source**: Official team websites, SupercrossLIVE
- **Backup Sources**: Racer X rider profiles, team social media
- **Reliability**: 🟡 Medium-High

### 5. Live Timing (High Priority)
- **Data Points**: Current position, lap times, gaps, sector times
- **Update Frequency**: Real-time (seconds)
- **Primary Source**: live.supercrosslive.com
- **Implementation**: WebSocket monitoring or rapid polling
- **Reliability**: 🟡 Medium (requires active monitoring)

### 6. Weather Data (High Priority)
- **Data Points**: Forecast, temperature, precipitation, wind, conditions
- **Update Frequency**: Hourly
- **Primary Source**: Open-Meteo API ✅ Already implemented
- **Reliability**: 🟢 High

### 7. Historical Statistics (Medium Priority)
- **Data Points**: Season standings, win records, podium history, head-to-head
- **Update Frequency**: Post-race (24 hours)
- **Primary Source**: MXGP Results, Racer X archives
- **Backup Sources**: Official standings pages
- **Reliability**: 🟢 High

### 8. Track Facility Information (Nice-to-Have)
- **Data Points**: Parking, concessions, seating, accessibility, photos
- **Update Frequency**: Monthly
- **Primary Source**: Venue websites, Google Places API
- **Reliability**: 🟡 Medium

### 9. Injury Reports & News (Nice-to-Have)
- **Data Points**: Rider status, injury updates, lineup changes
- **Update Frequency**: Daily
- **Primary Source**: Racer X news, team social media
- **Implementation**: RSS feed monitoring, social media APIs
- **Reliability**: 🟡 Medium

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     MotoSense Mobile App                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Read Data
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                       │
│  Tables: races, tracks, riders, results, weather_cache      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Write Data
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Data Sync)             │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Schedule Sync│  │ Results Sync │  │ Rider Sync   │      │
│  │  (Daily)     │  │ (Real-time)  │  │  (Weekly)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Live Timing  │  │ Weather Sync │  │ Change       │      │
│  │ (Race days)  │  │  (Hourly)    │  │ Detection    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Fetch Data
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Sources                            │
│                                                               │
│  Official:                Third-Party:         APIs:          │
│  • SupercrossLIVE        • Racer X            • Open-Meteo   │
│  • Live timing           • MXGP Results       • Google Places│
│  • Results pages         • Cycle News                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Set up core data infrastructure

- ✅ Already done: Weather API integration
- 🔄 Create database migrations for real data tables
- 🔄 Implement Supabase Edge Functions framework
- 🔄 Set up change detection system
- 🔄 Create data validation layer

**Deliverables:**
- Database schema for all data entities
- Edge function boilerplate
- Change detection algorithm
- Data validation utilities

### Phase 2: Schedule & Track Data (Week 3)
**Goal**: Replace mock race/track data with real data

- 🔄 Implement schedule scraper from SupercrossLIVE
- 🔄 Build track information aggregator
- 🔄 Create automated schedule updates (daily cron)
- 🔄 Validate and normalize track coordinates

**Deliverables:**
- Real race schedule in database
- Accurate track information
- Daily schedule update job

### Phase 3: Results Integration (Week 4)
**Goal**: Automate race results ingestion

- 🔄 Build results scraper for multiple sources
- 🔄 Implement result validation (cross-reference sources)
- 🔄 Create post-race trigger for immediate updates
- 🔄 Integrate with existing scoring system

**Deliverables:**
- Automated results ingestion
- Multi-source validation
- Real-time score calculations

### Phase 4: Rider Data (Week 5)
**Goal**: Comprehensive rider profiles

- 🔄 Scrape rider information from official sources
- 🔄 Build team/rider relationship tracking
- 🔄 Implement injury/status monitoring
- 🔄 Weekly rider data updates

**Deliverables:**
- Complete rider database
- Rider status tracking
- Team affiliations

### Phase 5: Live Timing (Week 6-7)
**Goal**: Real-time race updates

- 🔄 Build live timing monitor (WebSocket/polling)
- 🔄 Implement race-day data pipeline
- 🔄 Create push notification triggers
- 🔄 Cache management for high-traffic

**Deliverables:**
- Live race position updates
- Real-time notifications
- Optimized caching

### Phase 6: Advanced Features (Week 8+)
**Goal**: Enhanced user experience

- 🔄 Historical statistics database
- 🔄 Head-to-head comparisons
- 🔄 Track facility information
- 🔄 News/injury RSS feed integration
- 🔄 Social media monitoring

---

## Technical Implementation

### 1. Supabase Edge Functions

**Why Edge Functions?**
- Serverless execution (no infrastructure management)
- Built-in scheduling with pg_cron
- Direct database access
- Cost-effective for sporadic workloads

**Function Structure:**
```typescript
// supabase/functions/sync-schedule/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Fetch data from source
  // Validate and normalize
  // Detect changes
  // Update database
  // Return status
})
```

### 2. Change Detection Algorithm

**Hash-Based Tracking:**
```typescript
interface DataSnapshot {
  source_url: string;
  content_hash: string;
  last_checked: timestamp;
  last_changed: timestamp;
}

// Calculate hash of fetched content
const newHash = await hashContent(fetchedData);

// Compare with stored hash
const hasChanged = newHash !== storedSnapshot.content_hash;

if (hasChanged) {
  // Process updates
  // Notify admins
  // Log change
}
```

### 3. Multi-Source Validation

**Consensus Algorithm:**
```typescript
// Fetch results from 3 sources
const sources = [
  fetchSupercrossLive(),
  fetchRacerX(),
  fetchMXGPResults()
];

// Compare and validate
const validatedResults = await validateConsensus(sources, {
  minimumAgreement: 2,  // At least 2 sources must agree
  conflictResolution: 'official_priority'  // Prefer official source
});
```

### 4. Rate Limiting & Caching

**Respectful Scraping:**
```typescript
const RATE_LIMITS = {
  supercrosslive: { requests: 30, period: '1 hour' },
  racerx: { requests: 60, period: '1 hour' },
  mxgpresults: { requests: 60, period: '1 hour' }
};

// Cache layer
const CACHE_TTL = {
  schedule: '24 hours',
  results: '1 hour',
  riders: '7 days',
  tracks: '30 days'
};
```

### 5. Error Handling & Monitoring

**Robust Error Management:**
```typescript
// Retry failed requests with exponential backoff
const fetchWithRetry = async (url, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) {
        await logError(error);
        await notifyAdmin(error);
        throw error;
      }
      await delay(Math.pow(2, i) * 1000);
    }
  }
};
```

---

## Data Quality Assurance

### Validation Rules

1. **Race Schedule:**
   - Date must be future or recent past
   - Venue must match known track list
   - No duplicate race IDs

2. **Race Results:**
   - Positions must be 1-20 (or valid DNS/DNF)
   - Each position used only once
   - Rider IDs must exist in database

3. **Rider Information:**
   - Number must be unique within series
   - Team affiliation validated
   - Required fields: name, number

4. **Track Data:**
   - Coordinates must be valid lat/long
   - Type must be 'supercross' or 'outdoor'
   - Name must be unique

### Anomaly Detection

```typescript
// Detect unusual patterns
const anomalyChecks = {
  // Results posted too quickly (< 30 min after race)
  prematureResults: (raceEndTime, resultPostTime) => {
    return resultPostTime - raceEndTime < 30 * 60 * 1000;
  },

  // Significant schedule change
  majorScheduleChange: (oldDate, newDate) => {
    return Math.abs(oldDate - newDate) > 7 * 24 * 60 * 60 * 1000;
  },

  // Unexpected winner (outside top 10 in standings)
  unexpectedWinner: (winnerStanding) => {
    return winnerStanding > 10;
  }
};
```

---

## Cost Analysis

### Data Source Costs

| Source | Type | Cost | Volume |
|--------|------|------|--------|
| Open-Meteo | API | **Free** | 10k calls/day |
| Web Scraping | Infrastructure | **$0-5/mo** | Supabase Edge |
| Google Places | API | **$0-10/mo** | <100 calls/mo |
| **Total** | | **$0-15/mo** | |

### Supabase Costs (Free Tier)

- Edge Functions: 500K invocations/month (enough for hourly + race day)
- Database: 500MB (sufficient for season data)
- Bandwidth: 5GB egress/month

**Expected Usage**: Well within free tier for MVP

### Future Official API Costs

If we secure official API access:
- Estimated: $50-200/month for commercial use
- Benefits: Real-time accuracy, legal compliance, live timing

---

## Legal Considerations

### Web Scraping Compliance

**Best Practices:**
1. ✅ Respect `robots.txt` directives
2. ✅ Rate limit requests (not DDoS)
3. ✅ Cache aggressively (reduce load)
4. ✅ User-Agent identification
5. ✅ Only public data (no authentication bypass)
6. ✅ Terms of Service review

**Current Status**:
- Public race results are factual data (not copyrightable)
- Schedule information is publicly available
- Attribution provided to sources

**Risk Mitigation**:
- Monitor for cease-and-desist
- Ready to disable scrapers if requested
- Pursue official partnerships simultaneously

### Official Data Licensing Path

**Next Steps:**
1. Contact Feld Entertainment (Monster Energy Supercross)
2. Contact MX Sports Pro Racing (Lucas Oil Pro Motocross)
3. Propose partnership or licensing agreement
4. Demonstrate app value and user base

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Data Freshness**
   - Time since last successful sync
   - Alert if > 24 hours for schedule
   - Alert if > 2 hours for race results

2. **Data Accuracy**
   - Source agreement percentage
   - Validation failure rate
   - User-reported corrections

3. **System Health**
   - Sync success rate (target: >99%)
   - API response times
   - Error rates by source

### Alert Channels

- **Critical**: Email + SMS to admin
- **Warning**: Email notification
- **Info**: Dashboard logging

---

## Future Enhancements

### Year 2+

1. **Machine Learning**
   - Predict race outcomes based on historical data
   - Identify data anomalies automatically
   - Personalized rider recommendations

2. **User-Generated Content**
   - Allow users to submit track photos
   - Community-validated rider updates
   - Crowdsourced facility information

3. **Advanced Analytics**
   - Lap time analysis
   - Weather impact correlation
   - Rider performance trends

4. **Official Partnerships**
   - Direct API integrations
   - Exclusive features
   - Revenue sharing models

---

## Success Criteria

### Phase 1 Success Metrics

- [ ] 100% of races have accurate dates/venues
- [ ] Results posted within 2 hours of race end
- [ ] Weather data 99.9% uptime
- [ ] Zero data-related user complaints

### Long-term Goals

- [ ] Official data partnership secured
- [ ] Real-time live timing (< 5 sec delay)
- [ ] Comprehensive historical database (10+ years)
- [ ] 99.99% data accuracy

---

## Contact Information for Official Partnerships

### Key Organizations

1. **Feld Entertainment**
   - Company: Monster Energy Supercross operator
   - Website: feldentertainment.com
   - Data Partner: ALT Sports Data

2. **MX Sports Pro Racing**
   - Company: Lucas Oil Pro Motocross operator
   - Website: mxsports.com

3. **AMA (American Motorcyclist Association)**
   - Sanctioning body
   - Website: americanmotorcyclist.com

---

*Last Updated: January 2025*
*Next Review: Q2 2025*
