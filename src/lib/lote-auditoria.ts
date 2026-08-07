import { supabase } from "@/integrations/supabase/client";

export type LoteEvento = "validacao" | "importacao" | "reenfileiramento" | "falha";

export interface LoteAuditoriaRow {
  id: string;
  lote_id: string;
  lote_pai_id: string | null;
  tentativa: number;
  evento: LoteEvento;
  modo: "submeter" | "rascunho" | null;
  origem: "arquivo" | "colado" | "reenfileiramento" | null;
  nome_arquivo: string | null;
  operador_id: string | null;
  ete_id: string | null;
  ete_codigo: string | null;
  uf: string | null;
  ano_referencia: number | null;
  mes_referencia: number | null;
  resultado: string;
  motivos: string[];
  detalhe: string | null;
  duracao_ms: number | null;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
}

export type LoteEventoInput = Omit<
  LoteAuditoriaRow,
  "id" | "created_at" | "actor_id" | "actor_email" | "motivos"
> & { motivos?: string[] };

/** Grava eventos da trilha de auditoria de lotes (best-effort — nunca bloqueia a importação). */
export async function logLoteEventos(eventos: LoteEventoInput[]) {
  if (!eventos.length) return;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const actor_id = auth.user?.id ?? null;
    if (!actor_id) return; // RLS exige actor_id = auth.uid()
    const payload = eventos.map((e) => ({
      ...e,
      motivos: e.motivos ?? [],
      actor_id,
      actor_email: auth.user?.email ?? null,
    }));
    await supabase.from("curadoria_lote_auditoria" as never).insert(payload as never);
  } catch {
    /* auditoria é best-effort */
  }
}
