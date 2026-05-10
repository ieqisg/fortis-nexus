CREATE TABLE IF NOT EXISTS algorithm_logs (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    log_data   JSONB       NOT NULL
);
