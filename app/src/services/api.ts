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
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new Error('Audio file not found');
  }

  // Use FileSystem.uploadAsync — much more reliable than fetch+FormData on Android
  const uploadResult = await FileSystem.uploadAsync(
    `${BASE_URL}/v1/transcripts/upload`,
    fileUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'audio/mp4',
      headers: {
        ...authHeaders(),
      },
      parameters: {
        duration_seconds: String(durationSeconds),
        recorded_at: recordedAt,
      },
    }
  );

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    let detail = 'Upload failed';
    try {
      const err = JSON.parse(uploadResult.body);
      detail = err.detail || detail;
    } catch {}
    throw new Error(`${detail} (HTTP ${uploadResult.status})`);
  }

  try {
    return JSON.parse(uploadResult.body) as Transcript;
  } catch {
    throw new Error('Invalid response from server');
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
