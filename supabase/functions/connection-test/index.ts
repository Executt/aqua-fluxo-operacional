// Teste unificado de conexão para data_repositories e database_connections.
// Faz validação de schema + reachability HTTP/HTTPS quando aplicável.
// Para engines de banco, faz apenas TCP-reachability best-effort via fetch em endpoints HTTP conhecidos
// (BigQuery, Snowflake, MongoDB Atlas Data API, etc.) ou retorna 'warn' explicando que o driver
// nativo não está disponível na Edge Runtime — a conexão real deve ser testada por um worker dedicado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TestStatus = "ok" | "warn" | "fail";
interface Result { status: TestStatus; message: string; latency_ms?: number; details?: unknown }

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function pingHttp(url: string, method: "GET" | "HEAD" = "HEAD"): Promise<Result> {
  const start = Date.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { method, signal: ctl.signal, redirect: "manual" });
    clearTimeout(timer);
    const latency = Date.now() - start;
    // Consideramos 2xx/3xx/401/403 como "endpoint alcançável"
    if (res.status < 500) {
      return { status: "ok", message: `Endpoint alcançável (HTTP ${res.status})`, latency_ms: latency };
    }
    return { status: "warn", message: `Endpoint respondeu HTTP ${res.status}`, latency_ms: latency };
  } catch (e) {
    return { status: "fail", message: `Falha de rede: ${(e as Error).message}` };
  }
}

function required(cfg: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    if (cfg[k] === undefined || cfg[k] === null || cfg[k] === "") return k;
  }
  return null;
}

async function testRepository(provider: string, cfg: Record<string, any>): Promise<Result> {
  switch (provider) {
    case "aws_s3": {
      const missing = required(cfg, ["bucket", "region"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      const url = cfg.endpoint || `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/`;
      return pingHttp(url);
    }
    case "minio":
    case "oci_object": {
      const missing = required(cfg, ["endpoint", "bucket"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      return pingHttp(cfg.endpoint);
    }
    case "azure_blob": {
      const missing = required(cfg, ["account", "container"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      return pingHttp(`https://${cfg.account}.blob.core.windows.net/${cfg.container}?restype=container&comp=list`);
    }
    case "gcp_gcs": {
      const missing = required(cfg, ["bucket"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      return pingHttp(`https://storage.googleapis.com/storage/v1/b/${cfg.bucket}`);
    }
    case "google_drive":
      return pingHttp("https://www.googleapis.com/drive/v3/about");
    case "onedrive":
    case "sharepoint": {
      const url = cfg.site_url || cfg.endpoint || "https://graph.microsoft.com/v1.0/";
      return pingHttp(url);
    }
    case "dropbox":
      return pingHttp("https://api.dropboxapi.com/2/users/get_current_account", "GET");
    case "box":
      return pingHttp("https://api.box.com/2.0/users/me", "GET");
    case "http": {
      const missing = required(cfg, ["url"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      return pingHttp(cfg.url);
    }
    case "ftp":
    case "sftp": {
      const missing = required(cfg, ["host"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      return { status: "warn", message: `Driver ${provider.toUpperCase()} não disponível na Edge Runtime. Configuração validada — teste real deve ser executado por worker dedicado.` };
    }
    case "filesystem": {
      const missing = required(cfg, ["path"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      return { status: "warn", message: `Repositório local do servidor — validação real requer acesso ao filesystem do backend.` };
    }
    default:
      return { status: "warn", message: "Provider não possui teste automático — configuração salva." };
  }
}

async function testDatabase(engine: string, cfg: Record<string, any>): Promise<Result> {
  switch (engine) {
    case "bigquery": {
      const missing = required(cfg, ["project_id"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      return pingHttp(`https://bigquery.googleapis.com/bigquery/v2/projects/${cfg.project_id}/datasets`);
    }
    case "snowflake": {
      const missing = required(cfg, ["account"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      return pingHttp(`https://${cfg.account}.snowflakecomputing.com/session/heartbeat`);
    }
    case "postgres":
    case "mysql":
    case "mssql":
    case "mariadb":
    case "mongodb":
    case "oracle":
    case "oci_autonomous":
    case "redshift":
    case "clickhouse":
    case "dynamodb":
    case "cosmosdb":
    case "sqlite":
    case "duckdb": {
      const missing = engine === "sqlite" || engine === "duckdb"
        ? required(cfg, ["path"])
        : required(cfg, ["host"]);
      if (missing) return { status: "fail", message: `Campo obrigatório: ${missing}` };
      return {
        status: "warn",
        message: `Driver ${engine.toUpperCase()} não disponível na Edge Runtime. Configuração validada — teste real via worker/agent dedicado.`,
      };
    }
    default:
      return { status: "warn", message: "Engine não possui teste automático — configuração salva." };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const allowed = (roles || []).some((r: any) => ["admin", "gestor"].includes(r.role));
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { target, id } = body as { target: "repository" | "database"; id: string };
    if (!id || !target) return json({ error: "target and id required" }, 400);

    const table = target === "repository" ? "data_repositories" : "database_connections";
    const { data: row, error: rErr } = await admin.from(table).select("*").eq("id", id).maybeSingle();
    if (rErr || !row) return json({ error: "Registro não encontrado" }, 404);

    const result: Result = target === "repository"
      ? await testRepository((row as any).provider, (row as any).config || {})
      : await testDatabase((row as any).engine, (row as any).config || {});

    await admin.from(table).update({
      last_test_at: new Date().toISOString(),
      last_test_status: result.status,
      last_test_message: result.message,
    }).eq("id", id);

    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
