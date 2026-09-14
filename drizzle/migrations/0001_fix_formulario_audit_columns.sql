CREATE OR REPLACE FUNCTION public.log_formulario_respostas_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
BEGIN
  BEGIN v_uid := auth.uid(); EXCEPTION WHEN OTHERS THEN v_uid := NULL; END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.formulario_respostas_audit
      (resposta_id, ete_id, operador_id, ano, mes, operacao, estado_anterior, estado_novo, payload_anterior, payload_novo, motivo_rejeicao, changed_by)
    VALUES (NEW.id, NEW.ete_id, NEW.operador_id, NEW.ano_referencia, NEW.mes_referencia, 'INSERT', NULL, NEW.estado::text, NULL, NEW.payload, NEW.motivo_rejeicao, COALESCE(v_uid, NEW.updated_by));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.estado IS DISTINCT FROM NEW.estado
       OR OLD.payload IS DISTINCT FROM NEW.payload
       OR OLD.motivo_rejeicao IS DISTINCT FROM NEW.motivo_rejeicao THEN
      INSERT INTO public.formulario_respostas_audit
        (resposta_id, ete_id, operador_id, ano, mes, operacao, estado_anterior, estado_novo, payload_anterior, payload_novo, motivo_rejeicao, changed_by)
      VALUES (NEW.id, NEW.ete_id, NEW.operador_id, NEW.ano_referencia, NEW.mes_referencia, 'UPDATE', OLD.estado::text, NEW.estado::text,
              CASE WHEN OLD.payload IS DISTINCT FROM NEW.payload THEN OLD.payload ELSE NULL END,
              CASE WHEN OLD.payload IS DISTINCT FROM NEW.payload THEN NEW.payload ELSE NULL END,
              NEW.motivo_rejeicao, COALESCE(v_uid, NEW.updated_by));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.formulario_respostas_audit
      (resposta_id, ete_id, operador_id, ano, mes, operacao, estado_anterior, estado_novo, payload_anterior, payload_novo, motivo_rejeicao, changed_by)
    VALUES (OLD.id, OLD.ete_id, OLD.operador_id, OLD.ano_referencia, OLD.mes_referencia, 'DELETE', OLD.estado::text, NULL, OLD.payload, NULL, OLD.motivo_rejeicao, v_uid);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;