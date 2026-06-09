
CREATE TABLE public.sasb_datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  dimension TEXT NOT NULL CHECK (dimension IN ('Cobertura','Qualidade','Atendimento','Econômico-Financeiro')),
  source_org TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'conectado' CHECK (status IN ('conectado','desatualizado','erro','sincronizando')),
  records BIGINT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  used_in_score BOOLEAN NOT NULL DEFAULT false,
  quality_score INT CHECK (quality_score BETWEEN 0 AND 100),
  last_sync_at TIMESTAMPTZ,
  sync_interval_minutes INT NOT NULL DEFAULT 1440,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sasb_datasets TO authenticated;
GRANT ALL ON public.sasb_datasets TO service_role;

ALTER TABLE public.sasb_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sasb_datasets read for authenticated"
  ON public.sasb_datasets FOR SELECT TO authenticated USING (true);
CREATE POLICY "sasb_datasets admin manage"
  ON public.sasb_datasets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_sasb_datasets_updated_at
  BEFORE UPDATE ON public.sasb_datasets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sasb_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.sasb_datasets(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','warning','error')),
  records_in BIGINT DEFAULT 0,
  records_out BIGINT DEFAULT 0,
  records_invalid BIGINT DEFAULT 0,
  completeness_pct NUMERIC(5,2),
  validity_pct NUMERIC(5,2),
  freshness_days INT,
  quality_score INT CHECK (quality_score BETWEEN 0 AND 100),
  message TEXT,
  warnings JSONB DEFAULT '[]'::jsonb,
  triggered_by TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual','scheduled','api')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sasb_sync_logs TO authenticated;
GRANT ALL ON public.sasb_sync_logs TO service_role;

ALTER TABLE public.sasb_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sasb_sync_logs read for authenticated"
  ON public.sasb_sync_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "sasb_sync_logs admin manage"
  ON public.sasb_sync_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_sasb_sync_logs_dataset_started ON public.sasb_sync_logs(dataset_id, started_at DESC);

-- Seed inicial
INSERT INTO public.sasb_datasets (code, name, description, dimension, source_org, endpoint, status, records, enabled, used_in_score, quality_score, last_sync_at, sync_interval_minutes) VALUES
('SARSB.COB-01','Cobertura de coleta de esgoto por município','Indicador IN015/IN056 — SNIS. Base oficial usada na dimensão Cobertura (ANA NR 79/2022).','Cobertura','SNIS','https://app4.mdr.gov.br/serieHistorica/','conectado',5570,true,true,94, now() - interval '2 days', 1440),
('SARSB.QUAL-01','Eficiência de tratamento de efluentes (DBO)','Eficiência DBO declarada por ETE conforme NR 79/2022 — faixas baixa/normal/alta.','Qualidade','ANA','rpc:fato_etes_curadoria','conectado',3284,true,true,91, now() - interval '1 day', 720),
('SARSB.QUAL-02','Conformidade de potabilidade (Portaria GM/MS 888/2021)','Percentual de amostras conformes (cloro residual, turbidez, coliformes).','Qualidade','ANA','https://dados.ana.gov.br/dataset/qualidade-agua-distribuida','desatualizado',1842,true,true,76, now() - interval '5 days', 1440),
('SARSB.ATD-01','Reclamações ANA/ARSESP — Ouvidoria','Volume mensal de reclamações registradas e taxa de resolução em 30 dias.','Atendimento','ANA','https://dados.ana.gov.br/dataset/ouvidoria','desatualizado',12540,true,false,68, now() - interval '7 days', 1440),
('SARSB.ECO-01','Equilíbrio econômico-financeiro (SNIS-FN)','Indicadores IN012/IN029/IN060 — sustentabilidade tarifária e endividamento.','Econômico-Financeiro','SNIS','https://app4.mdr.gov.br/serieHistorica/','conectado',5210,true,true,88, now() - interval '3 days', 2880),
('SARSB.COB-02','População IBGE estimada (denominador)','Estimativas populacionais municipais — denominador dos indicadores de cobertura.','Cobertura','IBGE','https://servicodados.ibge.gov.br/api/v3/agregados','erro',0,false,false,0, now() - interval '14 days', 10080);
