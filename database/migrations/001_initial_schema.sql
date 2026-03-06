-- Migration: 001_initial_schema
-- Phase: 01 - Foundation and Auth
-- Creates the core users table used by NestJS auth system

CREATE TABLE IF NOT EXISTS users (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email              TEXT        NOT NULL UNIQUE,
  password_hash      TEXT        NOT NULL,
  display_name       TEXT,
  timezone           TEXT        NOT NULL DEFAULT 'UTC',
  email_verified     BOOLEAN     NOT NULL DEFAULT false,
  refresh_token_hash TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for fast email lookups (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
