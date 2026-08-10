DROP POLICY IF EXISTS "Public read compliance" ON public.compliance_scores;
DROP POLICY IF EXISTS "Public read entidades" ON public.entidades;
DROP POLICY IF EXISTS "Public read etes" ON public.etes;
DROP POLICY IF EXISTS "Public read infracoes" ON public.infracoes;
DROP POLICY IF EXISTS "Public read leituras" ON public.sensor_leituras;
DROP POLICY IF EXISTS "Public read sensores" ON public.sensores;

CREATE POLICY "Authenticated read compliance" ON public.compliance_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read entidades" ON public.entidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read etes" ON public.etes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read infracoes" ON public.infracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read leituras" ON public.sensor_leituras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read sensores" ON public.sensores FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.compliance_scores, public.entidades, public.etes, public.infracoes, public.sensor_leituras, public.sensores FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_scores, public.entidades, public.etes, public.infracoes, public.sensor_leituras, public.sensores TO authenticated;
GRANT ALL ON public.compliance_scores, public.entidades, public.etes, public.infracoes, public.sensor_leituras, public.sensores TO service_role;

CREATE INDEX IF NOT EXISTS idx_infracoes_entidade_status_prazo ON public.infracoes (entidade_id, status, prazo);
CREATE INDEX IF NOT EXISTS idx_sensores_ete ON public.sensores (ete_id);
CREATE INDEX IF NOT EXISTS idx_etes_entidade ON public.etes (entidade_id);