import AsyncStorage from '@react-native-async-storage/async-storage';
import { PendingTranscript, Transcript } from '../types';

const KEYS = {
  API_KEY: '@voiceapi_api_key',
  TRANSCRIPTS: '@voiceapi_transcripts',
  PENDING_UPLOADS: '@voiceapi_pending_uploads',
} as const;

// API Key
export async function getApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.API_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.API_KEY, key);
}

// Transcripts cache
export async function getTranscripts(): Promise<Transcript[]> {
  const data = await AsyncStorage.getItem(KEYS.TRANSCRIPTS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function setTranscripts(transcripts: Transcript[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TRANSCRIPTS, JSON.stringify(transcripts));
}

// Pending uploads
export async function getPendingUploads(): Promise<PendingTranscript[]> {
  const data = await AsyncStorage.getItem(KEYS.PENDING_UPLOADS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function setPendingUploads(pending: PendingTranscript[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PENDING_UPLOADS, JSON.stringify(pending));
}

export async function addPendingUpload(item: PendingTranscript): Promise<void> {
  const pending = await getPendingUploads();
  pending.push(item);
  await setPendingUploads(pending);
}

export async function removePendingUpload(localId: string): Promise<void> {
  const pending = await getPendingUploads();
  const filtered = pending.filter((p) => p.localId !== localId);
  await setPendingUploads(filtered);
}
