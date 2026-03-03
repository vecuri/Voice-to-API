import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '../theme';
import { Transcript } from '../types';

interface Props {
  transcript: Transcript;
  onPress: () => void;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export function TranscriptCard({ transcript, onPress }: Props) {
  const date = formatDate(transcript.recorded_at || transcript.created_at);
  const duration = formatDuration(transcript.duration_seconds);
  const subtitle = [duration, date].filter(Boolean).join(' \u00B7 ');
  const preview = transcript.text
    ? transcript.text.split('\n').slice(0, 2).join(' ').slice(0, 120)
    : '';

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Text style={styles.title} numberOfLines={1}>
        {transcript.title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      {preview ? (
        <Text style={styles.preview} numberOfLines={2}>
          {preview}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  preview: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
