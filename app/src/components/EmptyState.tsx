import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '../theme';

export function EmptyState() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🎙</Text>
      </View>
      <Text style={styles.title}>No recordings yet</Text>
      <Text style={styles.subtitle}>Tap below to start</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
