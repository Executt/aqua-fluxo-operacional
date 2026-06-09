import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * sasb-sync: sincroniza datasets SARSB.
 * - Aceita { dataset_id?: string }. Sem id, sincroniza todos os ativos.
 * - Simula coleta na origem, executa validações de qualidade
 *   (completude, validade, frescor), grava log e atualiza dataset.
 */

interface QualityResult {
  records_in: number;
  records_out: number;
  records_invalid: number;
  completeness_pct: number;
  validity_pct: number;
  freshness_days: number;
  quality_score: number;
  status: "success" | "warning" | "error";
  message: string;
  warnings: { rule: string; severity: "info" | "warn" | "error"; detail: string }[];
}

function runQualityChecks(prevRecords: number, endpoint: string): QualityResult {
  const warnings: QualityResult["warnings"] = [];

  // Simulação determinística baseada no endpoint, com pequena variação aleatória.
  const seed = endpoint.length;
  const jitter = () => Math.random() * 0.06 - 0.03;

  // Endpoint inválido = erro total
  if (!endpoint || endpoint.length < 5) {
    return {
      records_in: 0, records_out: 0, records_invalid: 0,
      completeness_pct: 0, validity_pct: 0, freshness_days: 999,
      quality_score: 0, status: "error",
      message: "Endpoint da fonte inválido ou inacessível.",
      warnings: [{ rule: "endpoint", severity: "error", detail: "Endpoint vazio/curto" }],
    };
  }

  // Volume base proporcional ao endpoint
  const records_in = Math.max(100, Math.round(prevRecords * (1 + jitter())) || (seed * 87));
  const invalid_pct = Math.max(0, 0.02 + (seed % 7) / 200);
  const records_invalid = Math.round(records_in * invalid_pct);
  const records_out = records_in - records_invalid;

  const completeness_pct = +(Math.max(75, Math.min(100, 92 + (seed % 5) - jitter() * 100))).toFixed(2);
  const validity_pct    = +(Math.max(70, Math.min(100, (1 - invalid_pct) * 100))).toFixed(2);
  const freshness_days  = Math.max(0, (seed % 10));

  if (completeness_pct < 85) {
    warnings.push({ rule: "completeness", severity: "warn",
      detail: `Completude abaixo do alvo (≥85%): ${completeness_pct}%` });
  }
  if (validity_pct < 90) {
    warnings.push({ rule: "validity", severity: "warn",
      detail: `Validade abaixo do alvo (≥90%): ${validity_pct}%` });
  }
  if (freshness_days > 7) {
    warnings.push({ rule: "freshness", severity: "warn",
      detail: `Dados com mais de 7 dias (${freshness_days}d).` });
  }
  if (records_invalid / Math.max(1, records_in) > 0.1) {
    warnings.push({ rule: "invalid_rate", severity: "error",
      detail: `Taxa de registros inválidos > 10% (${(invalid_pct * 100).toFixed(1)}%)` });
  }

  // Score ponderado: 40% completude + 40% validade + 20% frescor
  const freshnessScore = Math.max(0, 100 - freshness_days * 8);
  const quality_score = Math.round(
    completeness_pct * 0.4 + validity_pct * 0.4 + freshnessScore * 0.2
  );

  const hasError = warnings.some((w) => w.severity === "error");
  const status: QualityResult["status"] =
    hasError ? "error" : warnings.length > 0 ? "warning" : "success";

  const message =
    status === "success" ? `Sincronização concluída — ${records_out} registros válidos.` :
    status === "warning" ? `Sincronizado com ${warnings.length} aviso(s) de qualidade.` :
                           `Falha de validação: ${warnings.find((w) => w.severity === "error")?.detail}`;

  return {
    records_in, records_out, records_invalid,
    completeness_pct, validity_pct, freshness_days,
    quality_score, status, message, warnings,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const datasetId: string | undefined = body?.dataset_id;
    const triggeredBy: "manual" | "scheduled" | "api" = body?.triggered_by || "manual";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Carrega datasets-alvo
    let q = supabase.from("sasb_datasets").select("*");
    if (datasetId) q = q.eq("id", datasetId);
    else q = q.eq("enabled", true);

    const { data: datasets, error: dsErr } = await q;
    if (dsErr) throw dsErr;
    if (!datasets || datasets.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum dataset alvo." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const ds of datasets) {
      const startedAt = new Date();

      // Marca como sincronizando
      await supabase.from("sasb_datasets").update({ status: "sincronizando" }).eq("id", ds.id);

      // Insere log "running"
      const { data: logRow, error: logErr } = await supabase
        .from("sasb_sync_logs")
        .insert({ dataset_id: ds.id, started_at: startedAt.toISOString(), status: "running", triggered_by: triggeredBy })
        .select("id").single();
      if (logErr) throw logErr;

      // Simula latência de rede (50–250ms)
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 200));

      const qr = runQualityChecks(Number(ds.records) || 0, String(ds.endpoint || ""));
      const finishedAt = new Date();
      const duration_ms = finishedAt.getTime() - startedAt.getTime();

      // Atualiza log
      await supabase.from("sasb_sync_logs").update({
        finished_at: finishedAt.toISOString(),
        duration_ms,
        status: qr.status,
        records_in: qr.records_in,
        records_out: qr.records_out,
        records_invalid: qr.records_invalid,
        completeness_pct: qr.completeness_pct,
        validity_pct: qr.validity_pct,
        freshness_days: qr.freshness_days,
        quality_score: qr.quality_score,
        message: qr.message,
        warnings: qr.warnings,
      }).eq("id", logRow.id);

      // Atualiza dataset
      const newStatus =
        qr.status === "error" ? "erro" :
        qr.freshness_days > 7 ? "desatualizado" : "conectado";

      await supabase.from("sasb_datasets").update({
        status: newStatus,
        records: qr.records_out,
        quality_score: qr.quality_score,
        last_sync_at: finishedAt.toISOString(),
      }).eq("id", ds.id);

      results.push({ dataset_id: ds.id, code: ds.code, ...qr, duration_ms });
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sasb-sync error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
