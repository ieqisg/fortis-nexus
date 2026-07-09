-- Add is_disabled flag to mentor and MENTEE_GROUPS tables for soft-delete support.
-- This allows admins to disable accounts without removing data.

ALTER TABLE mentor
    ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MENTEE_GROUPS"
    ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

-- Also add to mock and demo tables for consistency
ALTER TABLE mock_mentor
    ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE mock_mentee_groups
    ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE demo_mentor
    ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE demo_mentee_groups
    ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;
