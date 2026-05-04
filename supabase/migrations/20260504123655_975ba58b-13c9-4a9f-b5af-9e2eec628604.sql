-- 1. Extensões necessárias
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- 2. Role read-only para o Metabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metabase_reader') THEN
    CREATE ROLE metabase_reader LOGIN NOINHERIT;
  END IF;
END$$;

-- Acesso ao schema
GRANT USAGE ON SCHEMA public TO metabase_reader;

-- Sem acesso às tabelas transacionais
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM metabase_reader;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM metabase_reader;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM metabase_reader;

-- SELECT apenas nas dimensões, fato e materialized views analíticas
GRANT SELECT ON
  public.dim_municipio,
  public.dim_tipologia,
  public.dim_operador,
  public.fato_etes_curadoria,
  public.mv_cobertura_municipal,
  public.mv_etes_por_tipologia,
  public.mv_dbo_regional
TO metabase_reader;

-- 3. Agendamento: refresh a cada 15 minutos
-- Remove job anterior se já existir (idempotência)
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'refresh_metabase_views_15min';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END$$;

SELECT cron.schedule(
  'refresh_metabase_views_15min',
  '*/15 * * * *',
  $$ SELECT public.refresh_metabase_views(); $$
);