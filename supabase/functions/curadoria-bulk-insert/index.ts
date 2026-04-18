// =============================================================================
// curadoria-bulk-insert
// Importação em lote de respostas (até 1000 por chamada).
// Cenário: concessionária integra seu sistema interno (ex: SCADA → SIGSAN).
// Retorna { inserted, errors[] } parcial (continua mesmo com falhas pontuais).
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json } from "../_shared/cors.ts";
import { FormularioBulkInsert } from "../_shared/curadoria-dtos.ts";

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
  const parsed = FormularioBulkInsert.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  const { data: profile } = await supabase
    .from("profiles")
    .select("operador_id")
    .eq("user_id", userResp.user.id)
    .maybeSingle();

  if (!profile?.operador_id || profile.operador_id !== parsed.data.operador_id) {
    return json({ error: "Operador inválido para o usuário" }, 403);
  }

  // Valida que todas as ETEs pertencem ao operador
  const eteIds = [...new Set(parsed.data.respostas.map((r) => r.ete_id))];
  const { data: etes } = await supabase
    .from("etes_curadoria")
    .select("id, operador_id")
    .in("id", eteIds);

  const eteMap = new Map((etes ?? []).map((e) => [e.id, e.operador_id]));
  const errors: { idx: number; ete_id: string; error: string }[] = [];
  const valid: typeof parsed.data.respostas = [];

  parsed.data.respostas.forEach((r, idx) => {
    const opId = eteMap.get(r.ete_id);
    if (!opId) {
      errors.push({ idx, ete_id: r.ete_id, error: "ETE não encontrada" });
    } else if (opId !== profile.operador_id) {
      errors.push({ idx, ete_id: r.ete_id, error: "ETE pertence a outro operador" });
    } else {
      valid.push(r);
    }
  });

  if (valid.length === 0) {
    return json({ inserted: 0, errors }, 400);
  }

  const rows = valid.map((r) => ({
    ete_id: r.ete_id,
    operador_id: profile.operador_id!,
    user_submitter: userResp.user!.id,
    ano_referencia: r.ano_referencia,
    mes_referencia: r.mes_referencia,
    payload: r.payload,
    estado: r.estado,
  }));

  const { data, error } = await supabase
    .from("formulario_respostas")
    .upsert(rows, { onConflict: "ete_id,ano_referencia,mes_referencia" })
    .select("id");

  if (error) return json({ error: error.message, errors }, 400);

  return json({
    inserted: data?.length ?? 0,
    errors,
  }, 201);
});
