CREATE TABLE public.curadoria_lote_auditoria (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id uuid NOT NULL,
  lote_pai_id uuid,
  tentativa integer NOT NULL DEFAULT 1,
  evento text NOT NULL CHECK (evento IN ('validacao','importacao','reenfileiramento','falha')),
  modo text CHECK (modo IN ('submeter','rascunho')),
  origem text CHECK (origem IN ('arquivo','colado','reenfileiramento')),
  nome_arquivo text,
  operador_id uuid REFERENCES public.operadores(id) ON DELETE SET NULL,
  ete_id uuid,
  ete_codigo text,
  uf text,
  ano_referencia integer,
  mes_referencia integer,
  resultado text NOT NULL,
  motivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  detalhe text,
  duracao_ms integer,
  actor_id uuid,
  actor_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_cla_lote ON public.curadoria_lote_auditoria (lote_id, created_at DESC);
CREATE INDEX idx_cla_created ON public.curadoria_lote_auditoria (created_at DESC);
CREATE INDEX idx_cla_operador ON public.curadoria_lote_auditoria (operador_id);

GRANT SELECT, INSERT ON public.curadoria_lote_auditoria TO authenticated;
GRANT ALL ON public.curadoria_lote_auditoria TO service_role;

ALTER TABLE public.curadoria_lote_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cla_select_staff_ou_proprio"
ON public.curadoria_lote_auditoria FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR actor_id = auth.uid() OR operador_id = public.get_user_operador(auth.uid()));

CREATE POLICY "cla_insert_proprio"
ON public.curadoria_lote_auditoria FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());