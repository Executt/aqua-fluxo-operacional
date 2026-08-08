CREATE TABLE public.curadoria_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL UNIQUE,
  checksum text NOT NULL,
  titulo text NOT NULL,
  escopo text,
  total_registos integer NOT NULL DEFAULT 0,
  compativeis integer NOT NULL DEFAULT 0,
  incompativeis integer NOT NULL DEFAULT 0,
  assinante_nome text NOT NULL,
  assinante_cargo text,
  assinante_email text,
  assinante_papeis text[] NOT NULL DEFAULT '{}',
  emitido_por uuid REFERENCES auth.users(id),
  emitido_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.curadoria_documentos TO authenticated;
GRANT ALL ON public.curadoria_documentos TO service_role;

ALTER TABLE public.curadoria_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados registam os seus documentos"
  ON public.curadoria_documentos FOR INSERT TO authenticated
  WITH CHECK (emitido_por = auth.uid());

CREATE POLICY "Emissor e staff consultam documentos"
  ON public.curadoria_documentos FOR SELECT TO authenticated
  USING (emitido_por = auth.uid() OR public.is_staff(auth.uid()));

CREATE INDEX idx_curadoria_documentos_protocolo ON public.curadoria_documentos (protocolo);

ALTER TABLE public.curadoria_lote_auditoria REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.curadoria_lote_auditoria;