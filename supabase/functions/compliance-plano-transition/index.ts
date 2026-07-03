// =============================================================================
// compliance-plano-transition
// Workflow do plano de ação: rascunho → submetido → em_analise
//                                → aprovado | rejeitado → (rascunho | concluido)
// Regras de RBAC:
//   rascunho → submetido       : qualquer autenticado (operador dono OU staff)
//   submetido → em_analise     : staff
//   em_analise → aprovado      : staff
//   em_analise → rejeitado     : staff (motivo obrigatório)
//   rejeitado → rascunho       : operador dono OU staff
//   aprovado → concluido       : staff
// Sempre que muda para estado terminal, dispara notificação in-app.
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json } from "../_shared/cors.ts";

const TRANSICOES: Record<string, string[]> = {
  rascunho: ["submetido"],
  submetido: ["em_analise"],
  em_analise: ["aprovado", "rejeitado"],
  rejeitado: ["rascunho"],
  aprovado: ["concluido"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => null);
  if (!body?.plano_id || !body?.novo_estado) return json({ error: "plano_id e novo_estado obrigatórios" }, 400);
  if (body.novo_estado === "rejeitado" && !body.motivo_rejeicao) {
    return json({ error: "motivo_rejeicao obrigatório" }, 400);
  }

  const { data: plano } = await admin.from("planos_acao").select("*").eq("id", body.plano_id).maybeSingle();
  if (!plano) return json({ error: "Plano não encontrado" }, 404);

  const allowed = TRANSICOES[plano.estado] ?? [];
  if (!allowed.includes(body.novo_estado)) {
    return json({ error: `Transição inválida: ${plano.estado} → ${body.novo_estado}` }, 409);
  }

  const { data: staff } = await admin.rpc("is_staff", { _user_id: userData.user.id });
  const trans = `${plano.estado}->${body.novo_estado}`;
  const staffOnly = ["submetido->em_analise", "em_analise->aprovado", "em_analise->rejeitado", "aprovado->concluido"];
  if (staffOnly.includes(trans) && !staff) {
    return json({ error: "Requer staff (admin/gestor/auditor)" }, 403);
  }

  const update: Record<string, unknown> = { estado: body.novo_estado };
  if (body.novo_estado === "submetido") { update.submetido_por = userData.user.id; update.submetido_em = new Date().toISOString(); }
  if (["aprovado", "rejeitado"].includes(body.novo_estado)) { update.revisado_por = userData.user.id; update.revisado_em = new Date().toISOString(); }
  if (body.novo_estado === "rejeitado") update.motivo_rejeicao = body.motivo_rejeicao;
  if (body.novo_estado === "concluido") update.concluido_em = new Date().toISOString();

  const { data: updated, error: upErr } = await admin.from("planos_acao")
    .update(update).eq("id", body.plano_id).select().single();
  if (upErr) return json({ error: upErr.message }, 400);

  // Se concluído, resolve infração vinculada
  if (body.novo_estado === "concluido" && plano.infracao_id) {
    await admin.from("infracoes").update({ status: "resolvida" }).eq("id", plano.infracao_id);
  }

  // Notificação in-app para staff (fan-out simples)
  const { data: staffProfiles } = await admin
    .from("user_roles").select("user_id").in("role", ["admin", "gestor", "auditor"]);
  const notifs = (staffProfiles ?? []).map((s) => ({
    entidade_id: plano.entidade_id, plano_acao_id: plano.id, infracao_id: plano.infracao_id,
    destinatario_user_id: s.user_id, canal: "in_app",
    assunto: `Plano de ação → ${body.novo_estado}`,
    mensagem: `Plano "${plano.titulo}" transitou para ${body.novo_estado}${body.motivo_rejeicao ? `: ${body.motivo_rejeicao}` : ""}.`,
    payload_json: { plano_id: plano.id, novo_estado: body.novo_estado },
    status: "pendente",
  }));
  if (notifs.length) await admin.from("compliance_notificacoes").insert(notifs);

  return json({ ok: true, plano: updated });
});
