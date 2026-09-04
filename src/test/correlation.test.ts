import { beforeEach, describe, expect, it, vi } from "vitest";
import { correlationHeaders, installCorrelationInterceptor, newCorrelationId } from "@/lib/correlation";

describe("Correlation ID", () => {
  let target: { fetch: any };
  let calls: Array<{ url: any; init: any }>;

  beforeEach(() => {
    calls = [];
    target = {
      fetch: vi.fn(async (url: any, init: any) => {
        calls.push({ url, init });
        return new Response("{}", { status: 200 });
      }),
    };
  });

  it("gera IDs únicos com prefixo", () => {
    const a = newCorrelationId();
    const b = newCorrelationId();
    expect(a).toMatch(/^sig-/);
    expect(a).not.toBe(b);
    expect(correlationHeaders("sig-x")["x-correlation-id"]).toBe("sig-x");
  });

  it("injeta x-correlation-id em todas as chamadas fetch", async () => {
    installCorrelationInterceptor(target as any);
    await target.fetch("https://api.exemplo/rest/v1/entidades");
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("x-correlation-id")).toMatch(/^sig-/);
  });

  it("respeita um correlation ID já definido pelo chamador", async () => {
    installCorrelationInterceptor(target as any);
    await target.fetch("https://api.exemplo/functions/v1/cortex-chat", {
      headers: { "x-correlation-id": "sig-manual" },
    });
    expect(new Headers(calls[0].init.headers).get("x-correlation-id")).toBe("sig-manual");
  });

  it("não aplica o patch duas vezes", async () => {
    installCorrelationInterceptor(target as any);
    const first = target.fetch;
    installCorrelationInterceptor(target as any);
    expect(target.fetch).toBe(first);
  });
});
