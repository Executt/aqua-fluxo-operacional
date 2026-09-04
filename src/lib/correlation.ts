/**
 * Correlation ID — identificador único propagado em TODAS as chamadas HTTP
 * (PostgREST, Edge Functions e APIs externas) através do cabeçalho
 * `x-correlation-id`. Permite correlacionar frontend ↔ logs ↔ trilha de auditoria.
 */

const HEADER = "x-correlation-id";

/** ID da sessão de navegação (estável enquanto a aba estiver aberta). */
let sessionCorrelationId: string | null = null;

export function newCorrelationId(): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2) + Date.now().toString(16);
  return `sig-${rnd}`;
}

export function getSessionCorrelationId(): string {
  if (!sessionCorrelationId) sessionCorrelationId = newCorrelationId();
  return sessionCorrelationId;
}

/** Cabeçalhos a juntar manualmente (ex.: supabase.functions.invoke). */
export function correlationHeaders(id?: string): Record<string, string> {
  return { [HEADER]: id ?? newCorrelationId() };
}

/**
 * Intercepta `fetch` global para garantir que nenhuma chamada sai sem correlation ID.
 * Idempotente: chamadas que já definem o cabeçalho são respeitadas.
 */
export function installCorrelationInterceptor(target: { fetch: typeof fetch } = globalThis as any) {
  const original = target.fetch;
  if (!original || (original as any).__correlationPatched) return;

  const patched: typeof fetch = (input, init) => {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    if (!headers.has(HEADER)) {
      headers.set(HEADER, `${getSessionCorrelationId()}/${newCorrelationId().slice(4, 12)}`);
    }
    return original(input, { ...(init ?? {}), headers });
  };
  (patched as any).__correlationPatched = true;
  target.fetch = patched;
}
