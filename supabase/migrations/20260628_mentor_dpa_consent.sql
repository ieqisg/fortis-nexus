ALTER TABLE mentor
ADD COLUMN IF NOT EXISTS dpa_consent_accepted boolean NOT NULL DEFAULT false;

ALTER TABLE mentor
ADD COLUMN IF NOT EXISTS dpa_consent_at timestamptz;
