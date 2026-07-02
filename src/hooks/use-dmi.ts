import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EstratoDmi = "A" | "B" | "C" | "D" | "E";

export interface DmiPesos {
  idh: number;
  receita_pc: number;
  servidores: number;
  completude: number;
  min_group_size: number;
}

/** Contagem de municípios classificados por estrato — base do filtro global e do badge. */
export function useDmiCounts() {
  return useQuery({
    queryKey: ["dmi-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_cobertura_municipal" as any)
        .select("municipio_ibge, estrato_dmi");
      if (error) throw error;
      const counts: Record<EstratoDmi, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      const seen = new Set<string>();
      (data as any[])?.forEach((r) => {
        const key = `${r.municipio_ibge}-${r.estrato_dmi}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (r.estrato_dmi in counts) counts[r.estrato_dmi as EstratoDmi]++;
      });
      return counts;
    },
  });
}

const DEFAULT_PESOS: DmiPesos = {
  idh: 0.3,
  receita_pc: 0.3,
  servidores: 0.2,
  completude: 0.2,
  min_group_size: 30,
};

export function useDmiPesos() {
  return useQuery({
    queryKey: ["dmi-pesos"],
    queryFn: async (): Promise<DmiPesos> => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "dmi_pesos")
        .maybeSingle();
      if (error) throw error;
      return { ...DEFAULT_PESOS, ...((data?.value as Partial<DmiPesos>) ?? {}) };
    },
  });
}
