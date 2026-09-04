import { describe, expect, it } from "vitest";
import { can, canAccessRoute, hasRole, type AppRole } from "@/lib/rbac";

describe("RBAC — permissões por rota", () => {
  it("nega tudo a utilizador sem sessão/papéis", () => {
    expect(canAccessRoute(undefined, "/")).toBe(false);
    expect(canAccessRoute([], "/compliance")).toBe(false);
  });

  it("restringe /admin ao papel admin", () => {
    expect(canAccessRoute(["admin"], "/admin")).toBe(true);
    for (const r of ["gestor", "compliance", "auditor", "operador"] as AppRole[]) {
      expect(canAccessRoute([r], "/admin")).toBe(false);
    }
  });

  it("operador não acede a compliance nem entidades", () => {
    expect(canAccessRoute(["operador"], "/compliance")).toBe(false);
    expect(canAccessRoute(["operador"], "/entidades")).toBe(false);
    expect(canAccessRoute(["operador"], "/curadoria")).toBe(true);
  });

  it("papel compliance acede a compliance e auditoria", () => {
    expect(canAccessRoute(["compliance"], "/compliance")).toBe(true);
    expect(canAccessRoute(["compliance"], "/curadoria/auditoria")).toBe(true);
  });
});

describe("RBAC — permissões de dados", () => {
  it("apenas admin gere infraestrutura", () => {
    expect(can(["admin"], "infra:gerir")).toBe(true);
    expect(can(["gestor"], "infra:gerir")).toBe(false);
  });

  it("auditor valida mas não submete curadoria", () => {
    expect(can(["auditor"], "curadoria:validar")).toBe(true);
    expect(can(["auditor"], "curadoria:submeter")).toBe(false);
  });

  it("hasRole aceita múltiplos papéis", () => {
    expect(hasRole(["operador", "compliance"], ["compliance"])).toBe(true);
    expect(hasRole(["operador"], ["compliance", "admin"])).toBe(false);
  });
});
