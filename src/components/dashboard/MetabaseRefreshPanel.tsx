import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Run = {
  status: string;
  return_message: string | null;
  start_time: string;
  end_time: string | null;
};

type Status = {
  scheduled: boolean;
  message?: string;
  job?: { jobname: string; schedule: string; active: boolean } | null;
  last_run?: Run | null;
  last_runs?: Run[];
  last_success_at?: string | null;
  seconds_since_last_success?: number | null;
  is_overdue?: boolean;
  is_failing?: boolean;
};

function formatAge(s: number | null | undefined) {
  if (s == null) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

export function MetabaseRefreshPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("metabase-refresh-status");
      if (error) throw error;
      setStatus(data as Status);
    } catch (e) {
      setStatus({ scheduled: false, message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const failing = status?.is_failing;
  const overdue = status?.is_overdue;
  const healthy = status?.scheduled && !failing && !overdue;

  const stateColor = failing
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : overdue
      ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
      : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";

  const StateIcon = failing ? AlertTriangle : overdue ? Clock : CheckCircle2;

  return (
    <Card className="elevation-1 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-md bg-primary/10 p-2 shrink-0">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-heading-3 text-foreground">Refresh do Star Schema (Metabase)</h3>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              Job <span className="font-mono text-[12px]">refresh_metabase_views_15min</span> ·{" "}
              <span className="font-mono text-[12px]">{status?.job?.schedule ?? "*/15 * * * *"}</span>
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-border bg-card p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado</div>
          <Badge variant="outline" className={cn("mt-1.5 gap-1", stateColor)}>
            <StateIcon className="h-3 w-3" />
            {failing ? "Falhando" : overdue ? "Atrasado" : healthy ? "Saudável" : "Desconhecido"}
          </Badge>
        </div>

        <div className="rounded-md border border-border bg-card p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Último sucesso
          </div>
          <div className="mt-1 font-mono text-[13px] text-foreground">
            {formatAge(status?.seconds_since_last_success)} atrás
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {status?.last_success_at
              ? new Date(status.last_success_at).toLocaleString("pt-BR")
              : "—"}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Última execução
          </div>
          <div className="mt-1 font-mono text-[13px] text-foreground capitalize">
            {status?.last_run?.status ?? "—"}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {status?.last_run?.start_time
              ? new Date(status.last_run.start_time).toLocaleString("pt-BR")
              : "—"}
          </div>
        </div>
      </div>

      {(failing || overdue || status?.message) && (
        <div
          className={cn(
            "mt-4 rounded-md border p-3 text-body-sm flex gap-2",
            failing
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-amber-500/30 bg-amber-500/5 text-amber-800",
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-medium">
              {failing
                ? "O job pg_cron falhou na última execução."
                : status?.message
                  ? "Não foi possível ler o estado do pg_cron."
                  : "Refresh atrasado — o último sucesso foi há mais de 20 minutos."}
            </div>
            {status?.last_run?.return_message && (
              <div className="font-mono text-[12px] mt-1 break-words opacity-80">
                {status.last_run.return_message}
              </div>
            )}
            {status?.message && (
              <div className="text-[12px] mt-1 opacity-80">{status.message}</div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
