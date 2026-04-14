
-- 1. Entidades (Concessionárias)
CREATE TABLE public.entidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  area_atuacao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read entidades" ON public.entidades FOR SELECT USING (true);
CREATE POLICY "Auth insert entidades" ON public.entidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update entidades" ON public.entidades FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete entidades" ON public.entidades FOR DELETE TO authenticated USING (true);

-- 2. ETEs
CREATE TABLE public.etes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  entidade_id UUID REFERENCES public.entidades(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.etes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read etes" ON public.etes FOR SELECT USING (true);
CREATE POLICY "Auth insert etes" ON public.etes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update etes" ON public.etes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete etes" ON public.etes FOR DELETE TO authenticated USING (true);

-- 3. Sensores
CREATE TABLE public.sensores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  ete_id UUID NOT NULL REFERENCES public.etes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT '',
  limite_legal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal',
  bateria INTEGER NOT NULL DEFAULT 100,
  sinal TEXT NOT NULL DEFAULT 'forte',
  ultima_leitura TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sensores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sensores" ON public.sensores FOR SELECT USING (true);
CREATE POLICY "Auth insert sensores" ON public.sensores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update sensores" ON public.sensores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete sensores" ON public.sensores FOR DELETE TO authenticated USING (true);

-- 4. Sensor Leituras (time-series)
CREATE TABLE public.sensor_leituras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES public.sensores(id) ON DELETE CASCADE,
  valor DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sensor_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read leituras" ON public.sensor_leituras FOR SELECT USING (true);
CREATE POLICY "Auth insert leituras" ON public.sensor_leituras FOR INSERT TO authenticated WITH CHECK (true);

-- Index for time-series queries
CREATE INDEX idx_leituras_sensor_time ON public.sensor_leituras (sensor_id, created_at DESC);

-- 5. Compliance Scores
CREATE TABLE public.compliance_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entidade_id UUID NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  metas_cumpridas INTEGER NOT NULL DEFAULT 0,
  metas_total INTEGER NOT NULL DEFAULT 48,
  tendencia TEXT NOT NULL DEFAULT 'stable',
  status TEXT NOT NULL DEFAULT 'parcial',
  ultima_auditoria DATE,
  infracoes_abertas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entidade_id, mes)
);

ALTER TABLE public.compliance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read compliance" ON public.compliance_scores FOR SELECT USING (true);
CREATE POLICY "Auth insert compliance" ON public.compliance_scores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update compliance" ON public.compliance_scores FOR UPDATE TO authenticated USING (true);

-- 6. Infrações
CREATE TABLE public.infracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  entidade_id UUID NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  norma TEXT NOT NULL,
  gravidade TEXT NOT NULL DEFAULT 'media',
  data_ocorrencia DATE NOT NULL DEFAULT CURRENT_DATE,
  prazo DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.infracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read infracoes" ON public.infracoes FOR SELECT USING (true);
CREATE POLICY "Auth insert infracoes" ON public.infracoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update infracoes" ON public.infracoes FOR UPDATE TO authenticated USING (true);

-- 7. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_entidades_updated_at BEFORE UPDATE ON public.entidades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_etes_updated_at BEFORE UPDATE ON public.etes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sensores_updated_at BEFORE UPDATE ON public.sensores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compliance_updated_at BEFORE UPDATE ON public.compliance_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_infracoes_updated_at BEFORE UPDATE ON public.infracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for sensor readings
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_leituras;
