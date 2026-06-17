
-- Add audit trail column updated_by to formulario_respostas
ALTER TABLE public.formulario_respostas
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Index on estado for query performance (recommendation from analysis)
CREATE INDEX IF NOT EXISTS idx_formulario_respostas_estado
  ON public.formulario_respostas(estado);

-- Trigger function that stamps updated_by from auth.uid() on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  -- auth.uid() returns NULL when called from service_role / cron
  BEGIN
    v_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NOT NULL THEN
    NEW.updated_by := v_uid;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_formulario_respostas_set_updated_by ON public.formulario_respostas;
CREATE TRIGGER trg_formulario_respostas_set_updated_by
  BEFORE INSERT OR UPDATE ON public.formulario_respostas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by();

-- Ensure updated_at is also maintained
DROP TRIGGER IF EXISTS trg_formulario_respostas_updated_at ON public.formulario_respostas;
CREATE TRIGGER trg_formulario_respostas_updated_at
  BEFORE UPDATE ON public.formulario_respostas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
