# Phase 1 Testing Guide

**Date**: January 2025
**Purpose**: Comprehensive testing checklist for all Phase 1 features

---

## 🎯 Testing Overview

This guide will walk you through testing all 5 major features of Phase 1:
1. Onboarding Flow
2. Interactive Tutorial
3. Enhanced Gamification
4. Daily/Weekly Challenges
5. Push Notifications

**Estimated Testing Time**: 30-45 minutes

---

## 🔧 Pre-Test Setup

### 1. Start the Development Server

```bash
npx expo start -c
```

### 2. Open on Device

**For iOS Simulator:**
- Press `i` in the Expo terminal
- Or scan QR code with Expo Go app

**For Android Emulator:**
- Press `a` in the Expo terminal
- Or scan QR code with Expo Go app

**For Physical Device (Recommended for Push Notifications):**
- Install Expo Go from App Store / Play Store
- Scan QR code in Expo terminal
- Ensure device is on same WiFi network

### 3. Reset Testing Data (Optional)

To test features from scratch, you can reset AsyncStorage:
- This will show onboarding and tutorial again

```typescript
// In React Native Debugger or directly in code temporarily:
await AsyncStorage.removeItem('@onboarding_completed');
await AsyncStorage.removeItem('@tutorial_completed');
```

---

## ✅ Test 1: Onboarding Flow (First-Time User Experience)

### What to Test:
The 6-slide onboarding that introduces the app to new users.

### Steps:
1. **Fresh Install Simulation**
   - Delete the app and reinstall OR
   - Clear AsyncStorage `@onboarding_completed`

2. **Slide 1: Welcome**
   - Verify: Trophy icon (cyan)
   - Title: "Welcome to MotoSense"
   - Description: Racing predictions intro
   - Buttons: "Skip" (top right), "Next" (bottom)

3. **Slide 2: Make Predictions**
   - Verify: Podium icon (green)
   - Title: "Make Predictions"
   - Description: Pick top 5 finishers
   - Progress dots show slide 2/6

4. **Slide 3: Join Groups**
   - Verify: People icon (purple)
   - Title: "Join Groups"
   - Description: Compete with friends

5. **Slide 4: Unlock Achievements**
   - Verify: Medal icon (yellow)
   - Title: "Unlock Achievements"
   - Description: 35+ achievements

6. **Slide 5: Daily Challenges**
   - Verify: Flash icon (red)
   - Title: "Daily Challenges"
   - Description: Bonus points

7. **Slide 6: Stay Updated**
   - Verify: Notifications icon (orange)
   - Title: "Stay Updated"
   - Description: Push notifications
   - Button changes to "Get Started"

8. **Navigation**
   - Tap "Get Started" → Should navigate to Login screen
   - Verify onboarding doesn't show again on next launch

### Expected Results:
- ✅ All 6 slides display correctly
- ✅ Icons are color-coded
- ✅ Skip button works from any slide
- ✅ Next button advances through slides
- ✅ Get Started navigates to Login
- ✅ Onboarding doesn't repeat after completion

### Bugs to Watch For:
- ❌ Slides not scrolling smoothly
- ❌ Icons not rendering
- ❌ Pagination dots not updating
- ❌ Onboarding showing again after completion

---

## ✅ Test 2: Interactive Tutorial (First Prediction Guidance)

### What to Test:
The 6-step tutorial that guides users through making their first prediction.

### Steps:
1. **Login to Account**
   - Complete onboarding first
   - Login with your test account

2. **Tutorial Trigger**
   - Navigate to Home screen
   - Tutorial should automatically appear as modal overlay

3. **Step 1: Welcome**
   - Verify: Flag icon (cyan)
   - Title: "Let's Make Your First Prediction!"
   - Progress: "Step 1 of 6"
   - Buttons: "Skip Tutorial", "Next"

4. **Step 2: Find a Race**
   - Verify: Search icon (green)
   - Title: "Find an Upcoming Race"
   - Description: Scroll through races

5. **Step 3: Make Prediction**
   - Verify: Create icon (purple)
   - Title: "Tap 'Make Prediction'"
   - Description: Click prediction button

6. **Step 4: Select Riders**
   - Verify: Podium icon (yellow)
   - Title: "Pick Your Top 5"
   - Description: Select riders in order

7. **Step 5: Save Prediction**
   - Verify: Checkmark icon (red)
   - Title: "Save Your Prediction"
   - Description: Lock in picks

8. **Step 6: View Results**
   - Verify: Trophy icon (orange)
   - Title: "Check Results After Race"
   - Button changes to "Got It!"

9. **Completion**
   - Tap "Got It!" → Tutorial closes
   - Tutorial should not appear again

### Expected Results:
- ✅ Tutorial appears automatically for first-time users
- ✅ All 6 steps display with correct icons and colors
- ✅ Progress bar advances through steps
- ✅ Skip button closes tutorial at any step
- ✅ Tutorial doesn't repeat after completion
- ✅ Semi-transparent backdrop visible

### Bugs to Watch For:
- ❌ Tutorial not appearing on first visit
- ❌ Tutorial blocking all interaction
- ❌ Progress bar not updating
- ❌ Tutorial re-appearing after completion

---

## ✅ Test 3: Enhanced Gamification (35+ Achievements)

### What to Test:
The expanded achievement system with 6 categories and 4 tiers.

### Steps:
1. **Navigate to Profile**
   - Tap "Profile" tab in bottom navigation

2. **Verify Achievement Categories**
   - Check all 6 categories appear:
     - 🌟 Predictions
     - 🎯 Accuracy
     - 🔥 Streaks
     - ⚡ Special
     - 👥 Social
     - 🏆 Loyalty

3. **Check Achievement Count**
   - Verify 35+ total achievements visible
   - Each achievement shows:
     - Icon
     - Title
     - Description
     - Points reward
     - Progress (X/Y)
     - Tier badge (Bronze/Silver/Gold/Platinum)

4. **Verify Badge Tiers**
   - 🥉 Bronze: 100-300 points
   - 🥈 Silver: 400-750 points
   - 🥇 Gold: 800-2000 points
   - 💎 Platinum: 3000-10000 points

5. **Test Achievement Unlocking**
   - Make a prediction → "First Blood" should unlock (100 pts)
   - Check profile → Total points should update
   - Achievement should show as unlocked

6. **Verify Total Points**
   - Check that total possible points = 78,000+

### Expected Results:
- ✅ All 6 categories visible
- ✅ 35+ achievements displayed
- ✅ Tier badges show correctly
- ✅ Progress bars track completion
- ✅ Points awarded when unlocking
- ✅ Achievements persist after app restart

### Bugs to Watch For:
- ❌ Missing achievement categories
- ❌ Incorrect point values
- ❌ Progress not tracking
- ❌ Achievements not persisting

---

## ✅ Test 4: Daily/Weekly Challenges

### What to Test:
The rotating challenge system with 3 daily and 3 weekly challenges.

### Steps:
1. **View Challenges**
   - Navigate to Home screen
   - Look for challenges section (may need to add to UI)
   - Or check in code via challengesService

2. **Verify Daily Challenges**
   - Should show 3 challenges
   - Each has:
     - Title (e.g., "Prediction Day")
     - Description
     - Progress (X/Y)
     - Reward points (40-100 pts)
     - Expiration (end of day)

3. **Verify Weekly Challenges**
   - Should show 3 challenges
   - Each has:
     - Title (e.g., "Weekly Predictor")
     - Description
     - Progress (X/Y)
     - Reward points (150-500 pts)
     - Expiration (end of week - Sunday)

4. **Test Challenge Rotation**
   - Note current daily challenges
   - Change device date to next day
   - Verify 3 different challenges appear
   - Change date back

5. **Test Challenge Completion**
   - Complete a challenge requirement (e.g., make 1 prediction)
   - Verify challenge marked as complete
   - Verify bonus points awarded to profile

### Expected Results:
- ✅ 3 daily challenges visible
- ✅ 3 weekly challenges visible
- ✅ Challenges rotate daily
- ✅ Challenges reset weekly
- ✅ Progress tracks correctly
- ✅ Bonus points awarded on completion

### Bugs to Watch For:
- ❌ Challenges not rotating
- ❌ Progress not tracking
- ❌ Points not awarded
- ❌ Expiration dates incorrect

---

## ✅ Test 5: Push Notifications (Physical Device Only)

### What to Test:
The 6 notification types for user engagement.

**⚠️ Important: Push notifications require a physical device. They will NOT work in iOS Simulator or Android Emulator.**

### Steps:
1. **Install on Physical Device**
   - Use Expo Go app
   - Scan QR code from `npx expo start`

2. **Grant Notification Permissions**
   - Open app
   - When prompted, tap "Allow" for notifications
   - Check Settings → Notifications → Expo Go (should be enabled)

3. **Verify Push Token Registration**
   - Open Supabase dashboard
   - Go to Table Editor → profiles
   - Find your user profile
   - Verify `push_token` field is populated
   - Verify `notification_settings` JSONB contains all 6 types

4. **Test Notification Types**

   **Type 1: Race Reminders**
   - Should send 1 hour before race
   - Title: "Race Starting Soon!"
   - Body: "{Race Name} starts in 1 hour"

   **Type 2: Achievement Unlocks**
   - Unlock an achievement
   - Should receive instant notification
   - Title: "Achievement Unlocked!"
   - Body: "{Achievement Name} - {Points} points"

   **Type 3: Results Available**
   - After race completes
   - Title: "Results Are In!"
   - Body: "Check how you scored in {Race Name}"

   **Type 4: Friend Activity**
   - When friend beats your score
   - Title: "Friend Beat Your Score!"
   - Body: "{Friend Name} scored higher"

   **Type 5: Streak Reminders**
   - If haven't made prediction recently
   - Title: "Don't Break Your Streak!"
   - Body: "Make a prediction to maintain your streak"

   **Type 6: Challenge Notifications**
   - Daily challenges refresh
   - Title: "New Challenges Available!"
   - Body: "Complete today's challenges for bonus points"

5. **Test Notification Settings**
   - Go to Settings (if screen exists)
   - Toggle notification types on/off
   - Verify settings save to database

### Expected Results:
- ✅ Permission prompt appears
- ✅ Push token saved to database
- ✅ All 6 notification types can be sent
- ✅ Notifications appear on lock screen
- ✅ Tapping notification opens app
- ✅ Settings persist across restarts

### Bugs to Watch For:
- ❌ Permission not granted
- ❌ Push token null in database
- ❌ Notifications not appearing
- ❌ Tapping notification doesn't open app
- ❌ Settings not saving

---

## 📊 Testing Checklist Summary

### Onboarding Flow
- [ ] All 6 slides display correctly
- [ ] Color-coded icons render
- [ ] Skip button works
- [ ] Next/Get Started navigation works
- [ ] Doesn't repeat after completion

### Interactive Tutorial
- [ ] Appears for first-time users
- [ ] All 6 steps with progress tracking
- [ ] Skip button works
- [ ] Tutorial doesn't repeat
- [ ] Modal overlay displays correctly

### Enhanced Gamification
- [ ] 6 categories visible
- [ ] 35+ achievements displayed
- [ ] Tier badges correct
- [ ] Points awarded on unlock
- [ ] Progress persists

### Daily/Weekly Challenges
- [ ] 3 daily challenges shown
- [ ] 3 weekly challenges shown
- [ ] Challenges rotate daily
- [ ] Progress tracks
- [ ] Bonus points awarded

### Push Notifications (Physical Device)
- [ ] Permission granted
- [ ] Push token in database
- [ ] Can receive notifications
- [ ] Tap opens app
- [ ] Settings save

---

## 🐛 Known Issues & Workarounds

### Issue 1: Expo Version Mismatch
**Error**: `expo@54.0.18 - expected version: 54.0.19`
**Impact**: Minor - app still works
**Workaround**: Can ignore for testing, or run `npx expo install expo@latest`

### Issue 2: Simulator Notifications
**Error**: Notifications don't work in simulator
**Impact**: Can't test push notifications
**Workaround**: Must use physical device

### Issue 3: AsyncStorage Not Clearing
**Error**: Onboarding/tutorial keeps showing
**Impact**: Can't reset for re-testing
**Workaround**: Delete app and reinstall

---

## 📱 Testing Devices Recommended

**iOS:**
- iPhone 12 or newer (iOS 15+)
- Physical device for push notifications
- Simulator for UI testing only

**Android:**
- Pixel 4 or newer (Android 11+)
- Physical device for push notifications
- Emulator for UI testing only

---

## 🎯 Success Criteria

Phase 1 is considered fully tested when:
- ✅ All 5 features work as expected
- ✅ No critical bugs found
- ✅ User flow is smooth (onboarding → tutorial → prediction)
- ✅ Push notifications work on physical device
- ✅ Data persists across app restarts

---

## 🚀 Next Steps After Testing

**If all tests pass:**
- Phase 1 is production-ready!
- Can proceed to Phase 2 or launch MVP

**If bugs are found:**
- Document bugs in GitHub Issues or notes
- Prioritize: Critical > High > Medium > Low
- Fix critical bugs before launch

---

**Happy Testing! 🎉**

*Last Updated: January 2025*
*Questions? Check docs or reach out for support*
