import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEntidades() {
  return useQuery({
    queryKey: ["entidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entidades")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useEtes() {
  return useQuery({
    queryKey: ["etes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etes")
        .select("*, entidades(nome)")
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });
}

export function useSensores() {
  return useQuery({
    queryKey: ["sensores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sensores")
        .select("*, etes(nome, cidade, uf)")
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });
}

export function useComplianceScores() {
  return useQuery({
    queryKey: ["compliance_scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_scores")
        .select("*, entidades(nome)")
        .order("score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

const TIPO_TO_KEY: Record<string, string> = {
  "pH": "ph",
  "Turbidez": "turbidez",
  "DBO": "dbo",
  "Cloro Residual": "cloro",
  "Temperatura": "temperatura",
};

export function useSensorTimeSeries(hours = 24) {
  return useQuery({
    queryKey: ["sensor_timeseries", hours],
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("sensor_leituras")
        .select("valor, created_at, sensores(tipo)")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Aggregate by hour bucket
      const buckets = new Map<string, { hora: string; sums: Record<string, number>; counts: Record<string, number> }>();
      for (const row of (data as any[]) || []) {
        const tipo = row.sensores?.tipo;
        const key = TIPO_TO_KEY[tipo];
        if (!key) continue;
        const d = new Date(row.created_at);
        const hora = `${String(d.getHours()).padStart(2, "0")}:00`;
        if (!buckets.has(hora)) buckets.set(hora, { hora, sums: {}, counts: {} });
        const b = buckets.get(hora)!;
        b.sums[key] = (b.sums[key] || 0) + Number(row.valor);
        b.counts[key] = (b.counts[key] || 0) + 1;
      }
      return Array.from(buckets.values())
        .sort((a, b) => a.hora.localeCompare(b.hora))
        .map((b) => {
          const out: any = { hora: b.hora };
          for (const k of Object.keys(b.sums)) {
            out[k] = +(b.sums[k] / b.counts[k]).toFixed(2);
          }
          return out;
        });
    },
  });
}

export function useInfracoes() {
  return useQuery({
    queryKey: ["infracoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infracoes")
        .select("*, entidades(nome)")
        .order("data_ocorrencia", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
