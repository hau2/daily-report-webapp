-- Migration: 002_team_management
-- Phase: 02 - Team Management
-- Creates teams, team_members, and team_invitations tables

CREATE TABLE IF NOT EXISTS teams (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('manager', 'member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_invitations (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id       UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email TEXT        NOT NULL,
  token_hash    TEXT        NOT NULL,
  used_at       TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index: only one pending invitation per (team, email)
CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_pending_unique
  ON team_invitations (team_id, invitee_email)
  WHERE used_at IS NULL;

-- Auto-update updated_at on teams row change
-- Reuses the update_updated_at_column() function created in 001_initial_schema.sql
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
