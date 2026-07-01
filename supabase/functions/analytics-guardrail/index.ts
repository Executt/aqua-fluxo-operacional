// Analytics Guardrail — bloqueia análises de saneamento que ignorem variável de
// confusão de Capacidade Institucional (regra do "Falso Afluente").
//
// Contrato:
//   POST { metric: string, controls: string[], stratify_by?: string,
//          min_group_size?: number, group_sizes?: Record<string, number> }
//
// Regras:
//   1. `controls` DEVE conter "estrato_dmi" e "snis_completude_pct".
//   2. `stratify_by` DEVE ser "estrato_dmi".
//   3. Se `group_sizes` for fornecido, cada estrato precisa ter n >= min_group_size
//      (default vindo de system_settings.dmi_pesos.min_group_size, fallback 30).
//
// Todas as decisões (bloqueadas OU permitidas) são registradas em
// analytics_guardrail_log para auditoria.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  metric: z.string().min(1).max(200),
  controls: z.array(z.string()).default([]),
  stratify_by: z.string().optional(),
  min_group_size: z.number().int().positive().optional(),
  group_sizes: z.record(z.number().int().nonnegative()).optional(),
});

const REQUIRED_CONTROLS = ["estrato_dmi", "snis_completude_pct"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Client "as user" para descobrir quem chamou (para logging)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const admin = createClient(supabaseUrl, serviceKey);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const body = parsed.data;

    // Lê threshold configurável
    const { data: setting } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "dmi_pesos")
      .maybeSingle();
    const configuredMin = Number(setting?.value?.min_group_size ?? 30);
    const minGroupSize = body.min_group_size ?? configuredMin;

    const missing = REQUIRED_CONTROLS.filter((c) => !body.controls.includes(c));
    let outcome: "blocked" | "allowed" = "allowed";
    let reasonCode = "OK";
    let reasonMsg = "Requisição em conformidade com a regra do Falso Afluente.";
    let httpStatus = 200;

    if (missing.length > 0) {
      outcome = "blocked";
      reasonCode = "MISSING_CONFOUNDER_CONTROL";
      reasonMsg = `Controles obrigatórios ausentes: ${missing.join(", ")}. ` +
        `Análises de saneamento no pilar saúde exigem controle de Capacidade Institucional.`;
      httpStatus = 422;
    } else if (body.stratify_by !== "estrato_dmi") {
      outcome = "blocked";
      reasonCode = "MISSING_STRATIFICATION";
      reasonMsg = 'stratify_by deve ser "estrato_dmi".';
      httpStatus = 422;
    } else if (body.group_sizes) {
      const undersized = Object.entries(body.group_sizes).filter(
        ([, n]) => n < minGroupSize,
      );
      if (undersized.length > 0) {
        outcome = "blocked";
        reasonCode = "GROUP_TOO_SMALL";
        reasonMsg = `Estratos com n<${minGroupSize}: ${
          undersized.map(([k, n]) => `${k}=${n}`).join(", ")
        }. Inferência frágil.`;
        httpStatus = 422;
      }
    }

    await admin.from("analytics_guardrail_log").insert({
      user_id: userId,
      metric: body.metric,
      requested_controls: body.controls,
      stratify_by: body.stratify_by ?? null,
      outcome,
      reason_code: reasonCode,
      reason_msg: reasonMsg,
    });

    return new Response(
      JSON.stringify({
        outcome,
        reason_code: reasonCode,
        reason_msg: reasonMsg,
        required_controls: REQUIRED_CONTROLS,
        min_group_size: minGroupSize,
      }),
      { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[analytics-guardrail]", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
