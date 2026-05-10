-- Milestones: mentor sets tasks/deadlines per mentee group
CREATE TABLE IF NOT EXISTS milestones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id uuid NOT NULL REFERENCES mentor(id) ON DELETE CASCADE,
    mentee_group_id uuid NOT NULL REFERENCES "MENTEE_GROUPS"(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    due_date date,
    completed boolean NOT NULL DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Meeting notes: mentor writes session notes on the recurring meeting record
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS notes text;

-- Mentor announcements: mentor broadcasts to their own matched mentees only
CREATE TABLE IF NOT EXISTS mentor_announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id uuid NOT NULL REFERENCES mentor(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    created_at timestamptz DEFAULT now()
);
