import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { deleteTranscript } from '../services/api';
import {
  getTranscripts as getCachedTranscripts,
  setTranscripts as setCachedTranscripts,
} from '../services/storage';
import { Colors, Spacing } from '../theme';
import { RootStackParamList } from '../types';

type DetailRouteProp = RouteProp<RootStackParamList, 'TranscriptDetail'>;

export function TranscriptDetail() {
  const navigation = useNavigation();
  const route = useRoute<DetailRouteProp>();
  const { transcript } = route.params;
  const [copied, setCopied] = useState(false);

  const formatDate = (dateStr: string): string => {
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
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '';
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  };

  const date = formatDate(transcript.recorded_at || transcript.created_at);
  const duration = formatDuration(transcript.duration_seconds);
  const metadata = [date, duration].filter(Boolean).join(' \u00B7 ');

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(transcript.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [transcript.text]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Transcript',
      'Are you sure you want to delete this transcript? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTranscript(transcript.id);
              // Remove from cache
              const cached = await getCachedTranscripts();
              const updated = cached.filter((t) => t.id !== transcript.id);
              await setCachedTranscripts(updated);
            } catch {
              // Still navigate back
            }
            navigation.goBack();
          },
        },
      ]
    );
  }, [transcript.id, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{transcript.title}</Text>
        {metadata ? <Text style={styles.metadata}>{metadata}</Text> : null}
        <Text style={styles.text}>{transcript.text}</Text>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable onPress={handleCopy} style={styles.actionButton}>
          <Text style={styles.actionText}>
            {copied ? 'Copied!' : '📋 Copy'}
          </Text>
        </Pressable>
        <Pressable onPress={handleDelete} style={[styles.actionButton, styles.deleteButton]}>
          <Text style={[styles.actionText, styles.deleteText]}>🗑️ Delete</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    fontSize: 16,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  metadata: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  text: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 26,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteButton: {
    borderColor: Colors.error,
  },
  deleteText: {
    color: Colors.error,
  },
});
