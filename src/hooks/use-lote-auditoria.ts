import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LoteAuditoriaRow } from "@/lib/lote-auditoria";

export function useLoteAuditoria(limit = 500) {
  return useQuery({
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
}
