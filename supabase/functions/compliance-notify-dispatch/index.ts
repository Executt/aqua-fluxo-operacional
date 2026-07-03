// =============================================================================
// compliance-notify-dispatch
// Lê notificações em `compliance_notificacoes` com status='pendente' e
// canal in {email, webhook} e as envia:
//  - email  → Resend (requer secret RESEND_API_KEY; sem ela marca falhou)
//  - webhook → POST assinado HMAC-SHA256 com o secret configurado em
//              system_settings.compliance_webhook_endpoints[i].secret_name
// in_app não requer despacho — a inserção já é visível ao destinatário.
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json } from "../_shared/cors.ts";

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization" }, 401);

  const supabase = createClient(
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
  const { data: staff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
  if (!staff) return json({ error: "Staff only" }, 403);

  const [{ data: pending }, { data: fromCfg }, { data: hookCfg }] = await Promise.all([
    supabase.from("compliance_notificacoes")
      .select("*").in("canal", ["email", "webhook"]).eq("status", "pendente").limit(50),
    supabase.from("system_settings").select("value").eq("key", "compliance_email_from").maybeSingle(),
    supabase.from("system_settings").select("value").eq("key", "compliance_webhook_endpoints").maybeSingle(),
  ]);

  const from = (fromCfg?.value ?? { email: "compliance@ana.gov.br", nome: "ANA" }) as any;
  const endpoints = (hookCfg?.value ?? []) as any[];
  const resendKey = Deno.env.get("RESEND_API_KEY");

  const results: any[] = [];

  for (const n of pending ?? []) {
    let ok = false;
    let erro: string | null = null;

    try {
      if (n.canal === "email") {
        if (!resendKey) { erro = "RESEND_API_KEY não configurada"; }
        else {
          // Se destinatario_email nulo, resolve pelo email_contato da entidade
          let to = n.destinatario_email as string | null;
          if (!to && n.entidade_id) {
            const { data: ent } = await supabase
              .from("entidades").select("email_contato").eq("id", n.entidade_id).maybeSingle();
            to = (ent as any)?.email_contato ?? null;
          }
          if (!to) { erro = "Sem destinatário de e-mail"; }
          else {
            const resp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
              body: JSON.stringify({
                from: `${from.nome} <${from.email}>`,
                to: [to], subject: n.assunto,
                text: n.mensagem,
              }),
            });
            if (resp.ok) ok = true;
            else erro = `Resend ${resp.status}: ${await resp.text()}`;
          }
        }
      } else if (n.canal === "webhook") {
        const eps = endpoints.filter((e) => !e.entidade_id || e.entidade_id === n.entidade_id);
        if (!eps.length) { erro = "Nenhum endpoint configurado para esta entidade"; }
        else {
          for (const ep of eps) {
            const secret = ep.secret_name ? Deno.env.get(ep.secret_name) ?? "" : "";
            const body = JSON.stringify({
              tipo: "compliance.infracao_automatica",
              notificacao_id: n.id, entidade_id: n.entidade_id,
              infracao_id: n.infracao_id, plano_acao_id: n.plano_acao_id,
              assunto: n.assunto, mensagem: n.mensagem, payload: n.payload_json,
              enviado_em: new Date().toISOString(),
            });
            const sig = secret ? await hmacSha256Hex(secret, body) : "";
            const resp = await fetch(ep.url, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Compliance-Signature": `sha256=${sig}` },
              body,
            });
            if (!resp.ok) { erro = `Webhook ${ep.url} → ${resp.status}`; break; }
          }
          if (!erro) ok = true;
        }
      }
    } catch (e) {
      erro = String((e as Error).message);
    }

    await supabase.from("compliance_notificacoes").update({
      status: ok ? "enviada" : "falhou",
      enviado_em: ok ? new Date().toISOString() : null,
      tentativas: (n.tentativas ?? 0) + 1,
      erro,
    }).eq("id", n.id);

    results.push({ id: n.id, canal: n.canal, ok, erro });
  }

  return json({ ok: true, despachadas: results.length, results });
});
