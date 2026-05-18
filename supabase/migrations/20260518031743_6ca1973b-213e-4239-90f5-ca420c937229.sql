ALTER TABLE public.llm_models ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS llm_models_only_one_default
  ON public.llm_models ((is_default)) WHERE is_default = true;

-- Seed: mark gemini-3-flash-preview as default if exists, else first active free
UPDATE public.llm_models SET is_default = true
WHERE id = (
  SELECT id FROM public.llm_models
  WHERE active = true
  ORDER BY (model_id = 'google/gemini-3-flash-preview') DESC,
           (tier = 'free') DESC,
           display_name
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.llm_models WHERE is_default = true);