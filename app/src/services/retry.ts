import { uploadAudio } from './api';
import {
  getPendingUploads,
  removePendingUpload,
  setPendingUploads,
  getTranscripts,
  setTranscripts,
} from './storage';
import { Transcript } from '../types';

const MAX_RETRIES = 5;

export async function processRetryQueue(): Promise<Transcript[]> {
  const pending = await getPendingUploads();
  if (pending.length === 0) return [];

  const succeeded: Transcript[] = [];
  const remaining = [...pending];

  for (let i = 0; i < remaining.length; i++) {
    const item = remaining[i];

    if (item.retryCount >= MAX_RETRIES) {
      continue;
    }

    try {
      remaining[i] = { ...item, status: 'uploading' };
      await setPendingUploads(remaining);

      const transcript = await uploadAudio(
        item.audioFileUri,
        item.durationSeconds,
        item.recordedAt
      );

      succeeded.push(transcript);
      await removePendingUpload(item.localId);

      // Update remaining list
      const idx = remaining.findIndex((p) => p.localId === item.localId);
      if (idx !== -1) remaining.splice(idx, 1);
      i--;

      // Add to cached transcripts
      const cached = await getTranscripts();
      cached.unshift(transcript);
      await setTranscripts(cached);
    } catch {
      remaining[i] = {
        ...item,
        status: 'failed',
        retryCount: item.retryCount + 1,
      };
      await setPendingUploads(remaining);
    }
  }

  return succeeded;
}
