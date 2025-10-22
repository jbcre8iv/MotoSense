# MotoSense - Quick Start Guide

## Get Running in 3 Steps

### 1. Install Expo Go on Your Phone
Download from your app store:
- **iOS**: [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Google Play - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 2. Start the Development Server
From the MotoSense directory, run:
```bash
npx expo start
```

**Note:** If port 8081 is in use, you can specify a different port:
```bash
npx expo start --port 8082
```

### 3. Scan the QR Code
- **iOS**: Open Camera app and point at the QR code
- **Android**: Open Expo Go app and tap "Scan QR Code"

The app will load on your phone!

## What's Working Now

### Home Screen
- View 2 upcoming races (Anaheim 1, Glendale)
- Live weather data for each track from Weather.gov API
- Weather impact analysis for racing conditions

### Predictions Screen
- Select your top 5 riders for a race
- Submit predictions (saved locally)
- Predictions update your Racing IQ

### Races Screen
- Full race schedule with track details
- Track characteristics (indoor/outdoor, soil type, length)
- Race status indicators

### Profile Screen
- Your prediction stats
- Racing IQ level (increases as you make predictions)
- Achievement tracking (coming soon)

## Test the App

1. **Make a Prediction**
   - Go to Predictions tab
   - Select 5 different riders for positions 1-5
   - Tap "Submit Predictions"
   - Check your Profile to see updated stats!

2. **Check Weather**
   - Go to Home tab
   - Scroll down to see weather for Anaheim and Glendale
   - See weather impact analysis

3. **View Schedule**
   - Go to Races tab
   - See upcoming race details

## Current Mock Data

**Riders (5):**
- Cooper Webb (#1) - Red Bull KTM
- Eli Tomac (#3) - Star Racing Yamaha
- Jett Lawrence (#18) - Team Honda HRC
- Chase Sexton (#23) - Red Bull KTM
- Justin Barcia (#51) - GASGAS Factory Racing

**Tracks (2):**
- Angel Stadium - Anaheim, CA
- State Farm Stadium - Glendale, AZ

**Races (2):**
- Anaheim 1 - January 11, 2025
- Glendale - January 25, 2025

## Next Steps

To add more features:
1. Add more riders to `src/data/mockRiders.ts`
2. Add more tracks to `src/data/mockTracks.ts`
3. Add more races to `src/data/mockRaces.ts`
4. Integrate Claude API for AI predictions
5. Add race results entry interface
6. Implement achievement badges

## Troubleshooting

**App won't connect?**
- Make sure phone and computer are on same WiFi
- Try: `npx expo start --tunnel`

**Weather not loading?**
- Check internet connection
- Weather.gov only works for US locations

**Want to reset your data?**
- Close the app
- Clear app data in Expo Go
- Reopen the app

## Tech Stack Quick Reference

- **Framework**: React Native + Expo
- **Language**: TypeScript
- **Navigation**: React Navigation (Bottom Tabs)
- **Storage**: AsyncStorage
- **APIs**: Weather.gov (free, no key needed)
- **Styling**: React Native StyleSheets with custom theme

## File Structure Overview

```
src/
├── screens/          # Main app screens
├── components/       # Reusable components (WeatherCard)
├── navigation/       # Navigation configuration
├── services/         # API services (weather, storage)
├── data/            # Mock data (riders, tracks, races)
└── types/           # TypeScript type definitions
```

## Ready to Test!

Run `npx expo start` and start making predictions! 🏍️

Remember: This is an educational tool for learning about race dynamics, not gambling!
