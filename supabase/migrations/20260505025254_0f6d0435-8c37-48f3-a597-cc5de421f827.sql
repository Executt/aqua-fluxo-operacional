ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS metabase_overdue_threshold_min integer NOT NULL DEFAULT 20
CHECK (metabase_overdue_threshold_min BETWEEN 1 AND 1440);