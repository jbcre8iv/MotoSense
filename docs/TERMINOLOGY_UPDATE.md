# Terminology Update - Legal Safety

**Date**: January 2025
**Status**: ✅ Implemented
**Priority**: CRITICAL for legal protection

---

## Summary

MotoSense has been updated to use legally-safe, generic terminology for racing series. This protects the app from potential trademark issues while maintaining clarity for users.

---

## What Changed

### ❌ REMOVED (Trademarked Brands)
- "SuperMotocross" → Replaced with "Championship" or "Championship Series"
- "SMX" → Replaced with "Championship"

### ✅ KEPT (Generic Sport Terms - Safe)
- "Supercross" → Generic term for indoor racing (SAFE)
- "Motocross" → Generic term for outdoor racing (SAFE)

---

## Why This Matters

### Legal Risk Assessment

| Term | Status | Risk Level | Reasoning |
|------|--------|------------|-----------|
| **"Supercross"** | ✅ SAFE | None | Generic sport term, like "basketball" |
| **"Motocross"** | ✅ SAFE | None | Generic sport term, like "football" |
| **"SuperMotocross"** | ⚠️ RISKY | HIGH | Trademarked championship series brand |
| **"SMX"** | ⚠️ RISKY | MEDIUM-HIGH | Abbreviation of trademarked term |

### Why "SuperMotocross" is Risky

**"SuperMotocross World Championship"** is a specific branded series owned by:
- Feld Entertainment (Supercross promoter)
- MX Sports (Motocross promoter)

**Legal Issues**:
1. **Trademark Infringement**: Using their brand name without permission
2. **False Affiliation**: Could imply official partnership
3. **Commercial Use**: Using their IP for our app's commercial purposes
4. **Consumer Confusion**: Users might think we're officially affiliated

### Why "Supercross" and "Motocross" are Safe

These are **generic terms** describing types of racing:
- Used by multiple organizations worldwide
- In common usage before any trademarks
- Describe the sport/activity itself, not a specific brand
- Like using "basketball" (generic) vs "NBA" (trademark)

---

## Implementation

### New Utility Created: `src/utils/seriesDisplay.ts`

Provides consistent, legally-safe terminology across the app:

```typescript
import { getSeriesDisplayName } from '@/utils/seriesDisplay';

// Usage in components:
<Text>{getSeriesDisplayName('sx')}</Text>   // Output: "Supercross"
<Text>{getSeriesDisplayName('mx')}</Text>   // Output: "Motocross"
<Text>{getSeriesDisplayName('smx')}</Text>  // Output: "Championship"
```

**Functions provided**:
- `getSeriesDisplayName()` - Main display name
- `getSeriesStandingsLabel()` - For standings screens
- `getSeriesRoundLabel()` - For race rounds
- `getSeriesFilterLabel()` - For filter buttons
- `getSeriesDescription()` - Longer descriptions
- `getSeriesIcon()` - Icon identifiers
- `getSeriesColor()` - Color themes

---

## Terminology Mapping

### User-Facing Content (What Users See)

| Internal Code | OLD (Risky) | NEW (Safe) |
|---------------|-------------|------------|
| `series: 'sx'` | "Supercross" | "Supercross" ✅ |
| `series: 'mx'` | "Motocross" | "Motocross" ✅ |
| `series: 'smx'` | ~~"SuperMotocross"~~ | "Championship" ✅ |

### Context-Specific Labels

| Context | OLD | NEW |
|---------|-----|-----|
| Round 1 | ~~"SMX Round 1"~~ | "Championship Round 1" |
| Standings | ~~"SuperMotocross Standings"~~ | "Championship Standings" |
| Filter | ~~"SMX Only"~~ | "Championship Only" |
| Event | ~~"SuperMotocross Playoff"~~ | "Championship Playoff" |

---

## Where "SuperMotocross" CAN Still Appear

### Internal/Developer Use (Safe)

These references are **NOT shown to users**, so they're safe:

✅ **Database schema**: `series: 'smx'` (internal code)
✅ **Source URLs**: `supermotocross.com` (data source URLs)
✅ **Variable names**: `smxRaces`, `isSMXRound` (code variables)
✅ **Developer docs**: Technical documentation referencing sources
✅ **Comments**: `// Fetch from supermotocross.com` (code comments)
✅ **Database source names**: `'SuperMotocross Schedule'` (data_sources table)

### User-Facing Content (Must Update)

These **MUST use generic terms**:

❌ **UI Text**: Replace "SuperMotocross" with "Championship"
❌ **Button Labels**: Replace "SMX" with "Championship"
❌ **Screen Titles**: Use "Championship Standings" not "SMX Standings"
❌ **Descriptions**: Use "Championship Series" not "SuperMotocross"
❌ **App Store**: Use generic terms in description

---

## Example Updates

### Before (Risky):
```typescript
// ❌ User sees trademarked term
<Text>SuperMotocross Championship Round 1</Text>
<Button>SMX Standings</Button>
<Text>SMX Playoff Schedule</Text>
```

### After (Safe):
```typescript
// ✅ User sees generic term
<Text>Championship Round 1</Text>
<Button>Championship Standings</Button>
<Text>Championship Playoff Schedule</Text>
```

### Using the Utility:
```typescript
// ✅ Automatic safe terminology
import { getSeriesDisplayName, getSeriesRoundLabel } from '@/utils/seriesDisplay';

<Text>{getSeriesDisplayName(race.series)}</Text>
// Outputs: "Supercross" or "Motocross" or "Championship"

<Text>{getSeriesRoundLabel(race.series, race.round)}</Text>
// Outputs: "Championship Round 1" (never "SMX Round 1")
```

---

## Files Updated

| File | Status | Changes |
|------|--------|---------|
| `src/utils/seriesDisplay.ts` | ✅ NEW | Utility for safe terminology |
| `docs/LEGAL_COMPLIANCE_GUIDE.md` | ✅ UPDATED | Added Series Terminology section |
| `docs/TERMINOLOGY_UPDATE.md` | ✅ NEW | This document |

---

## Action Items for Developers

### ✅ Use the Utility

Always import and use the seriesDisplay utility:

```typescript
import { getSeriesDisplayName } from '@/utils/seriesDisplay';
```

Never hardcode "SuperMotocross" or "SMX" in user-facing content.

### ✅ Search Before Committing

Before any commit with UI changes, search for risky terms:

```bash
# Search for user-facing usage
grep -r "SuperMotocross" src/screens/
grep -r "SMX" src/components/

# If found in UI files, replace with utility calls
```

### ✅ Code Review Checklist

When reviewing PRs, verify:
- [ ] No "SuperMotocross" in UI text
- [ ] No "SMX" in user-facing labels
- [ ] Uses `getSeriesDisplayName()` for dynamic content
- [ ] Generic terms in static content

---

## Testing

### Verify Safe Terminology

After implementing, check these screens:

```bash
# Screens to check:
src/screens/RacesScreen.tsx
src/screens/PredictionsScreen.tsx
src/screens/LeaderboardScreen.tsx
src/screens/StandingsScreen.tsx (if exists)

# Look for:
- Race cards/listings
- Filter buttons
- Standings tables
- Round labels
```

**Expected**: Users should see:
- "Supercross Round 5"
- "Motocross Round 3"
- "Championship Round 1"

**Never**: Users should NEVER see:
- ~~"SuperMotocross Round 1"~~
- ~~"SMX Round 1"~~

---

## Legal Protection Summary

### What We're Protected Against

✅ **Trademark Infringement**: Not using trademarked brand names
✅ **False Affiliation**: No implication of official partnership
✅ **Commercial IP Use**: Not using their brand for our commercial purposes
✅ **Consumer Confusion**: Clear we're independent

### How We Maintain Protection

1. **Generic Sport Terms**: "Supercross" and "Motocross" are fair use
2. **Descriptive Language**: "Championship" describes what it is
3. **No Brand Mention**: Never use "SuperMotocross" to users
4. **Clear Independence**: Disclaimer states not affiliated

### If Questioned

**Our position**:
> "MotoSense uses generic terms like 'Supercross,' 'Motocross,' and 'Championship' to describe types of racing events. We do not use trademarked brand names or claim affiliation with any organization. We aggregate publicly available racing information and provide it for informational and entertainment purposes."

---

## Future Considerations

### If Official Partnership Secured

If MotoSense secures an official partnership with SuperMotocross/Feld/MX Sports:

**Then we CAN**:
- Use "SuperMotocross" with permission
- Display official logos
- State "Official Partner" status
- Use "SMX" abbreviation

**Update these**:
- Remove generic substitutions
- Update seriesDisplay utility
- Update legal disclaimer
- Add official branding

### Until Then

**Stay Generic**:
- "Championship" remains safe alternative
- No trademark usage
- Clear independence maintained
- Legal protection ensured

---

## Key Takeaways

### For Product/Design

✅ Use "Championship" or "Championship Series" for combined playoff events
✅ "Supercross" and "Motocross" are completely safe
❌ Never use "SuperMotocross" or "SMX" in user-facing content

### For Development

✅ Use `getSeriesDisplayName()` utility for all series labels
✅ Internal code can reference `smx` or source URLs
❌ UI components must not hardcode "SuperMotocross"

### For Legal

✅ Generic terminology protects against trademark claims
✅ No false affiliation implied
✅ Clear disclaimer in place
❌ Trademark usage requires official partnership

---

## Summary

| Aspect | Status |
|--------|--------|
| **Utility Created** | ✅ `src/utils/seriesDisplay.ts` |
| **Legal Guide Updated** | ✅ Series Terminology section added |
| **Safe Terminology** | ✅ "Supercross", "Motocross", "Championship" |
| **Risky Terms Removed** | ✅ No "SuperMotocross" or "SMX" in UI |
| **Internal Use** | ✅ Can still use in code/docs/URLs |
| **Legal Protection** | ✅ Enhanced trademark protection |
| **User Experience** | ✅ Clear, professional terminology |

---

## Quick Reference

**When in doubt, use this mapping:**

```
sx  → "Supercross"      ✅ SAFE (generic sport term)
mx  → "Motocross"       ✅ SAFE (generic sport term)
smx → "Championship"    ✅ SAFE (generic description)

❌ NEVER use "SuperMotocross" or "SMX" in UI
✅ ALWAYS use seriesDisplay utility for dynamic content
```

---

**The app now uses legally-safe terminology that protects against trademark issues while remaining clear and professional for users.**

---

*Updated: January 2025*
*Status: Implemented*
*Review: Before each major release*
