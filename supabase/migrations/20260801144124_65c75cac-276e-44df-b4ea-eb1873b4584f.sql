-- === Campos adicionais ===
ALTER TABLE public.data_repositories
  ADD COLUMN IF NOT EXISTS folder_mappings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS file_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_status text;

ALTER TABLE public.database_connections
  ADD COLUMN IF NOT EXISTS engine_version text,
  ADD COLUMN IF NOT EXISTS compat_notes text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- === Fila / histórico de testes de conexão ===
CREATE TABLE IF NOT EXISTS public.connection_test_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target text NOT NULL CHECK (target IN ('repository','database')),
  target_id uuid NOT NULL,
  target_name text,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','done','error')),
  result_status conn_test_status,
  message text,
  latency_ms integer,
  attempt integer NOT NULL DEFAULT 1,
  requested_by uuid,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.connection_test_jobs TO authenticated;
GRANT ALL ON public.connection_test_jobs TO service_role;
ALTER TABLE public.connection_test_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff lê testes" ON public.connection_test_jobs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin/gestor cria testes" ON public.connection_test_jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Admin/gestor atualiza testes" ON public.connection_test_jobs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));
CREATE INDEX IF NOT EXISTS idx_ctj_target ON public.connection_test_jobs(target, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ctj_state ON public.connection_test_jobs(state) WHERE state IN ('queued','running');
CREATE TRIGGER trg_ctj_updated BEFORE UPDATE ON public.connection_test_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === Jobs de sincronização de repositórios ===
CREATE TABLE IF NOT EXISTS public.repository_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL REFERENCES public.data_repositories(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'incremental' CHECK (mode IN ('full','incremental','upload')),
  source_path text,
  file_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','done','error')),
  files_found integer NOT NULL DEFAULT 0,
  files_synced integer NOT NULL DEFAULT 0,
  files_skipped integer NOT NULL DEFAULT 0,
  bytes_synced bigint NOT NULL DEFAULT 0,
  message text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_by uuid,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.repository_sync_jobs TO authenticated;
GRANT ALL ON public.repository_sync_jobs TO service_role;
ALTER TABLE public.repository_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff lê syncs" ON public.repository_sync_jobs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin/gestor cria syncs" ON public.repository_sync_jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Admin/gestor atualiza syncs" ON public.repository_sync_jobs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));
CREATE INDEX IF NOT EXISTS idx_rsj_repo ON public.repository_sync_jobs(repository_id, created_at DESC);
CREATE TRIGGER trg_rsj_updated BEFORE UPDATE ON public.repository_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === Trilha de auditoria de infraestrutura ===
CREATE TABLE IF NOT EXISTS public.infra_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('repository','database')),
  entity_id uuid NOT NULL,
  entity_name text,
  action text NOT NULL CHECK (action IN ('create','update','activate','deactivate','delete','test','sync')),
  motivo text,
  changed_by uuid,
  changed_by_email text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.infra_audit_log TO authenticated;
GRANT ALL ON public.infra_audit_log TO service_role;
ALTER TABLE public.infra_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff lê auditoria infra" ON public.infra_audit_log
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin/gestor regista auditoria infra" ON public.infra_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));
CREATE INDEX IF NOT EXISTS idx_infra_audit ON public.infra_audit_log(entity_type, entity_id, created_at DESC);