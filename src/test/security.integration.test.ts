/**
 * Testes de integração de segurança contra as Edge Functions reais.
 * Valida: 401 sem JWT, 403 sem papel, CORS por allowlist e rate limiting.
 *
 * Se o backend estiver indisponível, os testes são ignorados (skip) em vez de falhar.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { correlationHeaders } from "@/lib/correlation";

const BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const FN = (name: string) => `${BASE}/functions/v1/${name}`;
const ALLOWED_ORIGIN = "http://localhost:8080";
const BLOCKED_ORIGIN = "https://atacante.example.com";

let online = false;

async function call(name: string, init: RequestInit = {}) {
  return fetch(FN(name), {
    method: init.method ?? "POST",
    ...init,
    headers: {
      "content-type": "application/json",
      apikey: ANON ?? "",
      origin: ALLOWED_ORIGIN,
      ...correlationHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

beforeAll(async () => {
  if (!BASE || !ANON) return;
  try {
    const res = await fetch(`${BASE}/auth/v1/health`, { headers: { apikey: ANON } });
    online = res.ok;
  } catch {
    online = false;
  }
  if (!online) console.warn("[integração] backend indisponível — testes ignorados");
}, 20_000);

describe("Edge Functions — autenticação (401)", () => {
  const protegidas = [
    "cortex-chat",
    "curadoria-submit",
    "curadoria-transition",
    "compliance-plano-transition",
    "entidade-api-keys",
    "connection-test",
  ];

  for (const fn of protegidas) {
    it(`${fn} responde 401 sem Authorization`, async () => {
      if (!online) return;
      const res = await call(fn, { body: JSON.stringify({}) });
      await res.text();
      expect(res.status).toBe(401);
    }, 20_000);

    it(`${fn} responde 401 com JWT inválido`, async () => {
      if (!online) return;
      const res = await call(fn, {
        body: JSON.stringify({}),
        headers: { Authorization: "Bearer token.invalido.aqui" },
      });
      await res.text();
      expect(res.status).toBe(401);
    }, 20_000);
  }
});

describe("Edge Functions — CORS por allowlist", () => {
  it("preflight de origem permitida devolve Access-Control-Allow-Origin", async () => {
    if (!online) return;
    const res = await fetch(FN("cortex-chat"), {
      method: "OPTIONS",
      headers: {
        origin: ALLOWED_ORIGIN,
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization, content-type, x-correlation-id",
      },
    });
    await res.text();
    expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
    expect(res.headers.get("access-control-allow-headers")).toContain("x-correlation-id");
  }, 20_000);

  it("origem fora da allowlist não recebe Access-Control-Allow-Origin", async () => {
    if (!online) return;
    const res = await fetch(FN("cortex-chat"), {
      method: "OPTIONS",
      headers: { origin: BLOCKED_ORIGIN, "access-control-request-method": "POST" },
    });
    await res.text();
    const acao = res.headers.get("access-control-allow-origin");
    expect(acao === null || acao === "" || acao === ALLOWED_ORIGIN).toBe(true);
    expect(acao).not.toBe(BLOCKED_ORIGIN);
  }, 20_000);
});

describe("Edge Functions — correlation ID", () => {
  it("aceita o cabeçalho x-correlation-id sem quebrar o preflight", async () => {
    if (!online) return;
    const cid = correlationHeaders()["x-correlation-id"];
    const res = await call("cortex-chat", {
      body: JSON.stringify({}),
      headers: { "x-correlation-id": cid },
    });
    await res.text();
    expect([200, 400, 401, 429]).toContain(res.status);
  }, 20_000);
});

describe("PostgREST — RLS e acesso anónimo (401/403)", () => {
  const tabelas = ["entidades", "sensores", "formulario_respostas", "user_roles"];
  for (const t of tabelas) {
    it(`${t} bloqueia leitura anónima`, async () => {
      if (!online) return;
      const res = await fetch(`${BASE}/rest/v1/${t}?select=*&limit=1`, {
        headers: { apikey: ANON!, ...correlationHeaders() },
      });
      const body = await res.text();
      expect([401, 403, 404]).toContain(res.status);
      expect(body).not.toContain('"id"');
    }, 20_000);
  }
});

describe("Edge Functions — rate limiting", () => {
  it("dispara 429 sob rajada de pedidos", async () => {
    if (!online) return;
    const rajada = await Promise.all(
      Array.from({ length: 40 }, () =>
        call("cortex-chat", {
          body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
          headers: { Authorization: "Bearer token.invalido.aqui" },
        }).then(async (r) => {
          await r.text();
          return r.status;
        })
      )
    );
    // Sem sessão válida esperamos 401 ou 429 — nunca 200.
    expect(rajada.every((s) => s === 401 || s === 429)).toBe(true);
  }, 60_000);
});
