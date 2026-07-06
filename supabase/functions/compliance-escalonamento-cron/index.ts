// =============================================================================
// compliance-escalonamento-cron
// Executado periodicamente (pg_cron). Detecta:
//   1. Infrações com prazo_tratativa vencido e status='aberta' → escalona
//      gravidade (leve→media→grave→gravissima) e enfileira notificação.
//   2. Planos de ação com prazo_final vencido e estado ∈ (rascunho, submetido,
//      em_execucao) → cria escalonamento nível 2 + notificação.
//   3. Escalonamentos nível ≥ 3 → sugere sanção automática (multa/TAC).
//
// Idempotência: usa `compliance_escalonamentos` para não duplicar (uma escalada
// por infração/plano por 24h).
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json } from "../_shared/cors.ts";

const GRAVIDADE_ORDEM = ["leve", "media", "grave", "gravissima"] as const;
const SANCAO_POR_NIVEL: Record<number, string> = {
  1: "Notificação formal",
  2: "Advertência com prazo adicional (15 dias)",
  3: "Multa pecuniária conforme tabela SARSB",
  4: "TAC / Suspensão de repasses federais",
};

function proximaGravidade(g: string | null): string {
  const idx = GRAVIDADE_ORDEM.indexOf((g ?? "leve") as any);
  return GRAVIDADE_ORDEM[Math.min(idx + 1, GRAVIDADE_ORDEM.length - 1)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Autoriza: cron (header secret) OU staff autenticado
  const cronSecret = Deno.env.get("COMPLIANCE_CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  const isCronCall = cronSecret && providedSecret === cronSecret;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (!isCronCall) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json({ error: "Unauthorized" }, 401);
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
    if (!staff) return json({ error: "Staff only" }, 403);
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const cutoff24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const escalonamentos: any[] = [];
  const notifs: any[] = [];
  const infracoesAtualizadas: string[] = [];
  const planosAtualizados: string[] = [];

  // === 1. Infrações vencidas ===
  const { data: infracoesVencidas } = await supabase
    .from("infracoes")
    .select("id, codigo, gravidade, prazo_tratativa, entidade_id, regra_id, entidades(nome)")
    .eq("status", "aberta")
    .not("prazo_tratativa", "is", null)
    .lt("prazo_tratativa", hoje);

  for (const inf of infracoesVencidas ?? []) {
    // dedupe
    const { data: ja } = await supabase
      .from("compliance_escalonamentos")
      .select("id, nivel")
      .eq("infracao_id", inf.id)
      .gte("created_at", cutoff24h)
      .maybeSingle();
    if (ja) continue;

    const { data: ultimo } = await supabase
      .from("compliance_escalonamentos")
      .select("nivel")
      .eq("infracao_id", inf.id)
      .order("nivel", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nivel = (ultimo?.nivel ?? 0) + 1;
    const novaGrav = proximaGravidade(inf.gravidade);
    const sancao = SANCAO_POR_NIVEL[Math.min(nivel, 4)];

    escalonamentos.push({
      infracao_id: inf.id, regra_id: inf.regra_id,
      nivel, de_gravidade: inf.gravidade, para_gravidade: novaGrav,
      motivo: `Prazo de tratativa vencido em ${inf.prazo_tratativa}. Escalonamento automático nível ${nivel}.`,
      sancao_sugerida: sancao,
    });

    // Atualiza gravidade da infração
    await supabase.from("infracoes").update({ gravidade: novaGrav }).eq("id", inf.id);
    infracoesAtualizadas.push(inf.id);

    const assunto = `[COMPLIANCE] Escalonamento nível ${nivel} — ${inf.codigo}`;
    const mensagem =
      `Infração ${inf.codigo} (${(inf as any).entidades?.nome ?? "entidade"}) teve o prazo vencido em ${inf.prazo_tratativa}.\n` +
      `Gravidade elevada: ${inf.gravidade} → ${novaGrav}.\n` +
      `Sanção sugerida: ${sancao}.`;

    // fan-out staff in_app
    const { data: staffRoles } = await supabase
      .from("user_roles").select("user_id").in("role", ["admin", "gestor", "auditor"]);
    for (const s of staffRoles ?? []) {
      notifs.push({
        entidade_id: inf.entidade_id, infracao_id: inf.id,
        destinatario_user_id: s.user_id, canal: "in_app",
        assunto, mensagem, status: "pendente",
        payload_json: { tipo: "escalonamento", nivel, sancao_sugerida: sancao },
      });
    }
    notifs.push({
      entidade_id: inf.entidade_id, infracao_id: inf.id,
      canal: "email", assunto, mensagem, status: "pendente",
      payload_json: { tipo: "escalonamento", nivel },
    });
    notifs.push({
      entidade_id: inf.entidade_id, infracao_id: inf.id,
      canal: "webhook", assunto, mensagem, status: "pendente",
      payload_json: { tipo: "escalonamento", nivel, sancao_sugerida: sancao, codigo: inf.codigo },
    });
  }

  // === 2. Planos de ação vencidos ===
  const { data: planosVencidos } = await supabase
    .from("planos_acao")
    .select("id, titulo, prazo_final, estado, entidade_id, infracao_id, entidades(nome)")
    .in("estado", ["rascunho", "submetido", "em_execucao"])
    .not("prazo_final", "is", null)
    .lt("prazo_final", hoje);

  for (const p of planosVencidos ?? []) {
    const { data: ja } = await supabase
      .from("compliance_escalonamentos")
      .select("id")
      .eq("plano_acao_id", p.id)
      .gte("created_at", cutoff24h)
      .maybeSingle();
    if (ja) continue;

    const { data: ultimo } = await supabase
      .from("compliance_escalonamentos")
      .select("nivel")
      .eq("plano_acao_id", p.id)
      .order("nivel", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nivel = (ultimo?.nivel ?? 1) + 1;
    const sancao = SANCAO_POR_NIVEL[Math.min(nivel, 4)];

    escalonamentos.push({
      plano_acao_id: p.id, infracao_id: p.infracao_id,
      nivel, motivo: `Plano de ação com prazo vencido (${p.prazo_final}). Estado atual: ${p.estado}.`,
      sancao_sugerida: sancao,
    });
    planosAtualizados.push(p.id);

    const assunto = `[COMPLIANCE] Plano de ação vencido — ${p.titulo}`;
    const mensagem =
      `Plano "${p.titulo}" (${(p as any).entidades?.nome ?? "entidade"}) venceu em ${p.prazo_final}.\n` +
      `Nível de escalonamento: ${nivel}. Sanção sugerida: ${sancao}.`;

    const { data: staffRoles } = await supabase
      .from("user_roles").select("user_id").in("role", ["admin", "gestor"]);
    for (const s of staffRoles ?? []) {
      notifs.push({
        entidade_id: p.entidade_id, plano_acao_id: p.id, infracao_id: p.infracao_id,
        destinatario_user_id: s.user_id, canal: "in_app",
        assunto, mensagem, status: "pendente",
        payload_json: { tipo: "plano_vencido", nivel, sancao_sugerida: sancao },
      });
    }
    notifs.push({
      entidade_id: p.entidade_id, plano_acao_id: p.id, infracao_id: p.infracao_id,
      canal: "webhook", assunto, mensagem, status: "pendente",
      payload_json: { tipo: "plano_vencido", nivel, sancao_sugerida: sancao },
    });
  }

  if (escalonamentos.length) {
    await supabase.from("compliance_escalonamentos").insert(escalonamentos);
  }
  if (notifs.length) {
    await supabase.from("compliance_notificacoes").insert(notifs);
  }

  return json({
    ok: true,
    infracoes_vencidas: infracoesVencidas?.length ?? 0,
    planos_vencidos: planosVencidos?.length ?? 0,
    escalonamentos_criados: escalonamentos.length,
    notificacoes_enfileiradas: notifs.length,
    origem: isCronCall ? "cron" : "manual",
  });
});
