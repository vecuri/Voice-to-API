import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { RegisterResponse, Transcript, TranscriptListResponse } from '../types';

const BASE_URL: string =
  Constants.expoConfig?.extra?.apiBaseUrl || 'http://192.168.1.146:8000';

let apiKey: string | null = null;

export function setApiKeyForRequests(key: string | null) {
  apiKey = key;
}

function authHeaders(): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `Bearer ${apiKey}` };
}

export async function register(deviceId?: string): Promise<RegisterResponse> {
  const response = await fetch(`${BASE_URL}/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId || null }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  return response.json();
}

export async function uploadAudio(
  fileUri: string,
  durationSeconds: number,
  recordedAt: string
): Promise<Transcript> {
  const formData = new FormData();

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new Error('Audio file not found');
  }

  formData.append('file', {
    uri: fileUri,
    name: 'recording.m4a',
    type: 'audio/mp4',
  } as any);
  formData.append('duration_seconds', String(durationSeconds));
  formData.append('recorded_at', recordedAt);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`${BASE_URL}/v1/transcripts/upload`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getTranscripts(
  since?: string,
  limit: number = 20,
  offset: number = 0
): Promise<TranscriptListResponse> {
  const params = new URLSearchParams();
  if (since) params.append('since', since);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  const response = await fetch(`${BASE_URL}/v1/transcripts?${params.toString()}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to fetch transcripts' }));
    throw new Error(err.detail || 'Failed to fetch transcripts');
  }

  return response.json();
}

export async function getTranscript(id: string): Promise<Transcript> {
  const response = await fetch(`${BASE_URL}/v1/transcripts/${id}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Transcript not found' }));
    throw new Error(err.detail || 'Transcript not found');
  }

  return response.json();
}

export async function deleteTranscript(id: string): Promise<{ deleted: boolean }> {
  const response = await fetch(`${BASE_URL}/v1/transcripts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(err.detail || 'Delete failed');
  }

  return response.json();
}
