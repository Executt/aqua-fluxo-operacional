// Emissão e revogação de chaves de API por entidade.
// Ações: create | revoke. Requer role admin ou gestor.
// A chave em texto plano é retornada APENAS uma vez, no create.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, json } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `sfk_live_${b64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "gestor");
    if (!allowed) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "create" | "revoke";

    if (action === "create") {
      const { entidade_id, nome, scopes, expires_at } = body;
      if (!entidade_id || !nome || typeof nome !== "string" || nome.length < 3) {
        return json({ error: "invalid_input" }, 400);
      }
      const key = generateApiKey();
      const key_hash = await sha256Hex(key);
      const key_prefix = key.slice(0, 16);
      const { data, error } = await admin.from("entidade_api_keys").insert({
        entidade_id,
        nome: nome.trim().slice(0, 120),
        key_prefix,
        key_hash,
        scopes: Array.isArray(scopes) && scopes.length ? scopes : ["read"],
        expires_at: expires_at ?? null,
        criada_por: user.id,
      }).select("id, entidade_id, nome, key_prefix, scopes, expires_at, created_at").single();
      if (error) return json({ error: error.message }, 400);
      return json({ ...data, secret: key, warning: "Guarde esta chave — não será exibida novamente." }, 201);
    }

    if (action === "revoke") {
      const { id } = body;
      if (!id) return json({ error: "invalid_input" }, 400);
      const { error } = await admin.from("entidade_api_keys").update({
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      }).eq("id", id).is("revoked_at", null);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
