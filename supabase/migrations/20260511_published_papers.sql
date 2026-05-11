ALTER TABLE mentor
ADD COLUMN IF NOT EXISTS published_papers jsonb DEFAULT '[]'::jsonb;
