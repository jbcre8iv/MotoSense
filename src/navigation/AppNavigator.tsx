import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../contexts/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import RaceCenterScreen from '../screens/RaceCenterScreen';
import LiveRaceScreen from '../screens/LiveRaceScreen';
import ResultsScreen from '../screens/ResultsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RivalriesScreen from '../screens/RivalriesScreen';
import RivalryDetailScreen from '../screens/RivalryDetailScreen';
import AddRivalScreen from '../screens/AddRivalScreen';
import AnalyticsDashboardScreen from '../screens/AnalyticsDashboardScreen';
import PredictionHistoryScreen from '../screens/PredictionHistoryScreen';
import LeaderboardsScreen from '../screens/LeaderboardsScreen';
import RiderProfileScreen from '../screens/RiderProfileScreen';
import TrackProfileScreen from '../screens/TrackProfileScreen';
import FriendsScreen from '../screens/FriendsScreen';
import GroupsScreen from '../screens/GroupsScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import GroupLeaderboardScreen from '../screens/GroupLeaderboardScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import ActivityFeedScreen from '../screens/ActivityFeedScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Race Center stack (nested navigation for Race Center section)
function RaceCenterStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0a0e27' },
      }}
    >
      <Stack.Screen name="RaceCenterList" component={RaceCenterScreen} />
      <Stack.Screen name="LiveRace" component={LiveRaceScreen} />
    </Stack.Navigator>
  );
}

// Groups stack (nested navigation for Groups section)
function GroupsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0a0e27' },
      }}
    >
      <Stack.Screen name="GroupsList" component={GroupsScreen} />
      <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
      <Stack.Screen name="GroupLeaderboard" component={GroupLeaderboardScreen} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
    </Stack.Navigator>
  );
}

// Profile stack (nested navigation for Profile section)
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0a0e27' },
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsDashboardScreen} />
      <Stack.Screen name="PredictionHistory" component={PredictionHistoryScreen} />
      <Stack.Screen name="Leaderboards" component={LeaderboardsScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="RiderProfile" component={RiderProfileScreen} />
      <Stack.Screen name="TrackProfile" component={TrackProfileScreen} />
      <Stack.Screen name="Rivalries" component={RivalriesScreen} />
      <Stack.Screen name="RivalryDetail" component={RivalryDetailScreen} />
      <Stack.Screen name="AddRival" component={AddRivalScreen} />
    </Stack.Navigator>
  );
}

// Main app tabs (for authenticated users)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1f3a',
          borderTopColor: '#00d9ff',
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#00d9ff',
        tabBarInactiveTintColor: '#8892b0',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tab.Screen
        name="Upcoming"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Race Center"
        component={RaceCenterStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityFeedScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size}) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Auth stack (for non-authenticated users)
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0a0e27' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // Check if onboarding has been completed
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('@onboarding_completed');
        setOnboardingCompleted(value === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setOnboardingCompleted(false);
      }
    };

    checkOnboarding();
  }, []);

  // Show loading indicator while checking auth state or onboarding status
  if (loading || onboardingCompleted === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
  };

  return (
    <NavigationContainer>
      {/* Show onboarding for first-time users */}
      {!onboardingCompleted ? (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      ) : user ? (
        // User is authenticated - show main tabs
        <MainTabs />
      ) : (
        // User is not authenticated - show auth stack
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
  },
});
