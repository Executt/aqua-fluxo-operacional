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
