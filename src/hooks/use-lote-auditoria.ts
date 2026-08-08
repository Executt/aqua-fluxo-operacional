import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LoteAuditoriaRow } from "@/lib/lote-auditoria";

/**
 * Trilha de auditoria de lotes.
 * @param limit número máximo de eventos
 * @param realtime quando true, subscreve alterações e atualiza KPIs/gráficos em tempo real
 */
export function useLoteAuditoria(limit = 500, realtime = true) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["curadoria-lote-auditoria", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curadoria_lote_auditoria" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as LoteAuditoriaRow[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!realtime) return;
    const channel = supabase
      .channel(`curadoria-lote-auditoria-${limit}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "curadoria_lote_auditoria" },
        () => {
          qc.invalidateQueries({ queryKey: ["curadoria-lote-auditoria"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, limit, realtime]);

  return query;
}
