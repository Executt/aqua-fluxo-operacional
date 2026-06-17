
-- Audit trail table for formulario_respostas
CREATE TABLE IF NOT EXISTS public.formulario_respostas_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id uuid NOT NULL,
  ete_id uuid,
  operador_id uuid,
  ano integer,
  mes integer,
  operacao text NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  estado_anterior text,
  estado_novo text,
  payload_anterior jsonb,
  payload_novo jsonb,
  motivo_rejeicao text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.formulario_respostas_audit TO authenticated;
GRANT ALL ON public.formulario_respostas_audit TO service_role;

ALTER TABLE public.formulario_respostas_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff lê todo o histórico de auditoria"
  ON public.formulario_respostas_audit FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Operador lê auditoria do seu operador"
  ON public.formulario_respostas_audit FOR SELECT
  TO authenticated
  USING (operador_id = public.get_user_operador(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_fra_ete ON public.formulario_respostas_audit(ete_id);
CREATE INDEX IF NOT EXISTS idx_fra_estado_novo ON public.formulario_respostas_audit(estado_novo);
CREATE INDEX IF NOT EXISTS idx_fra_changed_at ON public.formulario_respostas_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fra_resposta ON public.formulario_respostas_audit(resposta_id);

-- Trigger function
CREATE OR REPLACE FUNCTION public.log_formulario_respostas_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  BEGIN v_uid := auth.uid(); EXCEPTION WHEN OTHERS THEN v_uid := NULL; END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.formulario_respostas_audit
      (resposta_id, ete_id, operador_id, ano, mes, operacao, estado_anterior, estado_novo, payload_anterior, payload_novo, motivo_rejeicao, changed_by)
    VALUES (NEW.id, NEW.ete_id, NEW.operador_id, NEW.ano, NEW.mes, 'INSERT', NULL, NEW.estado::text, NULL, NEW.payload, NEW.motivo_rejeicao, COALESCE(v_uid, NEW.updated_by));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.estado IS DISTINCT FROM NEW.estado
       OR OLD.payload IS DISTINCT FROM NEW.payload
       OR OLD.motivo_rejeicao IS DISTINCT FROM NEW.motivo_rejeicao THEN
      INSERT INTO public.formulario_respostas_audit
        (resposta_id, ete_id, operador_id, ano, mes, operacao, estado_anterior, estado_novo, payload_anterior, payload_novo, motivo_rejeicao, changed_by)
      VALUES (NEW.id, NEW.ete_id, NEW.operador_id, NEW.ano, NEW.mes, 'UPDATE', OLD.estado::text, NEW.estado::text,
              CASE WHEN OLD.payload IS DISTINCT FROM NEW.payload THEN OLD.payload ELSE NULL END,
              CASE WHEN OLD.payload IS DISTINCT FROM NEW.payload THEN NEW.payload ELSE NULL END,
              NEW.motivo_rejeicao, COALESCE(v_uid, NEW.updated_by));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.formulario_respostas_audit
      (resposta_id, ete_id, operador_id, ano, mes, operacao, estado_anterior, estado_novo, payload_anterior, payload_novo, motivo_rejeicao, changed_by)
    VALUES (OLD.id, OLD.ete_id, OLD.operador_id, OLD.ano, OLD.mes, 'DELETE', OLD.estado::text, NULL, OLD.payload, NULL, OLD.motivo_rejeicao, v_uid);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_formulario_respostas_audit ON public.formulario_respostas;
CREATE TRIGGER trg_formulario_respostas_audit
AFTER INSERT OR UPDATE OR DELETE ON public.formulario_respostas
FOR EACH ROW EXECUTE FUNCTION public.log_formulario_respostas_audit();
