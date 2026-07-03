import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function useComplianceRegras() {
  return useQuery({
    queryKey: ["compliance-regras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compliance_regras").select("*").order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePlanosAcao() {
  return useQuery({
    queryKey: ["planos-acao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos_acao")
        .select("*, entidades(nome), planos_acao_itens(*)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMinhasNotificacoes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notificacoes-in-app", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_notificacoes")
        .select("*")
        .eq("canal", "in_app")
        .eq("destinatario_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNotificacoesDispatch() {
  return useQuery({
    queryKey: ["notif-dispatch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_notificacoes")
        .select("*, entidades(nome)")
        .in("canal", ["email", "webhook"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAutoDetect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("compliance-auto-detect", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Detecção concluída",
        description: `${data.abertas ?? 0} nova(s) infração(ões), ${data.notificacoes_enfileiradas ?? 0} notificação(ões).`,
      });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDispatchNotif() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("compliance-notify-dispatch", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Despachadas", description: `${data.despachadas ?? 0} notificação(ões).` });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function usePlanoTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { plano_id: string; novo_estado: string; motivo_rejeicao?: string }) => {
      const { data, error } = await supabase.functions.invoke("compliance-plano-transition", { body: args });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      toast({ title: `Plano → ${v.novo_estado}` });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useMarkNotifRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("compliance_notificacoes")
        .update({ status: "lida", lido_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes-in-app"] }),
  });
}
