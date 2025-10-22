# Legal Compliance Guide

## Overview

This document provides guidelines for protecting MotoSense from potential legal issues related to data sourcing, brand mentions, and intellectual property.

---

## ⚠️ Key Principle

**Never reveal specific data sources to end users.** Keep source attribution internal (in code, admin tools, and documentation) but generic in user-facing content.

---

## User-Facing Guidelines

### ✅ DO SAY (User-Facing)

**Generic References:**
- "publicly available sources"
- "multiple racing data sources"
- "aggregated from the internet"
- "validated racing information"
- "sourced from public racing schedules"
- "compiled from various sources"

**Disclaimers:**
- "This app is not affiliated with any racing organization"
- "For official information, consult event organizers"
- "All trademarks remain property of their owners"
- "Data accuracy depends on public sources"

**Example (GOOD):**
> "MotoSense aggregates racing information from multiple publicly available sources on the internet. We continuously monitor and validate data to provide accurate information."

### ❌ DON'T SAY (User-Facing)

**Avoid Specific Mentions:**
- ~~"Monster Energy Supercross"~~ → "racing events"
- ~~"AMA"~~ → "sanctioning bodies"
- ~~"Feld Entertainment"~~ → "event organizers"
- ~~"Racer X"~~ → (don't mention third-party sites)
- ~~"SupercrossLIVE.com"~~ → (don't mention websites)
- ~~"data scraped from..."~~ → "data aggregated from..."

**Example (BAD):**
> ~~"We pull data from SupercrossLIVE.com and Racer X to bring you the latest information."~~

**Example (FIXED):**
> "We aggregate data from public racing sources to bring you the latest information."

---

## Series Terminology (CRITICAL)

### ✅ SAFE Terms (Generic Sport Names)

**Always use these in user-facing content:**
- **"Supercross"** - Generic term for indoor motorcycle racing (SAFE)
- **"Motocross"** - Generic term for outdoor motorcycle racing (SAFE)
- **"Championship"** or **"Championship Series"** - Generic term for combined playoffs (SAFE)

### ❌ AVOID Terms (Likely Trademarked)

**NEVER use these in user-facing content:**
- ~~"SuperMotocross"~~ → Use **"Championship"** or **"Championship Series"**
- ~~"SMX"~~ → Use **"Championship"**
- ~~"Monster Energy Supercross"~~ → Use **"Supercross"**
- ~~"Lucas Oil Pro Motocross"~~ → Use **"Motocross"**

### Safe vs. Risky Examples

| Context | ❌ AVOID (Risky) | ✅ USE (Safe) |
|---------|------------------|---------------|
| Round label | "SMX Round 1" | "Championship Round 1" |
| Standings | "SuperMotocross Standings" | "Championship Standings" |
| Filter | "SMX Only" | "Championship Only" |
| Event name | "SuperMotocross Playoff" | "Championship Playoff" |
| Description | "SMX combines SX and MX" | "Championship combines supercross and motocross" |

### Implementation

**Use the seriesDisplay utility:**
```typescript
import { getSeriesDisplayName } from '@/utils/seriesDisplay';

// In component:
<Text>{getSeriesDisplayName(race.series)}</Text>
// Output: "Supercross" or "Motocross" or "Championship"
// NEVER outputs "SuperMotocross" or "SMX"
```

### Why This Matters

- **"Supercross" and "Motocross"** are generic terms describing types of racing (like "basketball" or "football") - completely safe to use
- **"SuperMotocross"** is a specific branded championship series owned by Feld Entertainment/MX Sports - using it could imply official affiliation
- **Generic alternatives** provide the same information without legal risk

---

## Internal Documentation Guidelines

### Code & Developer Docs

**Internal code and developer documentation CAN mention specific sources** for implementation purposes, but should include warnings:

```typescript
// INTERNAL USE ONLY - Do not expose source URLs to users
const SCHEDULE_SOURCE = 'https://example-racing-site.com/schedule';
```

**Add warnings in documentation:**
```markdown
<!-- INTERNAL DOCUMENTATION -->
<!-- Source URLs and provider names are for developer reference only -->
<!-- Do not display source names in user-facing UI -->
```

### Admin Tools

Admin interfaces can show source information since they're internal-only, but add disclaimers:

```typescript
// Admin panel - not accessible to regular users
<Text style={styles.adminNote}>
  Admin View: Source tracking for internal monitoring only
</Text>
```

---

## Generic Terminology Reference

### Racing Organizations → Generic Terms

| **Avoid (Specific)** | **Use (Generic)** |
|----------------------|-------------------|
| Monster Energy Supercross | indoor racing series |
| AMA Supercross | professional racing series |
| Lucas Oil Pro Motocross | outdoor racing series |
| AMA (American Motorcyclist Association) | sanctioning body / racing organization |
| Feld Entertainment | event promoter / race organizer |
| MX Sports | series organizer |

### Data Sources → Generic Terms

| **Avoid (Specific)** | **Use (Generic)** |
|----------------------|-------------------|
| SupercrossLIVE.com | official racing sources |
| Racer X Online | racing news sources |
| MXGP Results | results databases |
| Cycle News | racing publications |
| Vital MX | racing community sites |

### Events & Venues → Generic Terms

| **Avoid (Specific)** | **Use (Generic)** |
|----------------------|-------------------|
| Anaheim 1 | season opener / first round |
| Angel Stadium | event venue / racing facility |
| Monster Energy Cup | championship events |

---

## Disclaimer Wording

### Current App Disclaimer

The `DataDisclaimerModal` component contains legally reviewed wording:

**Key Sections:**
1. **Data Sources**: "Multiple publicly available sources"
2. **Accuracy Notice**: Dependent on public source accuracy
3. **No Affiliation**: Not endorsed by any racing organization
4. **User Responsibility**: Official info from event organizers
5. **Data Updates**: Automatic but may have delays
6. **Reporting Issues**: Contact us for corrections

### Where Disclaimers Appear

1. **Profile Screen**: "Data & Disclaimer" button
2. **First Launch** (TODO): Show once on initial app install
3. **About/Settings**: Link from settings/about page

---

## Trademark Considerations

### General Rules

1. **Don't use trademarks in app name**: ✅ "MotoSense" (generic) vs ❌ "Supercross Predictor"

2. **Don't use trademarked logos**: No official series logos in app assets

3. **Don't imply endorsement**: Never say "official" or "endorsed by"

4. **Fair use of factual data**: Results, schedules, rider names are factual (not copyrightable)

5. **Descriptive use is OK**: Can say "predictions for racing events" without mentioning specific series

### Safe Descriptions

**App Store Description:**
```
✅ GOOD:
"MotoSense helps fans predict racing outcomes and compete with friends.
Make predictions for upcoming events, track your accuracy, and climb
the leaderboard!"

❌ AVOID:
"The ultimate app for Monster Energy Supercross predictions! Official
data from AMA Supercross."
```

### Brand Usage in Context

**Can mention** (factual context):
- "Supports prediction tracking for professional racing events"
- "Compatible with major racing series schedules"

**Cannot claim**:
- ~~"Official app of [Brand]"~~
- ~~"Partnered with [Organization]"~~
- ~~"Authorized by [Series]"~~

---

## Web Scraping Compliance

### Legal Considerations

1. **robots.txt Compliance**: Always respect robots.txt directives
2. **Terms of Service**: Review and comply with website ToS
3. **Rate Limiting**: Never overload servers (use respectful delays)
4. **User-Agent**: Identify as bot, provide contact info
5. **Public Data Only**: Only access publicly visible information

### Safe Practices

```typescript
// Good: Respectful scraping
const headers = {
  'User-Agent': 'MotoSenseBot/1.0 (+https://motosense.app/bot-info)',
  'Accept': 'text/html',
};

// Rate limit: 30 requests per hour
await delay(120000); // 2 minutes between requests
```

### Factual Data Defense

**Safe to use** (not copyrightable):
- Race dates and times (facts)
- Venue names and locations (facts)
- Rider names and numbers (facts)
- Race results and positions (facts)
- Point standings (facts)

**Not safe to use** (copyrightable):
- Original articles/commentary
- Photos and videos
- Official logos and graphics
- Proprietary analysis
- Marketing materials

---

## Future Official Partnerships

### Path to Legitimacy

If pursuing official data licensing:

1. **Contact Rights Holders**:
   - Event promoters (Feld, MX Sports)
   - Sanctioning bodies (AMA)
   - Data providers (ALT Sports Data)

2. **Proposal Elements**:
   - App user base and engagement metrics
   - Revenue sharing opportunities
   - Fan engagement value proposition
   - Licensing fee proposals

3. **Benefits of Partnership**:
   - Real-time official data
   - Legal protection
   - Marketing opportunities
   - "Official" designation

### Until Then

**Maintain defensive position**:
- Generic terminology in UI
- Clear disclaimers
- No false affiliation claims
- Factual data usage only
- Respectful data collection

---

## Checklist for New Features

Before releasing any new feature, verify:

- [ ] No specific brand names in user-facing text
- [ ] No official logos or trademarked images
- [ ] Disclaimers visible and accessible
- [ ] Data sources not revealed to users
- [ ] Generic terminology used consistently
- [ ] No false affiliation claims
- [ ] Factual data only (not copyrighted content)
- [ ] Respectful scraping practices (if applicable)
- [ ] User-agent identifies as bot (if scraping)
- [ ] Rate limits respected

---

## Response to Legal Concerns

### If Contacted by Rights Holder

**Immediate Actions**:
1. Respond professionally and promptly
2. Demonstrate good faith efforts to comply
3. Disable contentious feature immediately if requested
4. Document all communication
5. Consult legal counsel if necessary

**Key Points to Communicate**:
- Using publicly available factual data only
- No claim of affiliation or endorsement
- Willing to modify or remove content
- Open to partnership discussions
- Respect for intellectual property

### Cease and Desist Response

**DO**:
- Take request seriously
- Respond within stated deadline
- Remove/modify as requested
- Keep communication professional
- Document everything

**DON'T**:
- Ignore the request
- Argue about fair use without legal counsel
- Continue infringing behavior
- Make public statements about dispute

---

## Current Compliance Status

### ✅ Implemented

- [x] Generic data source descriptions
- [x] Comprehensive disclaimer modal
- [x] User-accessible disclaimer (Profile screen)
- [x] No specific brand mentions in UI
- [x] No official logos used
- [x] Factual data only
- [x] Respectful data collection framework

### 🔄 To Implement

- [ ] First-launch disclaimer flow
- [ ] About/Settings page with legal info
- [ ] User-agent for web scraping
- [ ] robots.txt compliance checks
- [ ] Contact form for reporting issues

### 📋 Ongoing

- [ ] Monitor for brand mentions in future features
- [ ] Update disclaimers as needed
- [ ] Review Terms of Service of data sources periodically
- [ ] Pursue official partnerships when viable

---

## Sample Responses

### User Asks: "Where does this data come from?"

**Good Response:**
> "We aggregate racing information from multiple publicly available sources on the internet. Our system continuously monitors and validates data for accuracy. For official and legally binding information, please refer to event organizers."

**Bad Response:**
> ~~"We scrape data from SupercrossLIVE.com and Racer X."~~

### User Reports: "This data is wrong!"

**Good Response:**
> "Thank you for reporting this. While we validate data from multiple sources, information can change rapidly. We'll investigate and update as soon as possible. For the most up-to-date official information, please check with event organizers."

### Media Asks: "Are you affiliated with [Series]?"

**Good Response:**
> "No, MotoSense is an independent fan application not affiliated with, endorsed by, or officially connected to any racing series or sanctioning body. We use publicly available information to provide fans with prediction tracking tools."

---

## Legal Disclaimers to Include

### App Store Descriptions

```
MotoSense is an independent application not affiliated with, endorsed by,
or officially connected to any racing series, sanctioning body, or event
organizer. All trademarks and racing-related content remain the property
of their respective owners. This app is for informational and entertainment
purposes only.
```

### Website Footer

```
© 2025 MotoSense. Not affiliated with any racing organization.
All racing trademarks and content are property of their respective owners.
Data sourced from publicly available information.
For official information, consult event organizers.
```

### App About Screen

```
MotoSense is an independent fan application providing prediction tracking
for racing enthusiasts. We are not affiliated with any racing series or
sanctioning body. Information is aggregated from publicly available sources
and is provided for entertainment purposes only.
```

---

## Summary

**The Golden Rule**: Be generic in public, specific in private.

- ✅ Users see: "racing series", "public sources", "event organizers"
- ✅ Devs see: Actual URLs and source names for implementation
- ✅ Always disclaim: No affiliation, accuracy limitations, factual data use
- ✅ Always respect: Rate limits, robots.txt, Terms of Service, intellectual property

**When in doubt**: Use more generic language, add more disclaimers, and consult legal counsel.

---

*Last Updated: January 2025*
*Review Quarterly or When Adding Major Features*
