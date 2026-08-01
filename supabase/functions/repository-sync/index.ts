// =============================================================================
// repository-sync
// Enfileira e processa sincronizações de repositórios de dados (documentos,
// imagens, geoespacial). O processamento corre em background (202 imediato),
// o histórico fica em public.repository_sync_jobs.
//
// Limitação conhecida: a Edge Runtime não possui SDKs nativos dos provedores
// (S3/Azure/GCS/Graph). O que é feito aqui:
//   1. valida o mapeamento de pastas e os tipos de ficheiro configurados;
//   2. tenta listar o endpoint do provedor (quando exposto por HTTP e acessível);
//   3. regista contagens, avisos e o estado final no job.
// Sincronizações autenticadas de grande volume devem correr num worker dedicado
// que consome a mesma fila (state = 'queued').
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json } from "../_shared/cors.ts";

type Cfg = Record<string, any>;

function listEndpoint(provider: string, cfg: Cfg, prefix: string): string | null {
  const p = encodeURIComponent(prefix ?? "");
  switch (provider) {
    case "aws_s3":
      return `${cfg.endpoint || `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com`}/?list-type=2&prefix=${p}`;
    case "minio":
    case "oci_object":
      return cfg.endpoint ? `${cfg.endpoint}?list-type=2&prefix=${p}` : null;
    case "azure_blob":
      return cfg.account && cfg.container
        ? `https://${cfg.account}.blob.core.windows.net/${cfg.container}?restype=container&comp=list&prefix=${p}`
        : null;
    case "gcp_gcs":
      return cfg.bucket
        ? `https://storage.googleapis.com/storage/v1/b/${cfg.bucket}/o?prefix=${p}`
        : null;
    case "google_drive":
      return "https://www.googleapis.com/drive/v3/files";
    case "onedrive":
    case "sharepoint":
      return cfg.site_url || "https://graph.microsoft.com/v1.0/me/drive/root/children";
    case "http":
      return cfg.url ?? null;
    default:
      return null;
  }
}

function countMatches(body: string, provider: string, fileTypes: string[]): number {
  const keys = provider === "azure_blob"
    ? [...body.matchAll(/<Name>([^<]+)<\/Name>/g)].map((m) => m[1])
    : provider === "gcp_gcs" || provider === "google_drive"
      ? [...body.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map((m) => m[1])
      : [...body.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
  if (fileTypes.length === 0) return keys.length;
  return keys.filter((k) => fileTypes.some((t) => k.toLowerCase().endsWith(`.${t.toLowerCase().replace(/^\./, "")}`))).length;
}

async function processJob(admin: any, jobId: string) {
  const { data: job } = await admin.from("repository_sync_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job || job.state !== "queued") return;

  await admin.from("repository_sync_jobs")
    .update({ state: "running", started_at: new Date().toISOString() })
    .eq("id", jobId);

  const { data: repo } = await admin.from("data_repositories").select("*").eq("id", job.repository_id).maybeSingle();

  const warnings: string[] = [];
  let filesFound = 0;
  let state: "done" | "error" = "done";
  let message = "";

  if (!repo) {
    state = "error";
    message = "Repositório não encontrado";
  } else if (!repo.active) {
    state = "error";
    message = "Repositório inativo — ative antes de sincronizar.";
  } else {
    const cfg = (repo.config || {}) as Cfg;
    const fileTypes: string[] = job.file_types?.length ? job.file_types : (repo.file_types ?? []);
    const prefix: string = job.source_path ?? "";

    if (job.mode === "upload") {
      message = "Upload manual registado. Ficheiros carregados via painel de administração.";
    } else {
      const url = listEndpoint(repo.provider, cfg, prefix);
      if (!url) {
        warnings.push(`Provedor ${repo.provider} não expõe listagem HTTP direta.`);
        message = "Configuração validada — listagem requer worker autenticado dedicado.";
      } else {
        try {
          const ctl = new AbortController();
          const timer = setTimeout(() => ctl.abort(), 10_000);
          const res = await fetch(url, { signal: ctl.signal });
          clearTimeout(timer);
          if (res.ok) {
            const body = await res.text();
            filesFound = countMatches(body, repo.provider, fileTypes);
            message = `Listagem concluída — ${filesFound} ficheiro(s) correspondente(s) ao mapeamento.`;
          } else if (res.status === 401 || res.status === 403) {
            warnings.push(`Endpoint exige credenciais (HTTP ${res.status}).`);
            message = "Endpoint alcançável mas privado — credenciais devem ser tratadas por worker dedicado.";
          } else {
            state = "error";
            message = `Falha na listagem (HTTP ${res.status}).`;
          }
        } catch (e) {
          state = "error";
          message = `Falha de rede: ${(e as Error).message}`;
        }
      }
      if (fileTypes.length === 0) warnings.push("Nenhum tipo de ficheiro definido — todos os ficheiros serão considerados.");
      if (!prefix) warnings.push("Sem pasta de origem definida — sincroniza a raiz do repositório.");
    }
  }

  await admin.from("repository_sync_jobs").update({
    state,
    files_found: filesFound,
    files_synced: state === "done" ? filesFound : 0,
    message,
    warnings,
    finished_at: new Date().toISOString(),
  }).eq("id", jobId);

  if (repo) {
    await admin.from("data_repositories").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: state === "done" ? (warnings.length ? "warn" : "ok") : "fail",
      doc_count: state === "done" && filesFound > 0 ? filesFound : repo.doc_count,
    }).eq("id", repo.id);
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

    const body = await req.json().catch(() => ({}));
    const { repository_id, mode = "incremental", source_path, file_types } = body as {
      repository_id?: string; mode?: string; source_path?: string; file_types?: string[];
    };
    if (!repository_id) return json({ error: "repository_id required" }, 400);
    if (!["full", "incremental", "upload"].includes(mode)) return json({ error: "mode inválido" }, 400);

    const { data: created, error } = await admin.from("repository_sync_jobs").insert({
      repository_id,
      mode,
      source_path: source_path ?? null,
      file_types: file_types ?? [],
      requested_by: userData.user.id,
    }).select("id").single();
    if (error) return json({ error: error.message }, 400);

    await admin.from("infra_audit_log").insert({
      entity_type: "repository",
      entity_id: repository_id,
      action: "sync",
      motivo: `Sincronização ${mode} solicitada`,
      changed_by: userData.user.id,
      changed_by_email: userData.user.email,
    });

    // @ts-ignore EdgeRuntime existe na Supabase Edge Runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processJob(admin, created.id).catch(async (e) => {
        await admin.from("repository_sync_jobs").update({
          state: "error", message: (e as Error).message, finished_at: new Date().toISOString(),
        }).eq("id", created.id);
      }));
    } else {
      processJob(admin, created.id).catch(() => {});
    }

    return json({ job_id: created.id, state: "queued" }, 202);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
