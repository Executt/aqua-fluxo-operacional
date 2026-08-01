import { supabase } from "@/integrations/supabase/client";

export type InfraEntity = "repository" | "database";
export type InfraAction = "create" | "update" | "activate" | "deactivate" | "delete" | "test" | "sync";

/** Regista uma entrada na trilha de auditoria de infraestrutura (best-effort). */
export async function logInfraAudit(params: {
  entity_type: InfraEntity;
  entity_id: string;
  entity_name?: string | null;
  action: InfraAction;
  motivo?: string | null;
  before_json?: unknown;
  after_json?: unknown;
}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("infra_audit_log" as any).insert({
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      entity_name: params.entity_name ?? null,
      action: params.action,
      motivo: params.motivo ?? null,
      changed_by: auth.user?.id ?? null,
      changed_by_email: auth.user?.email ?? null,
      before_json: (params.before_json ?? null) as any,
      after_json: (params.after_json ?? null) as any,
    });
  } catch {
    /* auditoria não deve bloquear a operação principal */
  }
}

/** Remove chaves sensíveis antes de guardar snapshots na auditoria. */
const SENSITIVE = /(password|secret|token|key|private)/i;
export function redact(config: Record<string, unknown> | null | undefined) {
  if (!config) return null;
  return Object.fromEntries(
    Object.entries(config).map(([k, v]) => [k, SENSITIVE.test(k) ? "***" : v]),
  );
}
