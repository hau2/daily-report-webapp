-- Migration: 005_membership_management
-- Phase: 06 - Membership Management
-- Adds left_at column for soft-delete of team memberships

-- Add left_at column for soft-deleting memberships (preserves historical data)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ DEFAULT NULL;

-- Drop the old unique constraint and replace with a partial unique index
-- that only enforces uniqueness for active members (left_at IS NULL)
-- Note: drop the constraint first (which also drops its backing index)
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_active_unique
  ON team_members (team_id, user_id)
  WHERE left_at IS NULL;
