// =============================================================================
// curadoria-ai-precheck
// Pré-validação de submissões mensais via Lovable AI com RAG-lite sobre
// knowledge_base (normas) + sasb_datasets (referências regulatórias).
// Retorna { warnings: string[], recomendacoes: string[], summary: string }
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json } from "../_shared/cors.ts";

interface PrecheckBody {
  ete_id?: string;
  ano_referencia?: number;
  mes_referencia?: number;
  payload?: Record<string, unknown>;
}

interface AiResult {
  warnings: string[];
  recomendacoes: string[];
  summary: string;
}

const SYSTEM = `Você é um auditor regulatório especialista em saneamento básico (SARSB / ANA 79-2022, CONAMA 357/2005, NR 79, Portaria GM/MS 888/2021).

Tarefa: validar uma submissão MENSAL de operador de ETE ANTES dela ser enviada à curadoria.
- Compare valores informados (eficiência DBO, pH, OD, vazão) com faixas típicas.
- Use o CONTEXTO regulatório (trechos de normas e indicadores SARSB) fornecido a seguir.
- Seja objetivo, técnico e em português do Brasil.

REGRA DO FALSO AFLUENTE (obrigatória):
Nunca afirme causalidade entre variáveis de saneamento (investimento, cobertura, eficiência)
e desfechos de saúde pública sem citar o \`estrato_dmi\` (Maturidade Institucional) e a
\`snis_completude_pct\` do município. Se esses controles não constarem do CONTEXTO, declare
explicitamente que qualquer inferência causal é inconclusiva por variável de confusão
(capacidade institucional / porte do município).

Responda SOMENTE com JSON válido no formato:
{
  "warnings": ["aviso curto 1", "aviso curto 2"],
  "recomendacoes": ["recomendação 1"],
  "summary": "1-2 frases de avaliação geral"
}
Se não houver problemas, retorne arrays vazios e summary positivo.`;

function tokenize(s: string): string[] {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
}

function scoreSnippet(query: string[], text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  for (const q of query) if (t.includes(q)) s += 1;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userResp } = await supabase.auth.getUser();
  if (!userResp.user) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as PrecheckBody | null;
  if (!body || !body.payload || typeof body.payload !== "object") {
    return json({ error: "Body inválido: payload obrigatório" }, 400);
  }

  // Contexto da ETE
  let eteCtx: Record<string, unknown> | null = null;
  if (body.ete_id) {
    const { data } = await supabase
      .from("etes_curadoria")
      .select("codigo, nome, municipio_nome, uf, tipologia, eficiencia_dbo_pct, faixa_dbo")
      .eq("id", body.ete_id)
      .maybeSingle();
    eteCtx = data ?? null;
  }

  // RAG-lite: termos derivados do payload + contexto
  const queryText = [
    "eficiencia DBO efluente esgoto sanitário",
    "pH OD oxigênio dissolvido",
    "CONAMA 357 lançamento",
    eteCtx?.tipologia ?? "",
    eteCtx?.uf ?? "",
  ].join(" ");
  const qTokens = tokenize(queryText);

  const [{ data: kb }, { data: ds }] = await Promise.all([
    supabase.from("knowledge_base")
      .select("title, category, content")
      .eq("active", true)
      .limit(40),
    supabase.from("sasb_datasets")
      .select("code, name, description, dimension, source_org")
      .eq("enabled", true)
      .eq("used_in_score", true)
      .limit(20),
  ]);

  const kbRanked = (kb ?? [])
    .map((r: any) => ({ r, s: scoreSnippet(qTokens, `${r.title} ${r.category} ${r.content}`) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => `[${x.r.category}] ${x.r.title}\n${String(x.r.content).slice(0, 600)}`);

  const dsCtx = (ds ?? [])
    .slice(0, 6)
    .map((d: any) => `- ${d.code} (${d.dimension}, ${d.source_org}): ${d.name} — ${d.description ?? ""}`);

  // DMI (Maturidade Institucional) do município da ETE — contexto anti-confounding
  let dmiCtx: Record<string, unknown> | null = null;
  if (eteCtx?.municipio_nome && eteCtx?.uf) {
    const { data: dmiRow } = await supabase
      .from("dim_maturidade_municipal")
      .select("municipio_nome, uf, idh_m, estrato_dmi, snis_completude_pct, servidores_reg_local")
      .eq("uf", eteCtx.uf as string)
      .ilike("municipio_nome", eteCtx.municipio_nome as string)
      .maybeSingle();
    dmiCtx = dmiRow ?? null;
  }

  const contexto = [
    eteCtx ? `ETE de referência: ${JSON.stringify(eteCtx)}` : "ETE: (sem contexto)",
    dmiCtx
      ? `Maturidade Institucional (DMI) do município: ${JSON.stringify(dmiCtx)}`
      : "Maturidade Institucional (DMI): (município não classificado — inferência causal proibida)",
    "Indicadores SARSB ativos:",
    ...dsCtx,
    "",
    "Trechos regulatórios relevantes:",
    ...kbRanked,
  ].join("\n");

  const userPrompt = `CONTEXTO:\n${contexto}\n\nSUBMISSÃO A VALIDAR (mês ${body.mes_referencia}/${body.ano_referencia}):\n${JSON.stringify(body.payload, null, 2)}`;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResp.ok) {
    if (aiResp.status === 429) return json({ error: "Limite de requisições do gateway IA" }, 429);
    if (aiResp.status === 402) return json({ error: "Créditos do gateway IA esgotados" }, 402);
    const t = await aiResp.text();
    console.error("gateway error", aiResp.status, t);
    return json({ error: "Falha no gateway IA" }, 502);
  }

  const aiJson = await aiResp.json();
  const text = aiJson?.choices?.[0]?.message?.content ?? "{}";
  let parsed: AiResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { warnings: [], recomendacoes: [], summary: text.slice(0, 300) };
  }

  return json({
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    recomendacoes: Array.isArray(parsed.recomendacoes) ? parsed.recomendacoes : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    context_used: { kb_snippets: kbRanked.length, sasb_datasets: dsCtx.length },
  });
});
