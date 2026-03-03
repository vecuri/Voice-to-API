import os
import uuid
import tempfile
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse

from auth import get_current_user
from database import Base, engine, get_db
from models import Transcript, User
from schemas import (
    DeleteResponse,
    ErrorResponse,
    RegisterRequest,
    RegisterResponse,
    TranscriptListResponse,
    TranscriptResponse,
)
from whisper import transcribe_audio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _key_func(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.removeprefix("Bearer ").strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_key_func)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    yield


app = FastAPI(
    title="VoiceAPI",
    description="Voice recording transcription API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Maximum 100 requests per minute."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _generate_api_key() -> str:
    return "vapi_sk_" + uuid.uuid4().hex[:32]


def _make_title(text: str) -> str:
    words = text.split()
    if len(words) <= 5:
        return " ".join(words).capitalize()
    return " ".join(words[:5]).capitalize() + "..."


def _transcript_to_response(t: Transcript) -> TranscriptResponse:
    return TranscriptResponse(
        id=str(t.id),
        title=t.title,
        text=t.text,
        duration_seconds=t.duration_seconds,
        language=t.language,
        recorded_at=t.recorded_at.isoformat() if t.recorded_at else None,
        created_at=t.created_at.isoformat(),
    )


@app.post("/v1/register", response_model=RegisterResponse)
async def register(body: RegisterRequest = RegisterRequest(), db: Session = Depends(get_db)):
    api_key = _generate_api_key()
    user = User(
        api_key=api_key,
        device_id=body.device_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegisterResponse(api_key=api_key, user_id=f"usr_{str(user.id).replace('-', '')[:24]}")


@app.post("/v1/transcripts/upload", response_model=TranscriptResponse)
@limiter.limit("100/minute")
async def upload_transcript(
    request: Request,
    file: UploadFile = File(...),
    duration_seconds: int = Form(0),
    recorded_at: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith((".m4a", ".mp4", ".wav", ".mp3", ".webm", ".ogg")):
        raise HTTPException(status_code=400, detail="Unsupported audio format. Use .m4a, .mp4, .wav, .mp3, .webm, or .ogg")

    tmp_dir = tempfile.mkdtemp()
    tmp_path = os.path.join(tmp_dir, file.filename or "audio.m4a")

    try:
        content = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(content)

        result = transcribe_audio(tmp_path)
        text = result["text"]
        language = result["language"]

        title = _make_title(text)

        parsed_recorded_at = None
        if recorded_at:
            try:
                parsed_recorded_at = datetime.fromisoformat(recorded_at.replace("Z", "+00:00"))
            except ValueError:
                parsed_recorded_at = datetime.now(timezone.utc)
        else:
            parsed_recorded_at = datetime.now(timezone.utc)

        transcript = Transcript(
            user_id=user.id,
            title=title,
            text=text,
            duration_seconds=duration_seconds,
            language=language,
            recorded_at=parsed_recorded_at,
        )
        db.add(transcript)
        db.commit()
        db.refresh(transcript)

        return _transcript_to_response(transcript)

    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        try:
            os.rmdir(tmp_dir)
        except OSError:
            pass


@app.get("/v1/transcripts", response_model=TranscriptListResponse)
@limiter.limit("100/minute")
async def list_transcripts(
    request: Request,
    since: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)

    query = db.query(Transcript).filter(Transcript.user_id == user.id)

    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            query = query.filter(Transcript.created_at > since_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid 'since' timestamp format")

    total = query.count()
    transcripts = query.order_by(Transcript.created_at.desc()).offset(offset).limit(limit).all()
    has_more = (offset + limit) < total

    return TranscriptListResponse(
        transcripts=[_transcript_to_response(t) for t in transcripts],
        total=total,
        has_more=has_more,
    )


@app.get("/v1/transcripts/{transcript_id}", response_model=TranscriptResponse)
@limiter.limit("100/minute")
async def get_transcript(
    request: Request,
    transcript_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    transcript = (
        db.query(Transcript)
        .filter(Transcript.id == transcript_id, Transcript.user_id == user.id)
        .first()
    )
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return _transcript_to_response(transcript)


@app.delete("/v1/transcripts/{transcript_id}", response_model=DeleteResponse)
@limiter.limit("100/minute")
async def delete_transcript(
    request: Request,
    transcript_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    transcript = (
        db.query(Transcript)
        .filter(Transcript.id == transcript_id, Transcript.user_id == user.id)
        .first()
    )
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    db.delete(transcript)
    db.commit()

    return DeleteResponse(deleted=True)
