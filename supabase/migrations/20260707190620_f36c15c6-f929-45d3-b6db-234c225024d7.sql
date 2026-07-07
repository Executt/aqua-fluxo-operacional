
-- =========================================
-- entidade_api_keys
-- =========================================
CREATE TABLE public.entidade_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  nome text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  criada_por uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entidade_api_keys_entidade ON public.entidade_api_keys(entidade_id);
CREATE INDEX idx_entidade_api_keys_active ON public.entidade_api_keys(entidade_id) WHERE revoked_at IS NULL;

GRANT SELECT ON public.entidade_api_keys TO authenticated;
GRANT ALL ON public.entidade_api_keys TO service_role;

ALTER TABLE public.entidade_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view api keys"
  ON public.entidade_api_keys FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins/gestores manage api keys"
  ON public.entidade_api_keys FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER trg_entidade_api_keys_updated
  BEFORE UPDATE ON public.entidade_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- entidade_integracao_config
-- =========================================
CREATE TABLE public.entidade_integracao_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_id uuid NOT NULL UNIQUE REFERENCES public.entidades(id) ON DELETE CASCADE,
  webhook_url text,
  webhook_secret_name text,
  notificacoes_ativas boolean NOT NULL DEFAULT true,
  contatos jsonb NOT NULL DEFAULT '[]'::jsonb,
  atualizado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.entidade_integracao_config TO authenticated;
GRANT ALL ON public.entidade_integracao_config TO service_role;

ALTER TABLE public.entidade_integracao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view integracao config"
  ON public.entidade_integracao_config FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins/gestores manage integracao config"
  ON public.entidade_integracao_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER trg_entidade_integracao_config_updated
  BEFORE UPDATE ON public.entidade_integracao_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
