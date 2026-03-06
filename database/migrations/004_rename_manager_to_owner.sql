-- Migration: 004_rename_manager_to_owner
-- Renames the 'manager' role to 'owner' in team_members

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

-- Step 2: Update existing rows
UPDATE team_members SET role = 'owner' WHERE role = 'manager';

-- Step 3: Re-add the CHECK constraint with new values
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check CHECK (role IN ('owner', 'member'));
