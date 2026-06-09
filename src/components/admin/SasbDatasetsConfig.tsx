import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Database, RefreshCw, Search, CheckCircle2, AlertCircle, Link2,
  History, Loader2, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SasbDataset = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  dimension: "Cobertura" | "Qualidade" | "Atendimento" | "Econômico-Financeiro";
  source_org: string;
  endpoint: string;
  status: "conectado" | "desatualizado" | "erro" | "sincronizando";
  records: number;
  enabled: boolean;
  used_in_score: boolean;
  quality_score: number | null;
  last_sync_at: string | null;
  sync_interval_minutes: number;
};

type SyncLog = {
  id: string;
  dataset_id: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: "running" | "success" | "warning" | "error";
  records_in: number | null;
  records_out: number | null;
  records_invalid: number | null;
  completeness_pct: number | null;
  validity_pct: number | null;
  freshness_days: number | null;
  quality_score: number | null;
  message: string | null;
  warnings: Array<{ rule: string; severity: "info" | "warn" | "error"; detail: string }> | null;
  triggered_by: "manual" | "scheduled" | "api";
};

const dimColor: Record<SasbDataset["dimension"], string> = {
  "Cobertura": "bg-blue-50 text-blue-700 border-blue-200",
  "Qualidade": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Atendimento": "bg-amber-50 text-amber-700 border-amber-200",
  "Econômico-Financeiro": "bg-violet-50 text-violet-700 border-violet-200",
};

const statusMeta: Record<SasbDataset["status"], { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  conectado:      { label: "Conectado",      cls: "text-emerald-600",  icon: CheckCircle2 },
  desatualizado:  { label: "Desatualizado",  cls: "text-amber-600",    icon: RefreshCw },
  erro:           { label: "Erro",           cls: "text-destructive",  icon: AlertCircle },
  sincronizando:  { label: "Sincronizando",  cls: "text-primary",      icon: Loader2 },
};

const logStatusCls: Record<SyncLog["status"], string> = {
  running: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error:   "bg-red-50 text-red-700 border-red-200",
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};
const relTime = (iso: string | null) => {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `há ${mins}min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
};

export function SasbDatasetsConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dim, setDim] = useState<string>("all");
  const [logsFor, setLogsFor] = useState<SasbDataset | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["sasb_datasets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sasb_datasets").select("*").order("code");
      if (error) throw error;
      return data as SasbDataset[];
    },
    refetchInterval: 5000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (dim !== "all" && d.dimension !== dim) return false;
      if (!q) return true;
      return `${d.code} ${d.name} ${d.description ?? ""} ${d.source_org}`.toLowerCase().includes(q);
    });
  }, [items, search, dim]);

  const dims = ["Cobertura", "Qualidade", "Atendimento", "Econômico-Financeiro"] as const;
  const dimCounts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((d) => { c[d.dimension] = (c[d.dimension] || 0) + 1; });
    return c;
  }, [items]);

  const enabledCount = items.filter((d) => d.enabled).length;
  const scoreCount = items.filter((d) => d.used_in_score).length;
  const totalRecords = items.reduce((s, d) => s + (d.enabled ? d.records : 0), 0);
  const avgQuality = useMemo(() => {
    const vals = items.filter((d) => d.enabled && typeof d.quality_score === "number")
      .map((d) => d.quality_score as number);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [items]);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SasbDataset> }) => {
      const { error } = await supabase.from("sasb_datasets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sasb_datasets"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const sync = useMutation({
    mutationFn: async (dataset_id?: string) => {
      const { data, error } = await supabase.functions.invoke("sasb-sync", {
        body: dataset_id ? { dataset_id, triggered_by: "manual" } : { triggered_by: "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["sasb_datasets"] });
      qc.invalidateQueries({ queryKey: ["sasb_sync_logs"] });
      const errors = (data?.results || []).filter((r: any) => r.status === "error").length;
      const warns  = (data?.results || []).filter((r: any) => r.status === "warning").length;
      toast({
        title: `Sincronização concluída — ${data?.count ?? 0} dataset(s)`,
        description: `${errors} erro(s), ${warns} aviso(s).`,
      });
    },
    onError: (e: any) => toast({ title: "Falha na sincronização", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> Base SARSB — Avaliação de compliance
          </CardTitle>
          <CardDescription className="text-body-sm">
            Sistema de Avaliação Regulatória do Saneamento Básico (ANA NR 79/2022).
            Sincronização automática com validação de qualidade.
          </CardDescription>
        </div>
        <Button
          size="sm" className="h-8 gap-1.5"
          onClick={() => sync.mutate(undefined)}
          disabled={sync.isPending}
        >
          {sync.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />}
          Sincronizar todos ativos
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Datasets" value={items.length} hint={`${enabledCount} ativos`} />
          <Kpi label="No score" value={scoreCount} hint="usados no compliance" tone="primary" />
          <Kpi label="Registros" value={totalRecords.toLocaleString("pt-BR")} hint="linhas integradas" />
          <Kpi
            label="Qualidade média"
            value={`${avgQuality}%`}
            hint={avgQuality >= 85 ? "saudável" : avgQuality >= 70 ? "atenção" : "crítico"}
            tone={avgQuality >= 85 ? "good" : avgQuality >= 70 ? "warn" : "bad"}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-9 pl-8 text-[12px]" placeholder="Buscar dataset, código ou fonte..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setDim("all")}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${
                dim === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
              }`}>
              Todas ({items.length})
            </button>
            {dims.map((d) => (
              <button key={d} onClick={() => setDim(d)}
                className={`text-[11px] px-2.5 py-1 rounded-full border ${
                  dim === d ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
                }`}>
                {d} ({dimCounts[d] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {isLoading && <p className="text-body-sm text-muted-foreground py-6 text-center">A carregar...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-body-sm text-muted-foreground py-6 text-center">Nenhum dataset encontrado.</p>
          )}
          {filtered.map((d) => {
            const Meta = statusMeta[d.status];
            const Icon = Meta.icon;
            const q = d.quality_score ?? 0;
            const qTone = q >= 85 ? "bg-emerald-500" : q >= 70 ? "bg-amber-500" : "bg-destructive";
            return (
              <div key={d.id} className="rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${dimColor[d.dimension]}`}>
                        {d.dimension}
                      </Badge>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">{d.code}</span>
                      <Badge variant="outline" className="text-[10px]">{d.source_org}</Badge>
                      {d.used_in_score && (
                        <Badge variant="outline" className="text-[10px] bg-primary-soft text-primary border-primary/20">
                          usado no score
                        </Badge>
                      )}
                      <span className={`text-[10px] inline-flex items-center gap-1 ${Meta.cls}`}>
                        <Icon className={`h-3 w-3 ${d.status === "sincronizando" ? "animate-spin" : ""}`} />
                        {Meta.label}
                      </span>
                    </div>
                    <h3 className="font-medium text-[13px] leading-snug">{d.name}</h3>
                    <p className="text-caption text-muted-foreground mt-0.5 line-clamp-1">{d.description}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Link2 className="h-2.5 w-2.5" />
                        <span className="truncate max-w-[260px]">{d.endpoint}</span>
                      </span>
                      <span>{d.records.toLocaleString("pt-BR")} registros</span>
                      <span>Última sinc.: <span className="font-medium text-foreground">{relTime(d.last_sync_at)}</span></span>
                      <span>Intervalo: {Math.round(d.sync_interval_minutes / 60)}h</span>
                    </div>
                    {/* Quality bar */}
                    <div className="flex items-center gap-2 mt-2">
                      {q >= 70 ? <ShieldCheck className="h-3 w-3 text-emerald-600" /> : <ShieldAlert className="h-3 w-3 text-amber-600" />}
                      <span className="text-[10px] text-muted-foreground w-24">Qualidade {q}%</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${qTone} transition-all`} style={{ width: `${q}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground">Ativo</Label>
                      <Switch
                        checked={d.enabled}
                        onCheckedChange={(v) => update.mutate({ id: d.id, patch: { enabled: v } })}
                        className="scale-75"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground">No score</Label>
                      <Switch
                        checked={d.used_in_score}
                        disabled={!d.enabled}
                        onCheckedChange={(v) => update.mutate({ id: d.id, patch: { used_in_score: v } })}
                        className="scale-75"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1"
                        onClick={() => setLogsFor(d)}>
                        <History className="h-3 w-3" /> Logs
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1"
                        disabled={sync.isPending || d.status === "sincronizando"}
                        onClick={() => sync.mutate(d.id)}>
                        {d.status === "sincronizando"
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <RefreshCw className="h-3 w-3" />}
                        Sincronizar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <SyncLogsDialog dataset={logsFor} onClose={() => setLogsFor(null)} />
      </CardContent>
    </Card>
  );
}

function SyncLogsDialog({ dataset, onClose }: { dataset: SasbDataset | null; onClose: () => void }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["sasb_sync_logs", dataset?.id],
    enabled: !!dataset,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sasb_sync_logs")
        .select("*")
        .eq("dataset_id", dataset!.id)
        .order("started_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data as unknown as SyncLog[];
    },
    refetchInterval: dataset ? 4000 : false,
  });

  return (
    <Dialog open={!!dataset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Histórico de sincronização
          </DialogTitle>
          <DialogDescription>
            {dataset?.code} — {dataset?.name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">A carregar logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">
            Nenhuma sincronização registrada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${logStatusCls[l.status]}`}>
                      {l.status === "running" ? "Em execução" : l.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {fmtDate(l.started_at)} • {l.triggered_by}
                      {l.duration_ms != null && ` • ${l.duration_ms}ms`}
                    </span>
                  </div>
                  {typeof l.quality_score === "number" && (
                    <Badge variant="outline" className="text-[10px]">
                      Qualidade {l.quality_score}%
                    </Badge>
                  )}
                </div>

                {l.message && <p className="text-[12px] mb-2">{l.message}</p>}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                  <Metric label="Entrada"   value={l.records_in ?? 0} />
                  <Metric label="Válidos"   value={l.records_out ?? 0} good />
                  <Metric label="Inválidos" value={l.records_invalid ?? 0} bad={!!l.records_invalid} />
                  <Metric label="Frescor"   value={l.freshness_days != null ? `${l.freshness_days}d` : "—"} />
                </div>

                {(l.completeness_pct != null || l.validity_pct != null) && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <QualityBar label="Completude" value={l.completeness_pct ?? 0} target={85} />
                    <QualityBar label="Validade"   value={l.validity_pct ?? 0}     target={90} />
                  </div>
                )}

                {!!l.warnings?.length && (
                  <div className="mt-2 space-y-1">
                    {l.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]">
                        <Badge
                          variant="outline"
                          className={`text-[9px] shrink-0 ${
                            w.severity === "error" ? "bg-red-50 text-red-700 border-red-200" :
                            w.severity === "warn"  ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                     "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {w.rule}
                        </Badge>
                        <span className="text-muted-foreground">{w.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, good, bad }: { label: string; value: number | string; good?: boolean; bad?: boolean }) {
  return (
    <div className="rounded border border-border px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-[12px] font-semibold ${good ? "text-emerald-600" : bad ? "text-destructive" : "text-foreground"}`}>
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
    </div>
  );
}

function QualityBar({ label, value, target }: { label: string; value: number; target: number }) {
  const ok = value >= target;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
        <span>{label}</span>
        <span className={ok ? "text-emerald-600" : "text-amber-600"}>{value}% / {target}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function Kpi({
  label, value, hint, tone,
}: {
  label: string; value: string | number; hint?: string;
  tone?: "primary" | "good" | "warn" | "bad";
}) {
  const cls =
    tone === "primary" ? "bg-primary-soft border-primary/20 text-primary" :
    tone === "good"    ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
    tone === "warn"    ? "bg-amber-50 border-amber-200 text-amber-700" :
    tone === "bad"     ? "bg-red-50 border-red-200 text-red-700" :
                         "border-border bg-card text-foreground";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
      {hint && <p className="text-[10px] opacity-70 mt-0.5">{hint}</p>}
    </div>
  );
}
