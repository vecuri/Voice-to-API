export interface Transcript {
  id: string;
  title: string;
  text: string;
  duration_seconds: number;
  language: string;
  recorded_at: string;
  created_at: string;
}

export interface PendingTranscript {
  localId: string;
  audioFileUri: string;
  durationSeconds: number;
  recordedAt: string;
  retryCount: number;
  status: 'pending' | 'uploading' | 'failed';
}

export interface TranscriptListResponse {
  transcripts: Transcript[];
  total: number;
  has_more: boolean;
}

export interface RegisterResponse {
  api_key: string;
  user_id: string;
}

export type RootStackParamList = {
  Home: undefined;
  TranscriptDetail: { transcript: Transcript };
};
