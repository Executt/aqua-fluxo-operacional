// Retorna estado do job pg_cron `refresh_metabase_views_15min`
// e idade da matview mais recentemente atualizada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Job
    const { data: jobRows, error: jobErr } = await admin
      .from("cron.job")
      .select("jobid, jobname, schedule, active")
      .eq("jobname", "refresh_metabase_views_15min")
      .maybeSingle();

    // Fallback via RPC se schema cron não exposto via PostgREST
    let job = jobRows as
      | { jobid: number; jobname: string; schedule: string; active: boolean }
      | null;
    let runs:
      | Array<{
          status: string;
          return_message: string | null;
          start_time: string;
          end_time: string | null;
        }>
      | null = null;

    if (jobErr || !job) {
      // Usa SQL direto via pg_meta-ish: chamamos uma RPC genérica se existir,
      // caso contrário marcamos como indisponível.
      return json({
        scheduled: false,
        message:
          "Schema 'cron' não exposto. Use a query SQL na seção 7 do docs/README.md ou crie uma SECURITY DEFINER function.",
        job: null,
        last_runs: [],
        last_success_at: null,
        seconds_since_last_success: null,
        is_overdue: true,
        is_failing: false,
      });
    }

    const { data: runRows } = await admin
      .from("cron.job_run_details")
      .select("status, return_message, start_time, end_time")
      .eq("jobid", job.jobid)
      .order("start_time", { ascending: false })
      .limit(10);

    runs = runRows ?? [];

    const lastSuccess = runs.find((r) => r.status === "succeeded");
    const lastRun = runs[0] ?? null;
    const secsSince = lastSuccess
      ? Math.floor((Date.now() - new Date(lastSuccess.start_time).getTime()) / 1000)
      : null;

    return json({
      scheduled: job.active,
      job,
      last_runs: runs,
      last_run: lastRun,
      last_success_at: lastSuccess?.start_time ?? null,
      seconds_since_last_success: secsSince,
      is_overdue: secsSince !== null ? secsSince > 20 * 60 : true,
      is_failing: lastRun?.status === "failed",
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
