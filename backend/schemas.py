from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    device_id: Optional[str] = None


class RegisterResponse(BaseModel):
    api_key: str
    user_id: str


class TranscriptResponse(BaseModel):
    id: str
    title: str
    text: str
    duration_seconds: Optional[float] = None
    language: Optional[str] = None
    recorded_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class TranscriptListResponse(BaseModel):
    transcripts: list[TranscriptResponse]
    total: int
    has_more: bool


class DeleteResponse(BaseModel):
    deleted: bool


class ErrorResponse(BaseModel):
    detail: str
