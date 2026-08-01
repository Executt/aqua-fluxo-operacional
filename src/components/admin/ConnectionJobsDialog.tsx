import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw, Clock } from "lucide-react";

type Job = {
  id: string;
  target: string;
  target_id: string;
  state: "queued" | "running" | "done" | "error";
  result_status: "ok" | "warn" | "fail" | "pending" | null;
  message: string | null;
  latency_ms: number | null;
  attempt: number;
  created_at: string;
  finished_at: string | null;
};

function stateBadge(j: Job) {
  if (j.state === "queued")
    return <Badge variant="outline" className="text-[10px] gap-1"><Clock className="h-2.5 w-2.5" /> Na fila</Badge>;
  if (j.state === "running")
    return <Badge variant="outline" className="text-[10px] gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" /> A executar</Badge>;
  const s = j.result_status;
  if (s === "ok")
    return <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 bg-emerald-50 border-emerald-200"><CheckCircle2 className="h-2.5 w-2.5" /> OK</Badge>;
  if (s === "warn")
    return <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 bg-amber-50 border-amber-200"><AlertTriangle className="h-2.5 w-2.5" /> Atenção</Badge>;
  return <Badge variant="outline" className="text-[10px] gap-1 text-red-600 bg-red-50 border-red-200"><XCircle className="h-2.5 w-2.5" /> Falha</Badge>;
}

export function ConnectionJobsDialog({
  open, onOpenChange, target, targetId, targetName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: "repository" | "database";
  targetId: string | null;
  targetName?: string;
}) {
  const qc = useQueryClient();
  const { data: jobs = [], isFetching } = useQuery({
    queryKey: ["connection_test_jobs", target, targetId],
    enabled: open && !!targetId,
    refetchInterval: (q) => {
      const rows = (q.state.data as Job[] | undefined) ?? [];
      return rows.some((j) => j.state === "queued" || j.state === "running") ? 2000 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_test_jobs" as any)
        .select("*")
        .eq("target", target)
        .eq("target_id", targetId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as Job[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de testes de conexão</DialogTitle>
          <DialogDescription className="text-[12px]">
            {targetName ? `${targetName} — ` : ""}execução assíncrona; a fila é processada em background.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5"
            onClick={() => qc.invalidateQueries({ queryKey: ["connection_test_jobs", target, targetId] })}>
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <div className="space-y-2">
          {jobs.length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-6">Sem tentativas registadas.</p>
          )}
          {jobs.map((j) => (
            <div key={j.id} className="rounded-md border border-border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {stateBadge(j)}
                  <span className="text-[11px] text-muted-foreground">tentativa #{j.attempt}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(j.created_at).toLocaleString("pt-BR")}
                  {j.latency_ms != null ? ` · ${j.latency_ms}ms` : ""}
                </span>
              </div>
              {j.message && <p className="text-[11px] text-muted-foreground mt-1">{j.message}</p>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
