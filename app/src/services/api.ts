import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { RegisterResponse, Transcript, TranscriptListResponse } from '../types';

const BASE_URL: string =
  Constants.expoConfig?.extra?.apiBaseUrl || 'http://192.168.1.146:8000';

let apiKey: string | null = null;

export function setApiKeyForRequests(key: string | null) {
  apiKey = key;
}

export function getBaseUrl(): string {
  return BASE_URL;
}

function authHeaders(): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `Bearer ${apiKey}` };
}

/** Quick connectivity check — throws with a clear message if backend is unreachable */
async function checkConnectivity(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${BASE_URL}/health`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(
        `Cannot reach server at ${BASE_URL}. Make sure your phone is on the same WiFi as your computer.`
      );
    }
    throw new Error(
      `Cannot connect to server: ${err.message}. Check that the backend is running and your phone is on the same WiFi.`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms
    );
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
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
    throw new Error('Audio file not found on device');
  }

  // Check connectivity first — fails fast with a clear message
  await checkConnectivity();

  // Upload with a 90-second timeout (covers upload + Whisper processing)
  const uploadResult = await withTimeout(
    FileSystem.uploadAsync(
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
    ),
    90000,
    'Upload'
  );

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    let detail = `Server error (HTTP ${uploadResult.status})`;
    try {
      const err = JSON.parse(uploadResult.body);
      detail = err.detail || detail;
    } catch {}
    throw new Error(detail);
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
