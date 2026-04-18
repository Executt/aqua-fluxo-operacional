
-- ============================================================================
-- 1. PROFILES (vínculo auth.users <-> aplicação)
-- ============================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  operador_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ROLES (RBAC seguro com SECURITY DEFINER)
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'auditor', 'operador');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','gestor','auditor')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_operador(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT operador_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================================================
-- 3. CURADORIA — Operadores
-- ============================================================================
CREATE TYPE public.tipo_operador AS ENUM ('estadual','regional','municipal','privado','autarquia');

CREATE TABLE public.operadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL UNIQUE,
  razao_social text NOT NULL,
  nome_fantasia text,
  tipo tipo_operador NOT NULL,
  uf char(2) NOT NULL,
  email_contato text,
  telefone text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.operador_municipios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id uuid NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
  municipio_ibge text NOT NULL,           -- 7 dígitos IBGE
  municipio_nome text NOT NULL,
  uf char(2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operador_id, municipio_ibge)
);

ALTER TABLE public.operador_municipios ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_op_mun_operador ON public.operador_municipios(operador_id);
CREATE INDEX idx_op_mun_ibge ON public.operador_municipios(municipio_ibge);

-- Adiciona FK profiles -> operadores agora que existe
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_operador_fk
  FOREIGN KEY (operador_id) REFERENCES public.operadores(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. CURADORIA — Tipologias de Tratamento (domínio)
-- ============================================================================
CREATE TABLE public.tipologias_tratamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  categoria text NOT NULL,                -- preliminar / primario / secundario / terciario
  descricao text,
  eficiencia_dbo_tipica_min numeric(5,2),
  eficiencia_dbo_tipica_max numeric(5,2),
  ativo boolean NOT NULL DEFAULT true
);

ALTER TABLE public.tipologias_tratamento ENABLE ROW LEVEL SECURITY;

INSERT INTO public.tipologias_tratamento (codigo, nome, categoria, eficiencia_dbo_tipica_min, eficiencia_dbo_tipica_max) VALUES
  ('LAG_FAC','Lagoa Facultativa','secundario',70,85),
  ('LAG_ANA','Lagoa Anaeróbia','secundario',50,70),
  ('LAG_AER','Lagoa Aerada','secundario',75,90),
  ('REA_UASB','Reator UASB','secundario',60,75),
  ('FIL_BIO','Filtro Biológico','secundario',80,90),
  ('LOD_ATV','Lodos Ativados','secundario',85,95),
  ('LOD_ATV_AER','Lodos Ativados c/ Aeração Prolongada','secundario',90,97),
  ('TRA_PRI','Tratamento Primário','primario',30,40),
  ('TRA_PRE','Tratamento Preliminar','preliminar',5,10),
  ('TER_NUT','Terciário Remoção de Nutrientes','terciario',95,99);

-- ============================================================================
-- 5. CURADORIA — ETEs
-- ============================================================================
CREATE TYPE public.status_operacional AS ENUM ('ativa','em_construcao_ampliacao','inativa_desativada','planejada');
CREATE TYPE public.faixa_eficiencia_dbo AS ENUM ('baixa','normal','alta');

CREATE TABLE public.etes_curadoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id uuid NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
  tipologia_id uuid REFERENCES public.tipologias_tratamento(id),
  codigo text NOT NULL UNIQUE,            -- ETE-CONCESSIONARIA-NNN
  nome text NOT NULL,
  municipio_ibge text NOT NULL,
  municipio_nome text NOT NULL,
  uf char(2) NOT NULL,
  latitude numeric(9,6),
  longitude numeric(9,6),
  status_operacional status_operacional NOT NULL DEFAULT 'ativa',
  vazao_projeto_lps numeric(10,2),        -- L/s
  vazao_atual_lps numeric(10,2),
  populacao_atendida integer,
  eficiencia_dbo_pct numeric(5,2),        -- 0-100
  faixa_dbo faixa_eficiencia_dbo,
  ano_inicio_operacao integer,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_lat CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  CONSTRAINT chk_lng CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
  CONSTRAINT chk_eficiencia CHECK (eficiencia_dbo_pct IS NULL OR (eficiencia_dbo_pct BETWEEN 0 AND 100)),
  CONSTRAINT chk_vazao_proj CHECK (vazao_projeto_lps IS NULL OR vazao_projeto_lps >= 0),
  CONSTRAINT chk_vazao_atu CHECK (vazao_atual_lps IS NULL OR vazao_atual_lps >= 0),
  CONSTRAINT chk_pop CHECK (populacao_atendida IS NULL OR populacao_atendida >= 0)
);

ALTER TABLE public.etes_curadoria ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_etes_cur_operador ON public.etes_curadoria(operador_id);
CREATE INDEX idx_etes_cur_municipio ON public.etes_curadoria(municipio_ibge);
CREATE INDEX idx_etes_cur_status ON public.etes_curadoria(status_operacional);

-- Trigger: classifica faixa_dbo automaticamente
CREATE OR REPLACE FUNCTION public.classify_faixa_dbo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.eficiencia_dbo_pct IS NULL THEN
    NEW.faixa_dbo := NULL;
  ELSIF NEW.eficiencia_dbo_pct < 60 THEN
    NEW.faixa_dbo := 'baixa';
  ELSIF NEW.eficiencia_dbo_pct <= 80 THEN
    NEW.faixa_dbo := 'normal';
  ELSE
    NEW.faixa_dbo := 'alta';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_classify_faixa_dbo
  BEFORE INSERT OR UPDATE OF eficiencia_dbo_pct ON public.etes_curadoria
  FOR EACH ROW EXECUTE FUNCTION public.classify_faixa_dbo();

-- ============================================================================
-- 6. CURADORIA — Formulário Respostas (state machine)
-- ============================================================================
CREATE TYPE public.estado_resposta AS ENUM ('rascunho','submetido','em_analise','validado','rejeitado');

CREATE TABLE public.formulario_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ete_id uuid NOT NULL REFERENCES public.etes_curadoria(id) ON DELETE CASCADE,
  operador_id uuid NOT NULL REFERENCES public.operadores(id) ON DELETE CASCADE,
  user_submitter uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_revisor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ano_referencia integer NOT NULL,
  mes_referencia integer NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  estado estado_resposta NOT NULL DEFAULT 'rascunho',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,    -- respostas dinâmicas
  motivo_rejeicao text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ete_id, ano_referencia, mes_referencia)
);

ALTER TABLE public.formulario_respostas ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fr_ete ON public.formulario_respostas(ete_id);
CREATE INDEX idx_fr_operador ON public.formulario_respostas(operador_id);
CREATE INDEX idx_fr_estado ON public.formulario_respostas(estado);

-- Trigger: valida transições da state machine
CREATE OR REPLACE FUNCTION public.validate_estado_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'rascunho' AND NEW.estado <> 'submetido' THEN
      RAISE EXCEPTION 'Estado inicial deve ser rascunho ou submetido';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: bloqueia mudanças em registros validado/rejeitado
  IF OLD.estado IN ('validado','rejeitado') AND NEW.estado = OLD.estado THEN
    -- permite só campos administrativos (motivo_rejeicao, reviewed_at)
    IF OLD.payload IS DISTINCT FROM NEW.payload THEN
      RAISE EXCEPTION 'Resposta % é imutável', OLD.estado;
    END IF;
  END IF;

  -- Transições válidas
  IF OLD.estado <> NEW.estado THEN
    IF NOT (
      (OLD.estado = 'rascunho'   AND NEW.estado = 'submetido') OR
      (OLD.estado = 'submetido'  AND NEW.estado = 'em_analise') OR
      (OLD.estado = 'em_analise' AND NEW.estado IN ('validado','rejeitado')) OR
      (OLD.estado = 'rejeitado'  AND NEW.estado = 'rascunho')
    ) THEN
      RAISE EXCEPTION 'Transição inválida: % -> %', OLD.estado, NEW.estado;
    END IF;
  END IF;

  -- Carimbos
  IF NEW.estado = 'submetido' AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at := now();
  END IF;
  IF NEW.estado IN ('validado','rejeitado') AND NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_estado
  BEFORE INSERT OR UPDATE ON public.formulario_respostas
  FOR EACH ROW EXECUTE FUNCTION public.validate_estado_transition();

-- ============================================================================
-- 7. TRIGGERS updated_at em todas
-- ============================================================================
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_operadores_updated BEFORE UPDATE ON public.operadores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_etes_cur_updated BEFORE UPDATE ON public.etes_curadoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fr_updated BEFORE UPDATE ON public.formulario_respostas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. AUTO-CRIAR PROFILE no signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

-- profiles: usuário lê o próprio; staff lê todos
CREATE POLICY "Profile self read" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Profile self update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Profile admin manage" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles: só staff lê; só admin escreve
CREATE POLICY "Roles self read" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Roles admin manage" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- operadores: staff vê todos; operador vê o seu
CREATE POLICY "Operadores read" ON public.operadores
  FOR SELECT TO authenticated USING (
    public.is_staff(auth.uid())
    OR id = public.get_user_operador(auth.uid())
  );
CREATE POLICY "Operadores admin write" ON public.operadores
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- operador_municipios: mesma lógica
CREATE POLICY "OpMun read" ON public.operador_municipios
  FOR SELECT TO authenticated USING (
    public.is_staff(auth.uid())
    OR operador_id = public.get_user_operador(auth.uid())
  );
CREATE POLICY "OpMun admin write" ON public.operador_municipios
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- tipologias: leitura pública autenticada; escrita admin
CREATE POLICY "Tipologias read" ON public.tipologias_tratamento
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tipologias admin write" ON public.tipologias_tratamento
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- etes_curadoria
CREATE POLICY "EtesCur read" ON public.etes_curadoria
  FOR SELECT TO authenticated USING (
    public.is_staff(auth.uid())
    OR operador_id = public.get_user_operador(auth.uid())
  );
CREATE POLICY "EtesCur operador insert" ON public.etes_curadoria
  FOR INSERT TO authenticated WITH CHECK (
    operador_id = public.get_user_operador(auth.uid())
    OR public.is_staff(auth.uid())
  );
CREATE POLICY "EtesCur operador update" ON public.etes_curadoria
  FOR UPDATE TO authenticated USING (
    (operador_id = public.get_user_operador(auth.uid()))
    OR public.is_staff(auth.uid())
  );
CREATE POLICY "EtesCur admin delete" ON public.etes_curadoria
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- formulario_respostas
CREATE POLICY "FR read" ON public.formulario_respostas
  FOR SELECT TO authenticated USING (
    public.is_staff(auth.uid())
    OR operador_id = public.get_user_operador(auth.uid())
  );
CREATE POLICY "FR operador insert" ON public.formulario_respostas
  FOR INSERT TO authenticated WITH CHECK (
    operador_id = public.get_user_operador(auth.uid())
  );
CREATE POLICY "FR operador update" ON public.formulario_respostas
  FOR UPDATE TO authenticated USING (
    (operador_id = public.get_user_operador(auth.uid()) AND estado IN ('rascunho','rejeitado'))
    OR (public.is_staff(auth.uid()))
  );
-- sem DELETE (imutabilidade)

-- ============================================================================
-- 10. CAMADA ANALÍTICA (Star Schema + Materialized Views) — Metabase
-- ============================================================================

-- Dimensões
CREATE MATERIALIZED VIEW public.dim_municipio AS
SELECT DISTINCT
  municipio_ibge AS municipio_ibge,
  municipio_nome AS municipio_nome,
  uf AS uf
FROM public.etes_curadoria
WHERE municipio_ibge IS NOT NULL;
CREATE UNIQUE INDEX idx_dim_municipio ON public.dim_municipio(municipio_ibge);

CREATE MATERIALIZED VIEW public.dim_tipologia AS
SELECT id AS tipologia_id, codigo, nome, categoria
FROM public.tipologias_tratamento;
CREATE UNIQUE INDEX idx_dim_tipologia ON public.dim_tipologia(tipologia_id);

CREATE MATERIALIZED VIEW public.dim_operador AS
SELECT id AS operador_id, cnpj, razao_social, tipo, uf
FROM public.operadores;
CREATE UNIQUE INDEX idx_dim_operador ON public.dim_operador(operador_id);

-- Fato
CREATE MATERIALIZED VIEW public.fato_etes_curadoria AS
SELECT
  e.id AS ete_id,
  e.operador_id,
  e.tipologia_id,
  e.municipio_ibge,
  e.uf,
  e.status_operacional,
  e.faixa_dbo,
  e.eficiencia_dbo_pct,
  e.vazao_atual_lps,
  e.vazao_projeto_lps,
  e.populacao_atendida,
  CASE WHEN e.vazao_projeto_lps > 0
       THEN ROUND((e.vazao_atual_lps / e.vazao_projeto_lps * 100)::numeric, 2)
       ELSE NULL END AS pct_utilizacao
FROM public.etes_curadoria e;
CREATE UNIQUE INDEX idx_fato_ete ON public.fato_etes_curadoria(ete_id);

-- Agregações para BI
CREATE MATERIALIZED VIEW public.mv_cobertura_municipal AS
SELECT
  municipio_ibge,
  uf,
  COUNT(*) AS qt_etes,
  COUNT(*) FILTER (WHERE status_operacional = 'ativa') AS qt_ativas,
  SUM(populacao_atendida) FILTER (WHERE status_operacional = 'ativa') AS pop_atendida,
  AVG(eficiencia_dbo_pct) FILTER (WHERE status_operacional = 'ativa') AS eficiencia_media_dbo
FROM public.etes_curadoria
GROUP BY municipio_ibge, uf;
CREATE UNIQUE INDEX idx_mv_cob_mun ON public.mv_cobertura_municipal(municipio_ibge);

CREATE MATERIALIZED VIEW public.mv_etes_por_tipologia AS
SELECT
  t.codigo,
  t.nome,
  t.categoria,
  e.uf,
  COUNT(e.id) AS qt_etes,
  AVG(e.eficiencia_dbo_pct) AS eficiencia_media_dbo
FROM public.tipologias_tratamento t
LEFT JOIN public.etes_curadoria e ON e.tipologia_id = t.id
GROUP BY t.codigo, t.nome, t.categoria, e.uf;
CREATE UNIQUE INDEX idx_mv_tip_uf ON public.mv_etes_por_tipologia(codigo, uf);

CREATE MATERIALIZED VIEW public.mv_dbo_regional AS
SELECT
  uf,
  CASE uf
    WHEN 'AC' THEN 'Norte' WHEN 'AP' THEN 'Norte' WHEN 'AM' THEN 'Norte' WHEN 'PA' THEN 'Norte' WHEN 'RO' THEN 'Norte' WHEN 'RR' THEN 'Norte' WHEN 'TO' THEN 'Norte'
    WHEN 'AL' THEN 'Nordeste' WHEN 'BA' THEN 'Nordeste' WHEN 'CE' THEN 'Nordeste' WHEN 'MA' THEN 'Nordeste' WHEN 'PB' THEN 'Nordeste' WHEN 'PE' THEN 'Nordeste' WHEN 'PI' THEN 'Nordeste' WHEN 'RN' THEN 'Nordeste' WHEN 'SE' THEN 'Nordeste'
    WHEN 'DF' THEN 'Centro-Oeste' WHEN 'GO' THEN 'Centro-Oeste' WHEN 'MT' THEN 'Centro-Oeste' WHEN 'MS' THEN 'Centro-Oeste'
    WHEN 'ES' THEN 'Sudeste' WHEN 'MG' THEN 'Sudeste' WHEN 'RJ' THEN 'Sudeste' WHEN 'SP' THEN 'Sudeste'
    WHEN 'PR' THEN 'Sul' WHEN 'RS' THEN 'Sul' WHEN 'SC' THEN 'Sul'
  END AS regiao,
  COUNT(*) AS qt_etes,
  AVG(eficiencia_dbo_pct) AS eficiencia_media_dbo,
  COUNT(*) FILTER (WHERE faixa_dbo='alta') AS qt_alta,
  COUNT(*) FILTER (WHERE faixa_dbo='normal') AS qt_normal,
  COUNT(*) FILTER (WHERE faixa_dbo='baixa') AS qt_baixa
FROM public.etes_curadoria
WHERE status_operacional = 'ativa'
GROUP BY uf;
CREATE UNIQUE INDEX idx_mv_dbo_uf ON public.mv_dbo_regional(uf);

-- Função para refresh (chamada pelo Metabase ou cron)
CREATE OR REPLACE FUNCTION public.refresh_metabase_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dim_municipio;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dim_tipologia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dim_operador;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.fato_etes_curadoria;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cobertura_municipal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_etes_por_tipologia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dbo_regional;
END;
$$;
