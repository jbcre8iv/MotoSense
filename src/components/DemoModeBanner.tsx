import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DemoModeBannerProps {
  compact?: boolean; // If true, shows a smaller inline badge
}

export default function DemoModeBanner({ compact = false }: DemoModeBannerProps) {
  if (compact) {
    return (
      <View style={styles.compactBadge}>
        <Ionicons name="flask" size={12} color="#FF9800" />
        <Text style={styles.compactText}>DEMO</Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <View style={styles.iconContainer}>
        <Ionicons name="flask" size={20} color="#FF9800" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Demo Mode</Text>
        <Text style={styles.subtitle}>
          Beta testing with 2025 season data
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9800',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#FFA726',
    lineHeight: 16,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  compactText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9800',
  },
});
