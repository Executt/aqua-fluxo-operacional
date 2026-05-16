-- LLM models catalog
CREATE TABLE public.llm_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  tier text NOT NULL DEFAULT 'paid',
  context_window integer,
  description text,
  capabilities text[] DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.llm_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LLM read auth" ON public.llm_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "LLM admin write" ON public.llm_models FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_llm_models_updated BEFORE UPDATE ON public.llm_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MCP servers
CREATE TABLE public.mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  url text NOT NULL,
  transport text NOT NULL DEFAULT 'http',
  auth_type text NOT NULL DEFAULT 'none',
  auth_config jsonb DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mcp_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MCP read auth" ON public.mcp_servers FOR SELECT TO authenticated USING (true);
CREATE POLICY "MCP admin write" ON public.mcp_servers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_mcp_servers_updated BEFORE UPDATE ON public.mcp_servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Knowledge base
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  tags text[] DEFAULT '{}',
  content text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  author_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KB read auth" ON public.knowledge_base FOR SELECT TO authenticated USING (true);
CREATE POLICY "KB admin write" ON public.knowledge_base FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_kb_updated BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed real Lovable AI Gateway models
INSERT INTO public.llm_models (provider, model_id, display_name, tier, context_window, description, capabilities) VALUES
  ('google', 'google/gemini-3-flash-preview', 'Gemini 3 Flash (Preview)', 'free', 1000000, 'Modelo rápido de última geração — padrão recomendado. Gratuito até 13/10/2025 via Lovable AI Gateway.', ARRAY['chat','multimodal','tools']),
  ('google', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'paid', 1000000, 'Equilíbrio entre custo e qualidade — multimodal e raciocínio sólido.', ARRAY['chat','multimodal','tools']),
  ('google', 'google/gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 'paid', 1000000, 'Mais barato e rápido para classificação, sumarização e tarefas simples.', ARRAY['chat','classification']),
  ('google', 'google/gemini-2.5-pro', 'Gemini 2.5 Pro', 'premium', 2000000, 'Topo da família Gemini — raciocínio complexo, contexto enorme e visão.', ARRAY['chat','multimodal','reasoning','tools']),
  ('google', 'google/gemini-3.1-pro-preview', 'Gemini 3.1 Pro (Preview)', 'premium', 1000000, 'Preview do modelo de raciocínio de próxima geração da Google.', ARRAY['chat','reasoning']),
  ('google', 'google/gemini-3.1-flash-lite-preview', 'Gemini 3.1 Flash Lite (Preview)', 'paid', 1000000, 'Versão eficiente do Gemini 3.1 para alto volume.', ARRAY['chat','classification']),
  ('google', 'google/gemini-3-pro-image-preview', 'Gemini 3 Pro Image (Preview)', 'premium', NULL, 'Geração de imagens de alta qualidade (Nano Banana 2 Pro).', ARRAY['image-gen']),
  ('google', 'google/gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image', 'paid', NULL, 'Geração e edição rápida de imagens com qualidade pro.', ARRAY['image-gen','image-edit']),
  ('google', 'google/gemini-2.5-flash-image', 'Gemini 2.5 Flash Image (Nano Banana)', 'paid', NULL, 'Edição e geração de imagens.', ARRAY['image-gen','image-edit']),
  ('openai', 'openai/gpt-5', 'GPT-5', 'premium', 400000, 'Modelo principal da OpenAI — raciocínio top, multimodal, alto custo.', ARRAY['chat','multimodal','reasoning','tools']),
  ('openai', 'openai/gpt-5-mini', 'GPT-5 Mini', 'paid', 400000, 'Meio-termo da OpenAI — boa performance, menor custo e latência.', ARRAY['chat','multimodal','tools']),
  ('openai', 'openai/gpt-5-nano', 'GPT-5 Nano', 'paid', 400000, 'Rápido e barato — ideal para tarefas simples de alto volume.', ARRAY['chat','classification']),
  ('openai', 'openai/gpt-5.2', 'GPT-5.2', 'premium', 400000, 'Modelo mais recente da OpenAI com raciocínio aprimorado.', ARRAY['chat','reasoning','tools']),
  ('openai', 'openai/gpt-5.4', 'GPT-5.4', 'premium', 400000, 'Raciocínio avançado para problemas complexos de múltiplos passos.', ARRAY['chat','reasoning','tools']),
  ('openai', 'openai/gpt-5.4-mini', 'GPT-5.4 Mini', 'paid', 400000, 'Versão mais rápida e barata do GPT-5.4.', ARRAY['chat','reasoning']);

-- Seed example MCP servers (placeholders disabled)
INSERT INTO public.mcp_servers (name, description, url, transport, auth_type, active) VALUES
  ('Notion (oficial)', 'Acesso a páginas e bases do Notion.', 'https://mcp.notion.com/mcp', 'http', 'oauth', false),
  ('Linear (oficial)', 'Issues, projetos e ciclos do Linear.', 'https://mcp.linear.app/mcp', 'http', 'oauth', false),
  ('Sentry (oficial)', 'Erros e issues do Sentry.', 'https://mcp.sentry.dev/mcp', 'http', 'oauth', false);

-- Seed knowledge base examples
INSERT INTO public.knowledge_base (title, category, tags, content) VALUES
  ('Política de qualidade da água — DBO', 'regulatorio', ARRAY['DBO','CONAMA','efluentes'],
   'A Resolução CONAMA 430/2011 estabelece padrão de DBO de até 120 mg/L para lançamento de efluentes em corpos d''água, com eficiência mínima de remoção de 60% (ou conforme legislação estadual mais restritiva).'),
  ('Procedimento de calibração de sensores', 'operacional', ARRAY['sensores','IoT','calibração'],
   'Sensores de pH devem ser calibrados a cada 30 dias com soluções tampão 4.0, 7.0 e 10.0. Sensores de turbidez requerem calibração quinzenal com padrões formazina.'),
  ('Fluxo de submissão de relatórios', 'curadoria', ARRAY['workflow','formulário'],
   'Operadores submetem dados em estado rascunho → submetido. A equipa de curadoria revê e marca como em_analise → validado/rejeitado. Apenas registos validados entram nas materialized views do Metabase.');