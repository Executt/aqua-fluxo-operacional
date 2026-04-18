// =============================================================================
// curadoria-transition
// Aplica transição de estado da resposta (state machine).
// - rascunho → submetido: operador dono da resposta.
// - submetido → em_analise: auditor / gestor / admin.
// - em_analise → validado | rejeitado: auditor / gestor / admin.
// - rejeitado → rascunho: operador dono da resposta (re-edição).
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json } from "../_shared/cors.ts";
import { TransicaoEstado, TRANSICOES_VALIDAS } from "../_shared/curadoria-dtos.ts";

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

  const body = await req.json().catch(() => null);
  const parsed = TransicaoEstado.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  // Carrega resposta + perfil + roles
  const [{ data: resposta }, { data: profile }, { data: roles }] = await Promise.all([
    supabase.from("formulario_respostas").select("*").eq("id", parsed.data.resposta_id).maybeSingle(),
    supabase.from("profiles").select("operador_id").eq("user_id", userResp.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userResp.user.id),
  ]);

  if (!resposta) return json({ error: "Resposta não encontrada" }, 404);

  const userRoles = (roles ?? []).map((r) => r.role);
  const isStaff = userRoles.some((r) => ["admin", "gestor", "auditor"].includes(r));
  const isOwner = profile?.operador_id === resposta.operador_id;

  // Verifica transição válida
  const allowed = TRANSICOES_VALIDAS[resposta.estado] ?? [];
  if (!allowed.includes(parsed.data.novo_estado)) {
    return json({
      error: `Transição inválida: ${resposta.estado} → ${parsed.data.novo_estado}`,
    }, 409);
  }

  // RBAC por transição
  const trans = `${resposta.estado}->${parsed.data.novo_estado}`;
  const allowedRBAC: Record<string, () => boolean> = {
    "rascunho->submetido":   () => isOwner,
    "submetido->em_analise": () => isStaff,
    "em_analise->validado":  () => isStaff,
    "em_analise->rejeitado": () => isStaff,
    "rejeitado->rascunho":   () => isOwner,
  };
  if (!allowedRBAC[trans]?.()) {
    return json({ error: "Sem permissão para esta transição" }, 403);
  }

  const update: Record<string, unknown> = {
    estado: parsed.data.novo_estado,
  };
  if (["em_analise", "validado", "rejeitado"].includes(parsed.data.novo_estado)) {
    update.user_revisor = userResp.user.id;
  }
  if (parsed.data.novo_estado === "rejeitado") {
    update.motivo_rejeicao = parsed.data.motivo_rejeicao;
  }

  const { data, error } = await supabase
    .from("formulario_respostas")
    .update(update)
    .eq("id", parsed.data.resposta_id)
    .select()
    .single();

  if (error) return json({ error: error.message }, 400);
  return json({ resposta: data });
});
