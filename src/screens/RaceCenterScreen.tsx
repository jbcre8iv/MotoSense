import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';

import LiveRacesTab from './RaceCenter/LiveRacesTab';
import ResultsTab from './RaceCenter/ResultsTab';
import RiderStatsTab from './RaceCenter/RiderStatsTab';
import SeasonStatsTab from './RaceCenter/SeasonStatsTab';

const Tab = createMaterialTopTabNavigator();

export default function RaceCenterScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="flag" size={32} color="#00d9ff" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Race Center</Text>
          <Text style={styles.subtitle}>Live updates, results & stats</Text>
        </View>
        <Ionicons name="notifications-outline" size={24} color="#00d9ff" />
      </View>

      {/* Tabs */}
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#1a1f3a',
            borderBottomWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: '#00d9ff',
          tabBarInactiveTintColor: '#8892b0',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'uppercase',
          },
          tabBarIndicatorStyle: {
            backgroundColor: '#00d9ff',
            height: 3,
          },
          tabBarScrollEnabled: true,
          tabBarItemStyle: {
            width: 'auto',
            minWidth: 80,
          },
        }}
      >
        <Tab.Screen
          name="Live"
          options={{
            tabBarLabel: 'Live',
            tabBarIcon: ({ color }) => (
              <Ionicons name="radio" size={18} color={color} />
            ),
          }}
        >
          {(props) => <LiveRacesTab {...props} navigation={navigation} />}
        </Tab.Screen>
        <Tab.Screen
          name="Results"
          component={ResultsTab}
          options={{
            tabBarLabel: 'Results',
            tabBarIcon: ({ color }) => (
              <Ionicons name="trophy" size={18} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Riders"
          component={RiderStatsTab}
          options={{
            tabBarLabel: 'Riders',
            tabBarIcon: ({ color }) => (
              <Ionicons name="people" size={18} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Season"
          component={SeasonStatsTab}
          options={{
            tabBarLabel: 'Season',
            tabBarIcon: ({ color }) => (
              <Ionicons name="analytics" size={18} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 2,
    borderBottomColor: '#00d9ff',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#8892b0',
  },
});
