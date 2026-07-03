// =============================================================================
// compliance-auto-detect
// Varre scores / etes / metas aplicando regras determinísticas em
// `compliance_regras` (ativa=true). Para cada violação:
//   1. abre infração (origem='automatica', regra_id, prazo_tratativa)
//   2. cria plano_acao em estado 'rascunho' vinculado
//   3. enfileira notificações (in_app + email + webhook)
// Chamado sob demanda pela UI (staff) ou por cron.
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json } from "../_shared/cors.ts";

type Regra = {
  id: string; codigo: string; nome: string; tipo: string;
  expressao_json: Record<string, unknown>;
  gravidade_default: string; prazo_dias: number; ativa: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Autoriza staff via anon-scoped client
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return json({ error: "Unauthorized" }, 401);
  const { data: staff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
  if (!staff) return json({ error: "Staff only" }, 403);

  // Carrega regras ativas + thresholds
  const [{ data: regras }, { data: thr }] = await Promise.all([
    supabase.from("compliance_regras").select("*").eq("ativa", true),
    supabase.from("system_settings").select("value").eq("key", "compliance_thresholds").maybeSingle(),
  ]);
  const thresholds = (thr?.value ?? {}) as Record<string, number>;

  const abertas: any[] = [];
  const notifs: any[] = [];

  // --- Regra SCORE_BAIXO ---
  const scoreRegra = regras?.find((r: Regra) => r.codigo === "SCORE_BAIXO");
  if (scoreRegra) {
    const min = (scoreRegra.expressao_json as any).valor ?? thresholds.score_minimo ?? 60;
    const { data: scores } = await supabase
      .from("compliance_scores").select("id, entidade_id, score, entidades(nome)").lt("score", min);
    for (const s of scores ?? []) {
      abertas.push({
        entidade_id: s.entidade_id, regra_id: scoreRegra.id, gravidade: scoreRegra.gravidade_default,
        codigo: `AUTO-SCORE-${Date.now()}-${(s.entidade_id as string).slice(0, 4)}`,
        descricao: `Score ${s.score}% < mínimo ${min}% (regra ${scoreRegra.codigo}).`,
        norma: "SARSB / Resolução ANA nº 43/2001", origem: "automatica",
        prazo_dias: scoreRegra.prazo_dias, nome_entidade: (s as any).entidades?.nome,
      });
    }
  }

  // --- Regra DBO_INSUFICIENTE ---
  const dboRegra = regras?.find((r: Regra) => r.codigo === "DBO_INSUFICIENTE");
  if (dboRegra) {
    const min = (dboRegra.expressao_json as any).valor ?? thresholds.dbo_minimo_pct ?? 60;
    const { data: etes } = await supabase
      .from("etes").select("id, nome, entidade_id, eficiencia_dbo_pct").lt("eficiencia_dbo_pct", min);
    for (const e of etes ?? []) {
      if (!e.entidade_id) continue;
      abertas.push({
        entidade_id: e.entidade_id, regra_id: dboRegra.id, gravidade: dboRegra.gravidade_default,
        codigo: `AUTO-DBO-${Date.now()}-${(e.id as string).slice(0, 4)}`,
        descricao: `ETE ${e.nome}: eficiência DBO ${e.eficiencia_dbo_pct}% < mínimo ${min}%.`,
        norma: "CONAMA 430/2011 · SARSB", origem: "automatica",
        prazo_dias: dboRegra.prazo_dias,
      });
    }
  }

  // --- Deduplica com infrações abertas da mesma regra+entidade nos últimos 60 dias ---
  const cutoff = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  const { data: recentes } = await supabase
    .from("infracoes").select("entidade_id, regra_id, status")
    .in("status", ["aberta", "em_analise"]).gte("created_at", cutoff);
  const jaAberto = new Set((recentes ?? []).map((r: any) => `${r.entidade_id}::${r.regra_id}`));
  const paraAbrir = abertas.filter((a) => !jaAberto.has(`${a.entidade_id}::${a.regra_id}`));

  // --- Insere infrações + planos + notificações ---
  const inseridas: any[] = [];
  for (const inf of paraAbrir) {
    const prazo = new Date(Date.now() + inf.prazo_dias * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { data: infRow, error: infErr } = await supabase
      .from("infracoes").insert({
        entidade_id: inf.entidade_id, codigo: inf.codigo, descricao: inf.descricao,
        norma: inf.norma, gravidade: inf.gravidade, status: "aberta",
        origem: inf.origem, regra_id: inf.regra_id, prazo_tratativa: prazo,
      }).select().single();
    if (infErr || !infRow) continue;

    const { data: planoRow } = await supabase
      .from("planos_acao").insert({
        infracao_id: infRow.id, entidade_id: inf.entidade_id,
        titulo: `Plano de ação — ${inf.codigo}`,
        descricao: `Plano de ação obrigatório para tratativa da infração ${inf.codigo}. ${inf.descricao}`,
        prazo_final: prazo, estado: "rascunho",
      }).select().single();

    if (planoRow) {
      await supabase.from("infracoes").update({ plano_acao_id: planoRow.id }).eq("id", infRow.id);
    }

    // Localiza operador responsável via entidades.email_contato (se existir)
    const { data: ent } = await supabase.from("entidades").select("nome").eq("id", inf.entidade_id).maybeSingle();

    const assunto = `[COMPLIANCE] Não-conformidade automática ${inf.codigo}`;
    const mensagem =
      `Foi identificada automaticamente uma não-conformidade em ${ent?.nome ?? "sua entidade"}.\n\n` +
      `Regra: ${inf.codigo}\nGravidade: ${inf.gravidade}\nPrazo de tratativa: ${prazo}\n\n` +
      `${inf.descricao}\n\n` +
      `Um plano de ação foi criado em rascunho. Acesse o portal para submeter o plano dentro do prazo.`;

    // in_app: notifica todos os staff (fan-out simples; UI filtra por destinatario_user_id)
    const { data: staffProfiles } = await supabase
      .from("user_roles").select("user_id").in("role", ["admin", "gestor", "auditor"]);
    for (const s of staffProfiles ?? []) {
      notifs.push({
        entidade_id: inf.entidade_id, infracao_id: infRow.id, plano_acao_id: planoRow?.id ?? null,
        destinatario_user_id: s.user_id, canal: "in_app", assunto, mensagem,
        payload_json: { codigo: inf.codigo, gravidade: inf.gravidade, prazo },
        status: "pendente",
      });
    }
    // email + webhook (dispatch assíncrono)
    notifs.push({
      entidade_id: inf.entidade_id, infracao_id: infRow.id, plano_acao_id: planoRow?.id ?? null,
      destinatario_email: null, canal: "email", assunto, mensagem,
      payload_json: { codigo: inf.codigo, gravidade: inf.gravidade, prazo },
      status: "pendente",
    });
    notifs.push({
      entidade_id: inf.entidade_id, infracao_id: infRow.id, plano_acao_id: planoRow?.id ?? null,
      canal: "webhook", assunto, mensagem,
      payload_json: { codigo: inf.codigo, gravidade: inf.gravidade, prazo, entidade: ent?.nome },
      status: "pendente",
    });

    inseridas.push({ infracao: infRow, plano: planoRow });
  }

  if (notifs.length) {
    await supabase.from("compliance_notificacoes").insert(notifs);
  }

  return json({
    ok: true,
    detectadas: abertas.length,
    abertas: inseridas.length,
    ja_existentes: abertas.length - paraAbrir.length,
    notificacoes_enfileiradas: notifs.length,
  });
});
