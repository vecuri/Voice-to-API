import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { uploadAudio } from '../services/api';
import {
  addPendingUpload,
  getTranscripts,
  setTranscripts,
} from '../services/storage';
import {
  startRecordingService,
  stopRecordingService,
  updateNotification,
} from '../services/foreground';
import { Transcript, PendingTranscript } from '../types';

export type RecorderState = 'idle' | 'recording' | 'transcribing' | 'error';

const MAX_DURATION_SECONDS = 7200; // 2 hours
const WARNING_SECONDS = 6900; // 1h 55m

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
  },
  web: {},
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [lastTranscript, setLastTranscript] = useState<Transcript | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<string>('');
  const warningShownRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone permission is needed to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      await startRecordingService();

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();

      recordingRef.current = recording;
      startTimeRef.current = new Date().toISOString();
      warningShownRef.current = false;
      setSeconds(0);
      setState('recording');
      setErrorMessage(null);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;

          if (next >= WARNING_SECONDS && !warningShownRef.current) {
            warningShownRef.current = true;
            Alert.alert('Recording Limit', 'Recording will auto-stop in 5 minutes.');
          }

          if (next >= MAX_DURATION_SECONDS) {
            stopRecording();
          }

          // Update notification every 5 seconds to reduce overhead
          if (next % 5 === 0) {
            updateNotification(formatTime(next));
          }

          return next;
        });
      }, 1000);
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || 'Failed to start recording');
      await stopRecordingService();
    }
  }, []);

  const stopRecording = useCallback(async () => {
    clearTimer();

    const recording = recordingRef.current;
    if (!recording) {
      setState('idle');
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // Recording may already be stopped
    }

    await stopRecordingService();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });

    const uri = recording.getURI();
    recordingRef.current = null;

    if (!uri) {
      setState('error');
      setErrorMessage('No recording file found');
      return;
    }

    const durationSeconds = seconds;
    const recordedAt = startTimeRef.current;

    setState('transcribing');

    try {
      const transcript = await uploadAudio(uri, durationSeconds, recordedAt);
      setLastTranscript(transcript);

      // Add to local cache
      const cached = await getTranscripts();
      cached.unshift(transcript);
      await setTranscripts(cached);

      setState('idle');
      setSeconds(0);

      // Clean up audio file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // Ignore cleanup errors
      }

      return transcript;
    } catch (err: any) {
      // Save to retry queue
      const pending: PendingTranscript = {
        localId: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        audioFileUri: uri,
        durationSeconds,
        recordedAt,
        retryCount: 0,
        status: 'failed',
      };
      await addPendingUpload(pending);

      setState('error');
      setErrorMessage('Transcription failed. Audio saved locally.');
      setSeconds(0);
    }
  }, [seconds, clearTimer]);

  const cancelRecording = useCallback(async () => {
    clearTimer();

    const recording = recordingRef.current;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch {
        // Ignore
      }
    }

    recordingRef.current = null;
    await stopRecordingService();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });
    setState('idle');
    setSeconds(0);
    setErrorMessage(null);
  }, [clearTimer]);

  const resetError = useCallback(() => {
    setState('idle');
    setErrorMessage(null);
  }, []);

  return {
    state,
    seconds,
    lastTranscript,
    errorMessage,
    startRecording,
    stopRecording,
    cancelRecording,
    resetError,
    formattedTime: formatTime(seconds),
  };
}
