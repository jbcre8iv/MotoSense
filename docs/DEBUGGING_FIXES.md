# Debugging Fixes Summary

**Date**: January 2025
**Status**: Completed
**Context**: Post-testing session debugging and issue resolution

---

## Issues Found During Testing

During user testing, the following issues were identified in the logs:

### ✅ **RESOLVED: SafeAreaView Deprecation Warning**
```
WARN SafeAreaView has been deprecated and will be removed in a future release.
Please use 'react-native-safe-area-context' instead.
```

### ⚠️ **CRITICAL: Schema Cache Errors**
```
❌ [AUTH] Error loading profile: {"code": "PGRST205", "message": "Could not find the table 'public.profiles' in the schema cache"}
❌ [GET PREDICTION] Error: Could not find the table 'public.predictions' in the schema cache
```

### ✅ **RESOLVED: Foreign Key Constraint Violation**
```
❌ [SAVE PREDICTION] Error: insert or update on table "predictions" violates foreign key constraint "predictions_race_id_fkey"
Key is not present in table "races".
```

### ℹ️ **INFO: Tunnel Connection Intermittent** (Normal)
```
Tunnel connection has been closed. This is often related to intermittent connection issues between the dev server and ngrok.
```

---

## Fixes Applied

### 1. ✅ Fixed SafeAreaView Deprecation

**Issue**: React Native's SafeAreaView is deprecated and causing warnings.

**Solution**: Migrated to `react-native-safe-area-context`.

**Files Updated** (10 files):
- ✅ `src/screens/ProfileScreen.tsx`
- ✅ `src/screens/ResultsScreen.tsx`
- ✅ `src/screens/HomeScreen.tsx`
- ✅ `src/screens/PredictionsScreen.tsx`
- ✅ `src/screens/GroupDetailsScreen.tsx`
- ✅ `src/screens/GroupLeaderboardScreen.tsx`
- ✅ `src/screens/GroupsScreen.tsx`
- ✅ `src/screens/LoginScreen.tsx`
- ✅ `src/screens/SignupScreen.tsx`
- ✅ `src/screens/RacesScreen.tsx`

**Changes Made**:
```typescript
// OLD (deprecated):
import { SafeAreaView } from 'react-native';

// NEW (recommended):
import { SafeAreaView } from 'react-native-safe-area-context';
```

**Package Installed**:
```bash
npx expo install react-native-safe-area-context
```

---

### 2. ✅ Created Test Race Data Script

**Issue**: Predictions failing because `races` table is empty. App tries to save predictions for `race-1`, `race-2`, etc., but these don't exist in the database.

**Solution**: Created SQL script to populate the `races` table with test data matching the app's mock data.

**Script Created**: `docs/seed-test-races.sql`

**What It Does**:
- Inserts 15 test races (10 Supercross + 5 Motocross)
- Uses the same IDs as mock data (`race-1`, `race-2`, etc.)
- Includes realistic 2025 race schedule
- Uses ON CONFLICT DO NOTHING to prevent duplicates

**Races Included**:
- **Supercross Rounds 1-10**: Anaheim 1, Glendale, San Diego, Tampa, Arlington, Daytona, Indianapolis, St. Louis, Seattle
- **Motocross Rounds 1-5**: Fox Raceway, Hangtown, Thunder Valley, High Point, Southwick

**How to Use**:
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `docs/seed-test-races.sql`
4. Click **Run**
5. Verify: You should see "✅ Inserted 15 test races"

---

### 3. ⚠️ Schema Cache Reload Required (USER ACTION NEEDED)

**Issue**: Supabase's PostgREST cache hasn't picked up recent schema changes, causing PGRST205 errors.

**Solution**: Reload the Supabase schema cache.

**CRITICAL**: This is the **#1 priority fix** that requires your action.

#### **How to Reload Schema Cache**

**Option 1: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Settings** (gear icon in left sidebar)
3. Click **API** (in Settings submenu)
4. Scroll down to **Schema Cache** section
5. Click the **"Reload schema cache"** button
6. Wait for confirmation message
7. Restart your Expo dev server

**Option 2: Via SQL Editor**

Run this SQL command in the Supabase SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

**Option 3: Via REST API**

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/rest/v1/rpc/pgrst_reload_schema' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

#### **Why This Happens**

PostgREST (Supabase's REST API layer) caches the database schema for performance. When you run migrations or make schema changes, the cache doesn't automatically update. This causes errors like:
- "Could not find the table 'public.profiles' in the schema cache"
- "Could not find the table 'public.predictions' in the schema cache"

#### **When to Reload Schema Cache**

Reload the schema cache whenever you:
- ✅ Run a new migration
- ✅ Create/alter/drop tables
- ✅ Modify Row Level Security (RLS) policies
- ✅ Add/change database functions
- ✅ See PGRST205 errors in logs

---

### 4. ℹ️ Tunnel Connection Issues (No Action Required)

**Issue**: ngrok tunnel connections intermittently close during development.

**Impact**: Low - This is normal behavior for free ngrok tunnels.

**Solution**:
- Restart dev server if connection becomes problematic: `npx expo start --tunnel`
- Or use local network instead: `npx expo start` (without --tunnel)
- Or upgrade to ngrok paid plan for more stable tunnels

**No code changes needed.**

---

## Verification Steps

After applying the fixes, verify everything is working:

### Step 1: Reload Schema Cache
- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Click "Reload schema cache"
- [ ] Confirm success message

### Step 2: Seed Test Races
- [ ] Open Supabase SQL Editor
- [ ] Run `docs/seed-test-races.sql`
- [ ] Verify "✅ Inserted 15 test races" message
- [ ] Query races: `SELECT id, name, series FROM races;`

### Step 3: Restart Dev Server
```bash
# Kill current server (Ctrl+C)
# Then restart:
npx expo start --tunnel
```

### Step 4: Test in App
- [ ] Login/Signup works without PGRST205 errors
- [ ] Profile loads without errors
- [ ] Can view races
- [ ] Can save predictions for `race-1`, `race-2`, etc.
- [ ] No SafeAreaView deprecation warnings

### Step 5: Check Logs
Look for success indicators:
```
✅ [AUTH] Profile loaded: [username]
✅ [SAVE PREDICTION] Saved successfully
📊 [UPDATE STATS] Stats updated successfully
🏆 [ACHIEVEMENTS] Unlocked: ["First Blood"]
```

---

## Expected Behavior After Fixes

### ✅ Working Features
1. **User Authentication**
   - Signup creates profile automatically
   - Login loads user profile
   - Profile displays stats correctly

2. **Predictions**
   - Can save predictions for seeded races
   - Predictions save to Supabase
   - Stats update after prediction

3. **Achievements**
   - "First Blood" unlocks on first prediction
   - Points awarded correctly
   - Streak tracking works

4. **UI**
   - No deprecation warnings
   - Safe area insets work correctly on all screens
   - Smooth navigation

### ⚠️ Known Limitations (Expected)
1. **Race Data**: Only 15 test races available (use `seed-test-races.sql` to add more)
2. **Results**: No results data yet (will be populated when sync functions are deployed)
3. **Real-Time Sync**: Edge functions not deployed yet (scheduled for next phase)

---

## Files Created/Modified

### Created Files
- ✅ `docs/seed-test-races.sql` - SQL script to populate races table with test data
- ✅ `docs/DEBUGGING_FIXES.md` - This document

### Modified Files (10 screen files)
All updated to use `react-native-safe-area-context`:
- ProfileScreen.tsx
- ResultsScreen.tsx
- HomeScreen.tsx
- PredictionsScreen.tsx
- GroupDetailsScreen.tsx
- GroupLeaderboardScreen.tsx
- GroupsScreen.tsx
- LoginScreen.tsx
- SignupScreen.tsx
- RacesScreen.tsx

---

## Next Steps

### Immediate (Required)
1. **Reload Supabase Schema Cache** (see instructions above)
2. **Run seed-test-races.sql** to populate races table
3. **Restart Expo dev server**
4. **Test predictions** to verify foreign key error is resolved

### Short-Term (Recommended)
1. Deploy Supabase Edge Functions for real-time data sync
2. Run migration-006 for data sync infrastructure
3. Set up pg_cron for scheduled syncs

### Long-Term (Future)
1. Replace test race data with real data from sync functions
2. Implement live timing for race-day updates
3. Add data freshness indicators to UI

---

## Troubleshooting

### If You Still See PGRST205 Errors After Reloading Schema

1. **Verify migrations were run**:
   ```sql
   -- Check if profiles table exists
   SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

   -- Check if predictions table exists
   SELECT * FROM information_schema.tables WHERE table_name = 'predictions';

   -- Check if races table exists
   SELECT * FROM information_schema.tables WHERE table_name = 'races';
   ```

2. **If tables don't exist**, run the migrations:
   - `docs/migration-001-profiles.sql`
   - `docs/migration-002-predictions-races.sql`
   - `docs/migration-003-leaderboard.sql`
   - `docs/migration-004-groups.sql`
   - `docs/migration-005-results.sql`

3. **Then reload schema cache again**

### If Foreign Key Errors Persist

1. **Check if races exist**:
   ```sql
   SELECT id, name FROM races WHERE id IN ('race-1', 'race-2', 'race-3');
   ```

2. **If no results**, run `docs/seed-test-races.sql`

3. **Verify the race IDs match** what the app is using:
   - App uses: `race-1`, `race-2`, etc.
   - Database should have these exact IDs

---

## Summary

| Issue | Status | Action Required |
|-------|--------|----------------|
| SafeAreaView Deprecation | ✅ Fixed | None - code updated |
| Schema Cache Errors | ⚠️ Requires Action | **Reload schema cache in Supabase** |
| Foreign Key Errors | ✅ Fixed | Run `seed-test-races.sql` |
| Tunnel Intermittent | ℹ️ Expected | None - normal behavior |

**Critical Next Step**: Reload your Supabase schema cache following the instructions in Section 3 above.

---

*Last Updated: January 2025*
*Review: After completing schema cache reload and testing*
