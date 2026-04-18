// =============================================================================
// curadoria-submit
// Cria ou atualiza uma resposta de formulário (RASCUNHO ou SUBMETIDO).
// RBAC: o operador autenticado só pode submeter para ETEs do seu operador.
// A RLS no banco já bloqueia, mas validamos cedo para retornar 403 limpo.
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json } from "../_shared/cors.ts";
import { FormularioRespostaSubmit } from "../_shared/curadoria-dtos.ts";

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
  const parsed = FormularioRespostaSubmit.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  // Carrega operador_id do perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("operador_id")
    .eq("user_id", userResp.user.id)
    .maybeSingle();

  if (!profile?.operador_id) {
    return json({ error: "Usuário não vinculado a operador" }, 403);
  }

  // Valida que ETE pertence ao operador
  const { data: ete, error: eteErr } = await supabase
    .from("etes_curadoria")
    .select("id, operador_id")
    .eq("id", parsed.data.ete_id)
    .maybeSingle();

  if (eteErr || !ete) return json({ error: "ETE não encontrada" }, 404);
  if (ete.operador_id !== profile.operador_id) {
    return json({ error: "ETE pertence a outro operador" }, 403);
  }

  // Upsert na chave (ete_id, ano, mes)
  const { data, error } = await supabase
    .from("formulario_respostas")
    .upsert(
      {
        ete_id: parsed.data.ete_id,
        operador_id: profile.operador_id,
        user_submitter: userResp.user.id,
        ano_referencia: parsed.data.ano_referencia,
        mes_referencia: parsed.data.mes_referencia,
        payload: parsed.data.payload,
        estado: parsed.data.estado,
      },
      { onConflict: "ete_id,ano_referencia,mes_referencia" },
    )
    .select()
    .single();

  if (error) return json({ error: error.message }, 400);
  return json({ resposta: data }, 201);
});
