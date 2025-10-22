import React from 'react';
import { View, StyleSheet } from 'react-native';
import ResultsScreen from '../ResultsScreen';

export default function ResultsTab() {
  return (
    <View style={styles.container}>
      <ResultsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
});
