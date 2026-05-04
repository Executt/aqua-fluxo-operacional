// Painel: estado do job pg_cron `refresh_metabase_views_15min`.
// Lê via RPC SECURITY DEFINER `public.get_metabase_refresh_status`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin.rpc("get_metabase_refresh_status");
    if (error) throw error;
    return json(data ?? {});
  } catch (e) {
    return json(
      {
        scheduled: false,
        is_overdue: true,
        is_failing: false,
        message: `Erro ao consultar pg_cron: ${String(e)}`,
      },
      200,
    );
  }
});
