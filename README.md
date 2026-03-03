# VoiceAPI

Voice recorder app with transcription. Record audio on your Android device, upload it to a FastAPI backend, get it transcribed via OpenAI Whisper, and pull transcripts via API key. The OpenAI API key lives exclusively on the backend — the app never touches OpenAI directly.

## Architecture

```
┌─────────────────┐     multipart/form-data      ┌──────────────────┐
│                  │  ────────────────────────►    │                  │
│  React Native    │     POST /v1/transcripts/     │  FastAPI Backend  │
│  Expo App        │         upload                │                  │
│  (Android)       │  ◄────────────────────────    │  - Auth (Bearer)  │
│                  │     JSON transcript           │  - Rate limiting  │
└─────────────────┘                                │  - Whisper calls  │
                                                   │                  │
                                                   └────────┬─────────┘
                                                            │
                                            ┌───────────────┼───────────────┐
                                            │               │               │
                                            ▼               ▼               ▼
                                      ┌──────────┐  ┌────────────┐  ┌────────────┐
                                      │PostgreSQL │  │  OpenAI    │  │  Temp File │
                                      │  (Users,  │  │  Whisper   │  │  Storage   │
                                      │Transcripts│  │  API       │  │  (cleanup) │
                                      └──────────┘  └────────────┘  └────────────┘
```

## Backend Setup

### Prerequisites

- Python 3.11+
- PostgreSQL
- ffmpeg (`brew install ffmpeg` on macOS, `apt-get install ffmpeg` on Linux)
- An OpenAI API key

### 1. Create the database

```bash
createdb voiceapi
# Or via psql:
psql -c "CREATE DATABASE voiceapi;"
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env with your values:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/voiceapi
#   OPENAI_API_KEY=sk-...
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Tables are auto-created on startup. The server will be available at `http://localhost:8000`.

### Docker alternative

```bash
cd backend
docker build -t voiceapi-backend .
docker run -p 8000:8000 --env-file .env voiceapi-backend
```

## App Setup

### Prerequisites

- Node.js 18+
- Android Studio (for emulator or device builds)
- EAS CLI (`npm install -g eas-cli`)

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Generate placeholder assets

```bash
node scripts/generate-assets.js
```

Replace `assets/icon.png`, `assets/splash.png`, and `assets/adaptive-icon.png` with real images before publishing.

### 3. Configure backend URL

Edit `app.json` and set `expo.extra.apiBaseUrl` to your backend URL:

```json
{
  "extra": {
    "apiBaseUrl": "http://YOUR_BACKEND_IP:8000"
  }
}
```

For local development with an Android emulator, use `http://10.0.2.2:8000`.

### 4. Prebuild and run

```bash
npx expo prebuild --platform android
npx expo run:android
```

### 5. Build APK with EAS

```bash
eas build --platform android --profile preview
```

## API Documentation

Base URL: `http://localhost:8000`

### POST /v1/register

Register a new user and get an API key. No authentication required.

**Request:**
```json
{
  "device_id": "optional-device-identifier"
}
```

**Response:**
```json
{
  "api_key": "vapi_sk_a1b2c3d4e5f6...",
  "user_id": "usr_a1b2c3d4e5f6..."
}
```

### POST /v1/transcripts/upload

Upload an audio file for transcription. Requires Bearer token auth.

**Request:** `multipart/form-data`
- `file` — audio file (.m4a, .mp4, .wav, .mp3, .webm, .ogg)
- `duration_seconds` — integer, recording duration
- `recorded_at` — ISO 8601 timestamp

**Response:**
```json
{
  "id": "uuid",
  "title": "First five words of...",
  "text": "Full transcript text here...",
  "duration_seconds": 120,
  "language": "en",
  "recorded_at": "2025-01-15T10:30:00+00:00",
  "created_at": "2025-01-15T10:31:00+00:00"
}
```

### GET /v1/transcripts

List transcripts with pagination. Requires Bearer token auth.

**Query params:**
- `since` — ISO timestamp, filter transcripts created after this time
- `limit` — integer (default 20, max 100)
- `offset` — integer (default 0)

**Response:**
```json
{
  "transcripts": [...],
  "total": 42,
  "has_more": true
}
```

### GET /v1/transcripts/{transcript_id}

Get a single transcript. Requires Bearer token auth.

**Response:** Same shape as the transcript object above.

### DELETE /v1/transcripts/{transcript_id}

Delete a transcript. Requires Bearer token auth.

**Response:**
```json
{
  "deleted": true
}
```

## cURL Examples

### Register

```bash
curl -X POST http://localhost:8000/v1/register \
  -H "Content-Type: application/json" \
  -d '{"device_id": "my-device"}'
```

### Upload audio

```bash
curl -X POST http://localhost:8000/v1/transcripts/upload \
  -H "Authorization: Bearer vapi_sk_YOUR_KEY" \
  -F "file=@recording.m4a" \
  -F "duration_seconds=60" \
  -F "recorded_at=2025-01-15T10:30:00Z"
```

### List transcripts

```bash
curl http://localhost:8000/v1/transcripts \
  -H "Authorization: Bearer vapi_sk_YOUR_KEY"
```

### List transcripts with filters

```bash
curl "http://localhost:8000/v1/transcripts?limit=10&offset=0&since=2025-01-01T00:00:00Z" \
  -H "Authorization: Bearer vapi_sk_YOUR_KEY"
```

### Get single transcript

```bash
curl http://localhost:8000/v1/transcripts/TRANSCRIPT_UUID \
  -H "Authorization: Bearer vapi_sk_YOUR_KEY"
```

### Delete transcript

```bash
curl -X DELETE http://localhost:8000/v1/transcripts/TRANSCRIPT_UUID \
  -H "Authorization: Bearer vapi_sk_YOUR_KEY"
```

## Rate Limiting

All authenticated endpoints are rate-limited to 100 requests per minute per API key. Exceeding this returns HTTP 429.

## Audio Format

The app records in:
- Format: M4A (MPEG-4 AAC)
- Sample rate: 44100 Hz
- Channels: 1 (mono)
- Bit rate: 64 kbps

Files over 20MB are automatically split into 10-minute chunks before sending to Whisper.
