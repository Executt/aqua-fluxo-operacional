
-- 1) system_settings (chave/valor JSONB) — usado para pesos do DMI e futuros parâmetros
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_settings_read_auth" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "system_settings_admin_write" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.system_settings(key, value, description) VALUES
  ('dmi_pesos',
   '{"idh":0.3,"receita_pc":0.3,"servidores":0.2,"completude":0.2,"min_group_size":30}'::jsonb,
   'Pesos do Índice de Maturidade Institucional (DMI) e tamanho mínimo de grupo para inferência.')
ON CONFLICT (key) DO NOTHING;

-- 2) dim_maturidade_municipal
CREATE TYPE public.estrato_dmi AS ENUM ('A','B','C','D','E');

CREATE TABLE public.dim_maturidade_municipal (
  municipio_ibge text PRIMARY KEY,
  municipio_nome text NOT NULL,
  uf char(2) NOT NULL,
  idh_m numeric(4,3),
  pop_estimada integer,
  receita_corrente_pc numeric(14,2),
  servidores_reg_local integer,
  snis_completude_pct numeric(5,2),
  score_dmi numeric(6,3),
  estrato_dmi public.estrato_dmi NOT NULL DEFAULT 'E',
  fonte text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dim_maturidade_municipal TO authenticated;
GRANT ALL ON public.dim_maturidade_municipal TO service_role;
ALTER TABLE public.dim_maturidade_municipal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dmi_read_auth" ON public.dim_maturidade_municipal FOR SELECT TO authenticated USING (true);
CREATE POLICY "dmi_admin_write" ON public.dim_maturidade_municipal FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_dmi_estrato ON public.dim_maturidade_municipal(estrato_dmi);
CREATE INDEX idx_dmi_uf ON public.dim_maturidade_municipal(uf);

-- Seed inicial (capitais — dados públicos IBGE/Atlas PNUD 2010/SNIS)
INSERT INTO public.dim_maturidade_municipal
(municipio_ibge, municipio_nome, uf, idh_m, pop_estimada, receita_corrente_pc, servidores_reg_local, snis_completude_pct, score_dmi, estrato_dmi, fonte) VALUES
('3550308','São Paulo','SP',0.805,11895893,7200.00,180,98.5,0.912,'A','IBGE+SNIS 2023'),
('3304557','Rio de Janeiro','RJ',0.799,6211423,6100.00,140,96.2,0.874,'A','IBGE+SNIS 2023'),
('5300108','Brasília','DF',0.824,2817381,9800.00,210,99.1,0.945,'A','IBGE+SNIS 2023'),
('4106902','Curitiba','PR',0.823,1773733,5900.00,90,94.8,0.855,'A','IBGE+SNIS 2023'),
('4314902','Porto Alegre','RS',0.805,1332570,5400.00,80,93.5,0.828,'B','IBGE+SNIS 2023'),
('2611606','Recife','PE',0.772,1488920,4200.00,55,88.0,0.741,'B','IBGE+SNIS 2023'),
('2211001','Teresina','PI',0.751,868075,3100.00,32,79.5,0.640,'C','IBGE+SNIS 2023'),
('1600303','Macapá','AP',0.733,442933,2600.00,18,66.0,0.541,'D','IBGE+SNIS 2023')
ON CONFLICT (municipio_ibge) DO NOTHING;

-- 3) analytics_guardrail_log
CREATE TABLE public.analytics_guardrail_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  metric text NOT NULL,
  requested_controls jsonb,
  stratify_by text,
  outcome text NOT NULL,      -- 'blocked' | 'allowed'
  reason_code text,           -- 'MISSING_CONFOUNDER_CONTROL' | 'GROUP_TOO_SMALL' | 'OK'
  reason_msg text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analytics_guardrail_log TO authenticated;
GRANT ALL ON public.analytics_guardrail_log TO service_role;
ALTER TABLE public.analytics_guardrail_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guardrail_log_staff_read" ON public.analytics_guardrail_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE INDEX idx_guardrail_log_created ON public.analytics_guardrail_log(created_at DESC);

-- 4) sensitive_access_log
CREATE TABLE public.sensitive_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  resource text NOT NULL,      -- ex.: 'dim_maturidade_municipal'
  action text NOT NULL,        -- 'read' | 'export' | 'write'
  filters jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sensitive_access_log TO authenticated;
GRANT ALL ON public.sensitive_access_log TO service_role;
ALTER TABLE public.sensitive_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sens_log_staff_read" ON public.sensitive_access_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE INDEX idx_sens_log_created ON public.sensitive_access_log(created_at DESC);

-- 5) Integridade regulatória: hash do payload em formulario_respostas
ALTER TABLE public.formulario_respostas
  ADD COLUMN IF NOT EXISTS payload_sha256 text;

CREATE OR REPLACE FUNCTION public.set_payload_sha256()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payload IS NOT NULL THEN
    NEW.payload_sha256 := encode(digest(NEW.payload::text, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS trg_set_payload_sha256 ON public.formulario_respostas;
CREATE TRIGGER trg_set_payload_sha256
BEFORE INSERT OR UPDATE OF payload ON public.formulario_respostas
FOR EACH ROW EXECUTE FUNCTION public.set_payload_sha256();

-- Backfill
UPDATE public.formulario_respostas
   SET payload_sha256 = encode(digest(payload::text,'sha256'),'hex')
 WHERE payload IS NOT NULL AND payload_sha256 IS NULL;
