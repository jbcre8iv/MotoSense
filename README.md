# MotoSense

**Tagline:** *Sense The Race*

MotoSense is a React Native + Expo mobile app for Supercross/Motocross race predictions and fan engagement. This app helps fans engage with racing through AI-powered predictions, real-time weather data, race tracking, and community features.

**IMPORTANT:** This is NOT a gambling app - no prizes, no money, purely educational and engagement-focused.

## Features

### Current Features (MVP)
- **Race Schedule Display** - View upcoming Supercross/Motocross races
- **Prediction System** - Make educational predictions for race outcomes (top 5)
- **Weather Integration** - Real-time weather data from Weather.gov API
  - Current conditions and 7-day forecast
  - Weather impact analysis for racing
- **Race Tracking** - View race schedule with track details
- **User Profiles** - Track your prediction history and "Racing IQ" level
- **AsyncStorage Persistence** - Your data is saved locally
- **Bottom Tab Navigation** - Easy navigation between Home, Predictions, Races, and Profile

### Coming Soon
- AI-powered predictions using Claude API
- Manual race results entry interface
- Achievement badges system
- Push notifications for races
- Rider profiles and stats
- Historical race data
- Educational content section

## Tech Stack

- **React Native** with **Expo** (supports iOS, Android, and Web)
- **TypeScript** for type safety
- **React Navigation** for routing (Bottom Tabs)
- **AsyncStorage** for local data persistence
- **Expo SQLite** for local database (coming soon)
- **Axios** for API calls
- **Weather.gov API** (free, no key needed)
- **Claude API** for AI predictions (coming soon)

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (download from App Store or Google Play)

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd MotoSense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on your device**
   - Download **Expo Go** on your iOS or Android device
   - Scan the QR code shown in terminal or browser
   - The app will load on your device

## Running the App

### Development Mode
```bash
npx expo start
```

### Run on iOS Simulator (Mac only)
```bash
npm run ios
```

### Run on Android Emulator
```bash
npm run android
```

### Run on Web
```bash
npm run web
```

## Project Structure

```
MotoSense/
├── App.tsx                 # Main app entry point
├── src/
│   ├── components/         # Reusable UI components
│   │   └── WeatherCard.tsx
│   ├── screens/            # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── PredictionsScreen.tsx
│   │   ├── RacesScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── navigation/         # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── services/           # API and storage services
│   │   ├── weatherService.ts
│   │   └── storageService.ts
│   ├── data/               # Mock data
│   │   ├── mockRiders.ts
│   │   ├── mockTracks.ts
│   │   └── mockRaces.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/              # Utility functions
│   └── assets/             # Images, fonts, etc.
├── package.json
└── README.md
```

## Mock Data

The app currently uses mock data for:
- **5 Riders**: Cooper Webb, Eli Tomac, Jett Lawrence, Chase Sexton, Justin Barcia
- **2 Tracks**: Angel Stadium (Anaheim, CA), State Farm Stadium (Glendale, AZ)
- **2 Races**: Anaheim 1 (Jan 11, 2025), Glendale (Jan 25, 2025)

## How to Use

1. **Home Screen**
   - View upcoming races
   - Check weather conditions for each track
   - See weather impact analysis

2. **Predictions Screen**
   - Select a race
   - Pick your top 5 riders
   - Submit your predictions
   - Predictions are saved locally

3. **Races Screen**
   - View full race schedule
   - See track details (type, soil, length)
   - Check race status (upcoming/completed)

4. **Profile Screen**
   - View your stats (total predictions, accuracy, Racing IQ)
   - Track your progress
   - See achievements (coming soon)

## API Integrations

### Weather.gov API (Active)
- **Base URL**: https://api.weather.gov
- **No API key required**
- Provides weather forecasts for US locations
- Used for track weather conditions and race impact analysis

### Claude API (Coming Soon)
- Will be used for AI-powered race predictions
- Analyzes rider performance, track conditions, weather, etc.
- Provides reasoning for predictions

## Data Persistence

All user data is stored locally using AsyncStorage:
- User profile (username, stats, achievements)
- Prediction history
- Favorite riders
- Racing IQ level

**Note:** Data is stored on the device and not synced to cloud (for now).

## Theming

The app uses a dark theme with racing-inspired colors:
- **Primary Color**: Cyan (#00d9ff) - represents intelligence and technology
- **Background**: Dark blue/navy (#0a0e27)
- **Card Background**: Lighter navy (#1a1f3a)
- **Text**: White (#ffffff) and gray (#8892b0)

## Testing on Your Phone

1. Install **Expo Go** from:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Start the development server:
   ```bash
   npx expo start
   ```

3. Scan the QR code:
   - **iOS**: Use Camera app to scan
   - **Android**: Use Expo Go app to scan

4. The app will load and you can test all features!

## Troubleshooting

### App won't load on device
- Ensure your phone and computer are on the same WiFi network
- Try using tunnel mode: `npx expo start --tunnel`

### Weather data not loading
- Check internet connection
- Weather.gov API only works for US locations
- Check console for error messages

### Predictions not saving
- Check AsyncStorage permissions
- Clear app data and restart

### Metro bundler errors
- Clear cache: `npx expo start -c`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

## Development Roadmap

### Phase 1 (Current - MVP)
- ✅ Basic app structure
- ✅ Navigation
- ✅ Mock data
- ✅ Weather integration
- ✅ Predictions interface
- ✅ User profile
- ✅ AsyncStorage

### Phase 2 (Next)
- [ ] Claude API integration for AI predictions
- [ ] Manual race results entry
- [ ] Prediction accuracy calculation
- [ ] Achievement badges
- [ ] Local notifications

### Phase 3 (Future)
- [ ] Rider profiles database
- [ ] Historical race data
- [ ] Educational content
- [ ] Social features
- [ ] Live timing integration
- [ ] SQLite database migration

## Contributing

This is currently a personal project. If you have suggestions or find bugs, please let me know!

## License

This project is for educational purposes only. All rider names, team names, and race information are used for demonstration purposes.

## Disclaimer

MotoSense is an educational tool for learning about race dynamics and improving prediction skills. This is NOT a gambling application. No money is exchanged, no prizes are awarded. All predictions are for educational and entertainment purposes only.

## Credits

- **Weather Data**: Provided by Weather.gov (National Weather Service)
- **AI Predictions**: Powered by Claude (Anthropic) - coming soon
- **Built with**: React Native, Expo, TypeScript

---

**Enjoy predicting and learning about Supercross/Motocross racing!** 🏍️
