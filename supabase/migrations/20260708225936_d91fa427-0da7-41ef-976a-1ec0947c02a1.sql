
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.repo_kind AS ENUM ('documents','images','geospatial','mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.repo_provider AS ENUM (
    'aws_s3','azure_blob','gcp_gcs','oci_object',
    'google_drive','onedrive','sharepoint','dropbox','box',
    'filesystem','ftp','sftp','http','minio','outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.db_engine AS ENUM (
    'postgres','mysql','mssql','mariadb','mongodb','oracle',
    'oci_autonomous','snowflake','bigquery','redshift','clickhouse',
    'dynamodb','cosmosdb','sqlite','duckdb','outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.conn_test_status AS ENUM ('ok','warn','fail','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ data_repositories ============
CREATE TABLE IF NOT EXISTS public.data_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  kind public.repo_kind NOT NULL DEFAULT 'documents',
  provider public.repo_provider NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_ref text,
  tags text[] NOT NULL DEFAULT '{}',
  doc_count integer NOT NULL DEFAULT 0,
  size_bytes bigint NOT NULL DEFAULT 0,
  last_test_at timestamptz,
  last_test_status public.conn_test_status,
  last_test_message text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_repositories TO authenticated;
GRANT ALL ON public.data_repositories TO service_role;

ALTER TABLE public.data_repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repos read staff"
  ON public.data_repositories FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "repos write admin/gestor"
  ON public.data_repositories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));

CREATE TRIGGER data_repositories_updated_at
  BEFORE UPDATE ON public.data_repositories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ database_connections ============
CREATE TABLE IF NOT EXISTS public.database_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  engine public.db_engine NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_ref text,
  tags text[] NOT NULL DEFAULT '{}',
  read_only boolean NOT NULL DEFAULT true,
  last_test_at timestamptz,
  last_test_status public.conn_test_status,
  last_test_message text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.database_connections TO authenticated;
GRANT ALL ON public.database_connections TO service_role;

ALTER TABLE public.database_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dbconn read staff"
  ON public.database_connections FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "dbconn write admin/gestor"
  ON public.database_connections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));

CREATE TRIGGER database_connections_updated_at
  BEFORE UPDATE ON public.database_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_data_repositories_provider ON public.data_repositories(provider);
CREATE INDEX IF NOT EXISTS idx_data_repositories_kind ON public.data_repositories(kind);
CREATE INDEX IF NOT EXISTS idx_database_connections_engine ON public.database_connections(engine);
