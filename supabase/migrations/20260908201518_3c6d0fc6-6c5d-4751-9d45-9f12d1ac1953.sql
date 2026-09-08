-- 1. Metadados de governança nos repositórios e bases
ALTER TABLE public.data_repositories
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS custo_acesso_mensal numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_manutencao_mensal numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS criticidade text NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS sla_atualizacao_horas integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS metadata_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata_updated_by uuid;

ALTER TABLE public.database_connections
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS custo_acesso_mensal numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_manutencao_mensal numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS criticidade text NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS sla_atualizacao_horas integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS metadata_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata_updated_by uuid;

-- 2. Alertas de monitorização
CREATE TABLE IF NOT EXISTS public.repo_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target text NOT NULL CHECK (target IN ('repositorio','base')),
  target_id uuid NOT NULL,
  target_name text,
  tipo text NOT NULL CHECK (tipo IN ('conexao_falha','sync_parado','sem_dados')),
  severidade text NOT NULL DEFAULT 'alta',
  mensagem text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','resolvido')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repo_alertas TO authenticated;
GRANT ALL ON public.repo_alertas TO service_role;

ALTER TABLE public.repo_alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff le alertas" ON public.repo_alertas;
CREATE POLICY "Staff le alertas" ON public.repo_alertas
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admin gere alertas" ON public.repo_alertas;
CREATE POLICY "Admin gere alertas" ON public.repo_alertas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS repo_alertas_aberto_uniq
  ON public.repo_alertas (target, target_id, tipo) WHERE status = 'aberto';
CREATE INDEX IF NOT EXISTS repo_alertas_status_idx ON public.repo_alertas (status, last_seen_at DESC);

DROP TRIGGER IF EXISTS trg_repo_alertas_updated ON public.repo_alertas;
CREATE TRIGGER trg_repo_alertas_updated BEFORE UPDATE ON public.repo_alertas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Detector automático
CREATE OR REPLACE FUNCTION public.detect_repo_alertas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_abertos int;
  v_resolvidos int;
BEGIN
  CREATE TEMP TABLE tmp_alertas (
    target text, target_id uuid, target_name text, tipo text,
    severidade text, mensagem text, detalhes jsonb
  ) ON COMMIT DROP;

  INSERT INTO tmp_alertas
  SELECT 'repositorio', r.id, r.name, 'conexao_falha', 'alta',
         'Ultimo teste de conexao falhou: ' || COALESCE(r.last_test_message,'sem detalhe'),
         jsonb_build_object('provider', r.provider, 'last_test_at', r.last_test_at)
  FROM public.data_repositories r
  WHERE r.active AND r.last_test_status = 'fail';

  INSERT INTO tmp_alertas
  SELECT 'repositorio', r.id, r.name, 'sync_parado', 'media',
         CASE WHEN r.last_sync_at IS NULL THEN 'Nunca sincronizado'
              ELSE 'Sem sincronizacao ha ' || round(EXTRACT(EPOCH FROM (now() - r.last_sync_at))/3600)::text || 'h (SLA ' || r.sla_atualizacao_horas || 'h)' END,
         jsonb_build_object('last_sync_at', r.last_sync_at, 'sla_horas', r.sla_atualizacao_horas)
  FROM public.data_repositories r
  WHERE r.active
    AND (r.last_sync_at IS NULL OR r.last_sync_at < now() - make_interval(hours => r.sla_atualizacao_horas));

  INSERT INTO tmp_alertas
  SELECT 'repositorio', r.id, r.name, 'sem_dados', 'media',
         'Repositorio ativo sem documentos indexados',
         jsonb_build_object('doc_count', r.doc_count, 'size_bytes', r.size_bytes)
  FROM public.data_repositories r
  WHERE r.active AND COALESCE(r.doc_count,0) = 0;

  INSERT INTO tmp_alertas
  SELECT 'base', c.id, c.name, 'conexao_falha', 'alta',
         'Ultimo teste de conexao falhou: ' || COALESCE(c.last_test_message,'sem detalhe'),
         jsonb_build_object('engine', c.engine, 'last_test_at', c.last_test_at)
  FROM public.database_connections c
  WHERE c.active AND c.last_test_status = 'fail';

  INSERT INTO tmp_alertas
  SELECT 'base', c.id, c.name, 'sync_parado', 'media',
         CASE WHEN c.last_test_at IS NULL THEN 'Nunca testada'
              ELSE 'Sem verificacao ha ' || round(EXTRACT(EPOCH FROM (now() - c.last_test_at))/3600)::text || 'h (SLA ' || c.sla_atualizacao_horas || 'h)' END,
         jsonb_build_object('last_test_at', c.last_test_at, 'sla_horas', c.sla_atualizacao_horas)
  FROM public.database_connections c
  WHERE c.active
    AND (c.last_test_at IS NULL OR c.last_test_at < now() - make_interval(hours => c.sla_atualizacao_horas));

  INSERT INTO public.repo_alertas (target, target_id, target_name, tipo, severidade, mensagem, detalhes)
  SELECT target, target_id, target_name, tipo, severidade, mensagem, detalhes FROM tmp_alertas
  ON CONFLICT (target, target_id, tipo) WHERE status = 'aberto'
  DO UPDATE SET last_seen_at = now(), mensagem = EXCLUDED.mensagem, detalhes = EXCLUDED.detalhes,
                target_name = EXCLUDED.target_name, updated_at = now();

  GET DIAGNOSTICS v_abertos = ROW_COUNT;

  UPDATE public.repo_alertas a
     SET status = 'resolvido', resolved_at = now(), updated_at = now()
   WHERE a.status = 'aberto'
     AND NOT EXISTS (
       SELECT 1 FROM tmp_alertas t
        WHERE t.target = a.target AND t.target_id = a.target_id AND t.tipo = a.tipo
     );
  GET DIAGNOSTICS v_resolvidos = ROW_COUNT;

  RETURN jsonb_build_object('checked_at', now(), 'ativos', v_abertos, 'resolvidos', v_resolvidos);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.detect_repo_alertas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.detect_repo_alertas() TO authenticated, service_role;

-- 4. Reconciliacao horaria
SELECT cron.unschedule('repo_monitor_15min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'repo_monitor_15min');
SELECT cron.unschedule('repo_monitor_hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'repo_monitor_hourly');
SELECT cron.schedule('repo_monitor_hourly', '0 * * * *', $$SELECT public.detect_repo_alertas();$$);