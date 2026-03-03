import os
import time
import tempfile
import logging
from pathlib import Path

import httpx
from pydub import AudioSegment

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
CHUNK_DURATION_MS = 10 * 60 * 1000  # 10 minutes in milliseconds
MAX_RETRIES = 3
WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"


def _transcribe_single_file(file_path: str) -> dict:
    """Transcribe a single audio file via OpenAI Whisper API. Returns dict with text and language."""
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            with open(file_path, "rb") as audio_file:
                files = {
                    "file": (Path(file_path).name, audio_file, "audio/mp4"),
                }
                data = {
                    "model": "whisper-1",
                    "response_format": "verbose_json",
                }
                headers = {
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                }
                with httpx.Client(timeout=300.0) as client:
                    response = client.post(
                        WHISPER_URL,
                        headers=headers,
                        files=files,
                        data=data,
                    )
                    response.raise_for_status()
                    result = response.json()
                    return {
                        "text": result.get("text", ""),
                        "language": result.get("language", "unknown"),
                    }
        except Exception as e:
            last_error = e
            logger.warning(f"Whisper API attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt
                time.sleep(wait_time)

    raise RuntimeError(f"Whisper transcription failed after {MAX_RETRIES} attempts: {last_error}")


def _split_audio(file_path: str) -> list[str]:
    """Split audio file into 10-minute chunks. Returns list of temp file paths."""
    audio = AudioSegment.from_file(file_path)
    chunks = []
    temp_dir = tempfile.mkdtemp()

    for i, start_ms in enumerate(range(0, len(audio), CHUNK_DURATION_MS)):
        chunk = audio[start_ms : start_ms + CHUNK_DURATION_MS]
        chunk_path = os.path.join(temp_dir, f"chunk_{i}.m4a")
        chunk.export(chunk_path, format="ipod")  # ipod = m4a/aac format
        chunks.append(chunk_path)

    return chunks


def transcribe_audio(file_path: str) -> dict:
    """
    Transcribe an audio file. If the file is > 20MB, split into 10-minute chunks.
    Returns dict with 'text' (full transcript) and 'language'.
    """
    file_size = os.path.getsize(file_path)

    if file_size <= MAX_FILE_SIZE_BYTES:
        return _transcribe_single_file(file_path)

    logger.info(f"File size {file_size} bytes exceeds 20MB, splitting into chunks")
    chunk_paths = _split_audio(file_path)
    try:
        transcripts = []
        language = "unknown"
        for i, chunk_path in enumerate(chunk_paths):
            logger.info(f"Transcribing chunk {i + 1}/{len(chunk_paths)}")
            result = _transcribe_single_file(chunk_path)
            transcripts.append(result["text"])
            if i == 0:
                language = result.get("language", "unknown")

        full_text = " ".join(transcripts)
        return {"text": full_text, "language": language}
    finally:
        for chunk_path in chunk_paths:
            try:
                os.unlink(chunk_path)
            except OSError:
                pass
        try:
            os.rmdir(os.path.dirname(chunk_paths[0]))
        except OSError:
            pass
