/**
 * RBAC — papéis da aplicação e permissões por rota.
 * Os papéis são a fonte de verdade no servidor (tabela public.user_roles + RLS);
 * este módulo apenas espelha as regras para esconder/bloquear a UI.
 */

export type AppRole = "admin" | "gestor" | "compliance" | "auditor" | "operador";

export const ALL_ROLES: AppRole[] = ["admin", "gestor", "compliance", "auditor", "operador"];

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  compliance: "Compliance",
  auditor: "Auditor",
  operador: "Operador",
};

/** Rotas → papéis autorizados. Ausência da rota = basta estar autenticado. */
export const ROUTE_ROLES: Record<string, AppRole[]> = {
  "/": ALL_ROLES,
  "/iot": ["admin", "gestor", "compliance", "auditor", "operador"],
  "/compliance": ["admin", "gestor", "compliance", "auditor"],
  "/entidades": ["admin", "gestor", "compliance"],
  "/cortex": ["admin", "gestor", "compliance", "auditor", "operador"],
  "/curadoria": ["admin", "gestor", "compliance", "auditor", "operador"],
  "/curadoria/auditoria": ["admin", "gestor", "compliance", "auditor"],
  "/admin": ["admin"],
};

/** Permissões de dados (usadas antes de escrever/ler via Supabase). */
export const DATA_PERMISSIONS = {
  "curadoria:submeter": ["admin", "gestor", "operador"],
  "curadoria:validar": ["admin", "gestor", "compliance", "auditor"],
  "compliance:gerir": ["admin", "gestor", "compliance"],
  "entidades:gerir": ["admin", "gestor"],
  "infra:gerir": ["admin"],
  "auditoria:ler": ["admin", "gestor", "compliance", "auditor"],
} as const satisfies Record<string, AppRole[]>;

export type Permission = keyof typeof DATA_PERMISSIONS;

export function hasRole(roles: AppRole[] | undefined, allowed: AppRole[]): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => allowed.includes(r));
}

export function can(roles: AppRole[] | undefined, permission: Permission): boolean {
  return hasRole(roles, DATA_PERMISSIONS[permission] as unknown as AppRole[]);
}

export function canAccessRoute(roles: AppRole[] | undefined, path: string): boolean {
  const allowed = ROUTE_ROLES[path];
  if (!allowed) return !!roles; // rota sem restrição: exige apenas autenticação
  return hasRole(roles, allowed);
}
