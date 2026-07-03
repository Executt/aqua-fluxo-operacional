
CREATE TABLE public.compliance_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('score','dbo','meta','infracao','ia','composta')),
  expressao_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  gravidade_default TEXT NOT NULL DEFAULT 'media' CHECK (gravidade_default IN ('leve','media','grave','critica')),
  prazo_dias INTEGER NOT NULL DEFAULT 30,
  usa_ia BOOLEAN NOT NULL DEFAULT false,
  ativa BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_regras TO authenticated;
GRANT ALL ON public.compliance_regras TO service_role;
ALTER TABLE public.compliance_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regras_staff_all" ON public.compliance_regras FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "regras_read_auth" ON public.compliance_regras FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_compliance_regras_updated_at BEFORE UPDATE ON public.compliance_regras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.planos_acao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infracao_id UUID,
  entidade_id UUID NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prazo_final DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (estado IN ('rascunho','submetido','em_analise','aprovado','rejeitado','concluido','atrasado')),
  motivo_rejeicao TEXT,
  submetido_por UUID REFERENCES auth.users(id),
  revisado_por UUID REFERENCES auth.users(id),
  submetido_em TIMESTAMPTZ,
  revisado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_acao TO authenticated;
GRANT ALL ON public.planos_acao TO service_role;
ALTER TABLE public.planos_acao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos_staff_all" ON public.planos_acao FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "planos_read_auth" ON public.planos_acao FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_planos_acao_updated_at BEFORE UPDATE ON public.planos_acao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_planos_acao_entidade ON public.planos_acao(entidade_id);
CREATE INDEX idx_planos_acao_estado ON public.planos_acao(estado);

CREATE TABLE public.planos_acao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id UUID NOT NULL REFERENCES public.planos_acao(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 1,
  acao TEXT NOT NULL,
  responsavel TEXT,
  prazo DATE,
  evidencia_url TEXT,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_acao_itens TO authenticated;
GRANT ALL ON public.planos_acao_itens TO service_role;
ALTER TABLE public.planos_acao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens_staff_all" ON public.planos_acao_itens FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "itens_read_auth" ON public.planos_acao_itens FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_planos_acao_itens_updated_at BEFORE UPDATE ON public.planos_acao_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.compliance_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_id UUID REFERENCES public.entidades(id) ON DELETE CASCADE,
  infracao_id UUID,
  plano_acao_id UUID REFERENCES public.planos_acao(id) ON DELETE SET NULL,
  destinatario_user_id UUID REFERENCES auth.users(id),
  destinatario_email TEXT,
  canal TEXT NOT NULL CHECK (canal IN ('in_app','email','webhook')),
  assunto TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  payload_json JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviada','falhou','lida')),
  tentativas INTEGER NOT NULL DEFAULT 0,
  enviado_em TIMESTAMPTZ,
  lido_em TIMESTAMPTZ,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_notificacoes TO authenticated;
GRANT ALL ON public.compliance_notificacoes TO service_role;
ALTER TABLE public.compliance_notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_staff_all" ON public.compliance_notificacoes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "notif_destinatario_read" ON public.compliance_notificacoes FOR SELECT TO authenticated
  USING (destinatario_user_id = auth.uid());
CREATE POLICY "notif_destinatario_mark_read" ON public.compliance_notificacoes FOR UPDATE TO authenticated
  USING (destinatario_user_id = auth.uid()) WITH CHECK (destinatario_user_id = auth.uid());
CREATE TRIGGER trg_compliance_notificacoes_updated_at BEFORE UPDATE ON public.compliance_notificacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_notif_destinatario ON public.compliance_notificacoes(destinatario_user_id, status);
CREATE INDEX idx_notif_entidade ON public.compliance_notificacoes(entidade_id);

CREATE TABLE public.compliance_escalonamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infracao_id UUID,
  plano_acao_id UUID REFERENCES public.planos_acao(id) ON DELETE SET NULL,
  nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 4),
  motivo TEXT NOT NULL,
  de_gravidade TEXT,
  para_gravidade TEXT,
  sancao_sugerida TEXT,
  disparado_por TEXT NOT NULL DEFAULT 'sistema',
  regra_id UUID REFERENCES public.compliance_regras(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.compliance_escalonamentos TO authenticated;
GRANT ALL ON public.compliance_escalonamentos TO service_role;
ALTER TABLE public.compliance_escalonamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escal_staff_all" ON public.compliance_escalonamentos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "escal_read_auth" ON public.compliance_escalonamentos FOR SELECT TO authenticated USING (true);

ALTER TABLE public.infracoes
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'manual'
    CHECK (origem IN ('manual','automatica','ia')),
  ADD COLUMN IF NOT EXISTS regra_id UUID REFERENCES public.compliance_regras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prazo_tratativa DATE,
  ADD COLUMN IF NOT EXISTS plano_acao_id UUID REFERENCES public.planos_acao(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalonamento_nivel INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.planos_acao
  ADD CONSTRAINT planos_acao_infracao_fk
  FOREIGN KEY (infracao_id) REFERENCES public.infracoes(id) ON DELETE SET NULL;

INSERT INTO public.system_settings (key, value, description)
VALUES
  ('compliance_thresholds', jsonb_build_object(
      'score_minimo', 60, 'dbo_minimo_pct', 60, 'atraso_meta_dias', 30, 'prazo_padrao_dias', 30
    ), 'Limiares determinísticos para auto-abertura de infrações'),
  ('compliance_webhook_endpoints', '[]'::jsonb, 'Endpoints webhook por entidade'),
  ('compliance_email_from', jsonb_build_object('email','compliance@ana.gov.br','nome','ANA — Compliance SARSB'),
    'Remetente padrão de notificações')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.compliance_regras (codigo, nome, descricao, tipo, expressao_json, gravidade_default, prazo_dias)
VALUES
  ('SCORE_BAIXO', 'Score de compliance abaixo do mínimo', 'Score global < 60 por 2 ciclos consecutivos', 'score',
    jsonb_build_object('operador','<','campo','score','valor',60,'ciclos',2), 'grave', 30),
  ('DBO_INSUFICIENTE', 'Eficiência DBO insuficiente', 'Eficiência DBO da ETE < 60%', 'dbo',
    jsonb_build_object('operador','<','campo','eficiencia_dbo_pct','valor',60), 'grave', 45),
  ('META_ATRASADA', 'Meta contratual atrasada', 'Meta em atraso > 30 dias', 'meta',
    jsonb_build_object('operador','>','campo','dias_atraso','valor',30), 'media', 30)
ON CONFLICT (codigo) DO NOTHING;
