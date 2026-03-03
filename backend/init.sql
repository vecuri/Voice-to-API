-- VoiceAPI Database Initialization
-- Run this against your PostgreSQL database to create tables manually.
-- Note: The FastAPI app auto-creates tables on startup via SQLAlchemy,
-- so this file is provided as a reference / for manual setup.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key VARCHAR(128) UNIQUE NOT NULL,
    device_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_users_api_key ON users (api_key);

CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    text TEXT NOT NULL,
    duration_seconds FLOAT,
    language VARCHAR(10),
    recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_transcripts_user_id_created_at ON transcripts (user_id, created_at);
