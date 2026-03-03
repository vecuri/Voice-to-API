import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RecordButton } from '../components/RecordButton';
import { Timer } from '../components/Timer';
import { TranscriptCard } from '../components/TranscriptCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ApiKeySheet } from '../components/ApiKeySheet';
import { useRecorder } from '../hooks/useRecorder';
import { useTranscripts } from '../hooks/useTranscripts';
import { processRetryQueue } from '../services/retry';
import { Colors, Spacing } from '../theme';
import { RootStackParamList, Transcript } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  apiKey: string;
}

export function HomeScreen({ apiKey }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const sheetRef = useRef<BottomSheet>(null);
  const {
    state: recorderState,
    seconds,
    formattedTime,
    startRecording,
    stopRecording,
    resetError,
  } = useRecorder();

  const {
    transcripts,
    loading,
    refreshing,
    hasMore,
    fetchMore,
    refresh,
    addTranscript,
  } = useTranscripts();

  const handleRecordPress = useCallback(async () => {
    if (recorderState === 'recording') {
      const transcript = await stopRecording();
      if (transcript) {
        addTranscript(transcript);
      }
    } else if (recorderState === 'idle') {
      await startRecording();
    }
  }, [recorderState, startRecording, stopRecording, addTranscript]);

  const handleRetry = useCallback(async () => {
    resetError();
    const retried = await processRetryQueue();
    retried.forEach(addTranscript);
  }, [resetError, addTranscript]);

  const handleTranscriptPress = useCallback(
    (transcript: Transcript) => {
      navigation.navigate('TranscriptDetail', { transcript });
    },
    [navigation]
  );

  const openApiKeySheet = useCallback(() => {
    sheetRef.current?.snapToIndex(0);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Transcript }) => (
      <TranscriptCard
        transcript={item}
        onPress={() => handleTranscriptPress(item)}
      />
    ),
    [handleTranscriptPress]
  );

  const renderContent = () => {
    if (recorderState === 'recording') {
      return (
        <View style={styles.recordingContainer}>
          <View style={styles.recordingIndicator}>
            <View style={styles.redDot} />
            <Text style={styles.recordingText}>Recording...</Text>
          </View>
          <Timer formattedTime={formattedTime} />
        </View>
      );
    }

    if (recorderState === 'transcribing') {
      return (
        <View style={styles.recordingContainer}>
          <ActivityIndicator size="large" color={Colors.text} />
          <Text style={styles.transcribingText}>Transcribing...</Text>
        </View>
      );
    }

    if (recorderState === 'error') {
      return <ErrorState onRetry={handleRetry} />;
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.text} />
        </View>
      );
    }

    if (transcripts.length === 0) {
      return <EmptyState />;
    }

    return (
      <FlatList
        data={transcripts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={hasMore ? fetchMore : undefined}
        onEndReachedThreshold={0.5}
        onRefresh={refresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VoiceAPI</Text>
        <Pressable onPress={openApiKeySheet} hitSlop={12}>
          <Text style={styles.headerIcon}>🔑</Text>
        </Pressable>
      </View>

      <View style={styles.content}>{renderContent()}</View>

      <View style={styles.bottomBar}>
        <RecordButton
          isRecording={recorderState === 'recording'}
          onPress={handleRecordPress}
          disabled={recorderState === 'transcribing'}
        />
      </View>

      <ApiKeySheet apiKey={apiKey} sheetRef={sheetRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  headerIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  list: {
    paddingTop: Spacing.sm,
    paddingBottom: 140,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.recordActive,
    marginRight: Spacing.sm,
  },
  recordingText: {
    fontSize: 16,
    color: Colors.text,
  },
  transcribingText: {
    fontSize: 16,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
