import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Droplets, FileText, Send, CheckCircle2, XCircle, Clock, FileSearch, Plus, AlertTriangle,
  Filter, ChevronLeft, ChevronRight, X, Sparkles, Lightbulb,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const motivoRejeicaoSchema = z.string()
  .trim()
  .min(20, "O motivo deve ter pelo menos 20 caracteres para garantir rastreabilidade")
  .max(1000, "O motivo não pode exceder 1000 caracteres");

type Estado = "rascunho" | "submetido" | "em_analise" | "validado" | "rejeitado";

const ESTADO_META: Record<Estado, { label: string; cls: string; icon: typeof Clock }> = {
  rascunho:   { label: "Rascunho",   cls: "bg-muted text-muted-foreground",          icon: FileText },
  submetido:  { label: "Submetido",  cls: "bg-info/15 text-info",                    icon: Send },
  em_analise: { label: "Em análise", cls: "bg-warning/15 text-warning",              icon: FileSearch },
  validado:   { label: "Validado",   cls: "bg-success/15 text-success",              icon: CheckCircle2 },
  rejeitado:  { label: "Rejeitado",  cls: "bg-destructive/15 text-destructive",      icon: XCircle },
};

interface Ete {
  id: string;
  codigo: string;
  nome: string;
  municipio_nome: string;
  uf: string;
  status_operacional: string;
  eficiencia_dbo_pct: number | null;
  faixa_dbo: string | null;
}

interface Resposta {
  id: string;
  ete_id: string;
  ano_referencia: number;
  mes_referencia: number;
  estado: Estado;
  payload: Record<string, unknown>;
  motivo_rejeicao: string | null;
  submitted_at: string | null;
}

const PAGE_SIZE = 25;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Filters {
  uf: string;
  estado: string;
  ano: string;
  mes: string;
  busca: string;
}

const DEFAULT_FILTERS: Filters = { uf: "all", estado: "all", ano: "all", mes: "all", busca: "" };

export default function Curadoria() {
  const { operadorId, isStaff } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  const [form, setForm] = useState({
    ete_id: "",
    ano_referencia: CURRENT_YEAR,
    mes_referencia: new Date().getMonth() + 1,
    eficiencia_dbo_pct: "",
    vazao_media_lps: "",
    ph_medio: "",
    od_medio_mg_l: "",
    observacoes: "",
  });

  const [rejectTarget, setRejectTarget] = useState<Resposta | null>(null);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // Pré-validação IA
  type PrecheckResult = { warnings: string[]; recomendacoes: string[]; summary: string };
  const [precheck, setPrecheck] = useState<PrecheckResult | null>(null);
  const precheckMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      if (form.eficiencia_dbo_pct) payload.eficiencia_dbo_pct = Number(form.eficiencia_dbo_pct);
      if (form.vazao_media_lps)    payload.vazao_media_lps    = Number(form.vazao_media_lps);
      if (form.ph_medio)           payload.ph_medio           = Number(form.ph_medio);
      if (form.od_medio_mg_l)      payload.od_medio_mg_l      = Number(form.od_medio_mg_l);
      if (form.observacoes)        payload.observacoes        = form.observacoes;

      if (Object.keys(payload).length === 0) throw new Error("Preencha ao menos um parâmetro antes de pré-validar.");

      const { data, error } = await supabase.functions.invoke("curadoria-ai-precheck", {
        body: {
          ete_id: form.ete_id || undefined,
          ano_referencia: form.ano_referencia,
          mes_referencia: form.mes_referencia,
          payload,
        },
      });
      if (error) throw error;
      return data as PrecheckResult;
    },
    onSuccess: (data) => setPrecheck(data),
    onError: (err: Error) => toast({ title: "Pré-validação IA", description: err.message, variant: "destructive" }),
  });

  // ETEs — cache longa
  const { data: etes = [] } = useQuery({
    queryKey: ["etes-curadoria", operadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etes_curadoria")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Ete[];
    },
    staleTime: 5 * 60_000,
  });

  const ufs = useMemo(
    () => Array.from(new Set(etes.map((e) => e.uf).filter(Boolean))).sort(),
    [etes]
  );

  // ete_ids filtrados por UF/busca (cliente)
  const filteredEteIds = useMemo(() => {
    if (filters.uf === "all" && !filters.busca.trim()) return null;
    const q = filters.busca.trim().toLowerCase();
    return etes
      .filter((e) => {
        if (filters.uf !== "all" && e.uf !== filters.uf) return false;
        if (q && !`${e.codigo} ${e.nome} ${e.municipio_nome}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((e) => e.id);
  }, [etes, filters.uf, filters.busca]);

  // Submissões — paginadas e filtradas
  const { data: respPage, isLoading, isFetching } = useQuery({
    queryKey: ["respostas", operadorId, filters, page, filteredEteIds?.length ?? -1],
    queryFn: async () => {
      let query = supabase
        .from("formulario_respostas")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (filters.estado !== "all") query = query.eq("estado", filters.estado as Estado);
      if (filters.ano !== "all") query = query.eq("ano_referencia", Number(filters.ano));
      if (filters.mes !== "all") query = query.eq("mes_referencia", Number(filters.mes));
      if (filteredEteIds) {
        if (filteredEteIds.length === 0) return { rows: [] as Resposta[], total: 0 };
        query = query.in("ete_id", filteredEteIds);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as Resposta[], total: count ?? 0 };
    },
    placeholderData: keepPreviousData,
  });

  const respostas = respPage?.rows ?? [];
  const total = respPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // KPIs globais (sem paginação) — leve, conta por estado
  const { data: kpis } = useQuery({
    queryKey: ["respostas-kpis", operadorId],
    queryFn: async () => {
      const states: Estado[] = ["rascunho", "submetido", "em_analise", "validado"];
      const counts: Record<string, number> = {};
      await Promise.all(states.map(async (s) => {
        const { count } = await supabase
          .from("formulario_respostas")
          .select("id", { count: "exact", head: true })
          .eq("estado", s);
        counts[s] = count ?? 0;
      }));
      return counts;
    },
    staleTime: 60_000,
  });

  // Mutations
  const submitMut = useMutation({
    mutationFn: async (estado: "rascunho" | "submetido") => {
      if (!form.ete_id) throw new Error("Selecione uma ETE");
      const payload: Record<string, unknown> = {};
      if (form.eficiencia_dbo_pct) payload.eficiencia_dbo_pct = Number(form.eficiencia_dbo_pct);
      if (form.vazao_media_lps)    payload.vazao_media_lps    = Number(form.vazao_media_lps);
      if (form.ph_medio)           payload.ph_medio           = Number(form.ph_medio);
      if (form.od_medio_mg_l)      payload.od_medio_mg_l      = Number(form.od_medio_mg_l);
      if (form.observacoes)        payload.observacoes        = form.observacoes;

      const { data, error } = await supabase.functions.invoke("curadoria-submit", {
        body: {
          ete_id: form.ete_id,
          ano_referencia: form.ano_referencia,
          mes_referencia: form.mes_referencia,
          payload,
          estado,
        },
      });
      if (error) throw error;
      return { data, estado };
    },
    onSuccess: ({ data, estado }) => {
      toast({
        title: estado === "submetido" ? "Resposta submetida" : "Rascunho guardado",
        description: data?.resposta?.id ?? "OK",
      });
      qc.invalidateQueries({ queryKey: ["respostas"] });
      qc.invalidateQueries({ queryKey: ["respostas-kpis"] });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const transitionMut = useMutation({
    mutationFn: async (vars: { resposta_id: string; novo_estado: Estado; motivo?: string }) => {
      const { error } = await supabase.functions.invoke("curadoria-transition", {
        body: {
          resposta_id: vars.resposta_id,
          novo_estado: vars.novo_estado,
          motivo_rejeicao: vars.motivo,
        },
      });
      if (error) throw error;
      return vars.novo_estado;
    },
    onSuccess: (novo_estado) => {
      toast({ title: `Resposta ${novo_estado}` });
      qc.invalidateQueries({ queryKey: ["respostas"] });
      qc.invalidateQueries({ queryKey: ["respostas-kpis"] });
    },
    onError: (err: Error) => toast({ title: "Falha", description: err.message, variant: "destructive" }),
  });

  function openRejectDialog(r: Resposta) {
    setRejectTarget(r);
    setMotivo("");
    setMotivoError(null);
  }

  async function confirmReject() {
    const parsed = motivoRejeicaoSchema.safeParse(motivo);
    if (!parsed.success) {
      setMotivoError(parsed.error.issues[0].message);
      return;
    }
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await transitionMut.mutateAsync({
        resposta_id: rejectTarget.id,
        novo_estado: "rejeitado",
        motivo: parsed.data,
      });
      setRejectTarget(null);
    } catch { /* toast já emitido */ }
    setRejecting(false);
  }

  const hasActiveFilters =
    filters.uf !== "all" || filters.estado !== "all" || filters.ano !== "all" ||
    filters.mes !== "all" || filters.busca.trim() !== "";

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Curadoria Nacional de Saneamento</h1>
            <p className="text-sm text-muted-foreground">
              {isStaff
                ? "Visão de auditor — todas as submissões"
                : "Submeta dados das ETEs do seu operador"}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["rascunho", "submetido", "em_analise", "validado"] as Estado[]).map((e) => {
            const Meta = ESTADO_META[e];
            const count = kpis?.[e] ?? 0;
            return (
              <Card key={e} className="elevation-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-md flex items-center justify-center ${Meta.cls}`}>
                    <Meta.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold tabular-nums">{count}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{Meta.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Formulário */}
        {!isStaff && (
          <Card className="elevation-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova submissão mensal
              </CardTitle>
              <CardDescription>
                Parâmetros validados contra Atlas Esgotos / CONAMA 357/2005.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <Label>ETE</Label>
                  <Select value={form.ete_id} onValueChange={(v) => setForm({ ...form, ete_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar ETE..." /></SelectTrigger>
                    <SelectContent>
                      {etes.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.codigo} · {e.nome} · {e.municipio_nome}/{e.uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano referência</Label>
                  <Input type="number" min={2000} max={CURRENT_YEAR + 1}
                    value={form.ano_referencia}
                    onChange={(e) => setForm({ ...form, ano_referencia: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Mês referência</Label>
                  <Input type="number" min={1} max={12}
                    value={form.mes_referencia}
                    onChange={(e) => setForm({ ...form, mes_referencia: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Eficiência DBO (%)</Label>
                  <Input type="number" min={0} max={100} step="0.01"
                    value={form.eficiencia_dbo_pct}
                    onChange={(e) => setForm({ ...form, eficiencia_dbo_pct: e.target.value })} />
                </div>
                <div>
                  <Label>Vazão média (L/s)</Label>
                  <Input type="number" min={0} step="0.1"
                    value={form.vazao_media_lps}
                    onChange={(e) => setForm({ ...form, vazao_media_lps: e.target.value })} />
                </div>
                <div>
                  <Label>pH médio</Label>
                  <Input type="number" min={0} max={14} step="0.01"
                    value={form.ph_medio}
                    onChange={(e) => setForm({ ...form, ph_medio: e.target.value })} />
                </div>
                <div>
                  <Label>OD médio (mg/L)</Label>
                  <Input type="number" min={0} max={20} step="0.01"
                    value={form.od_medio_mg_l}
                    onChange={(e) => setForm({ ...form, od_medio_mg_l: e.target.value })} />
                </div>
                <div className="md:col-span-3">
                  <Label>Observações</Label>
                  <Textarea rows={2} value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>

              {precheck && (
                <Alert className={precheck.warnings.length ? "border-warning/50" : "border-success/50"}>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>Pré-validação IA · {precheck.warnings.length ? `${precheck.warnings.length} aviso(s)` : "sem avisos"}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPrecheck(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertTitle>
                  <AlertDescription className="space-y-2 mt-2">
                    {precheck.summary && <p className="text-[12px]">{precheck.summary}</p>}
                    {precheck.warnings.length > 0 && (
                      <ul className="list-disc pl-5 text-[12px] space-y-0.5">
                        {precheck.warnings.map((w, i) => <li key={i} className="text-warning-foreground">{w}</li>)}
                      </ul>
                    )}
                    {precheck.recomendacoes.length > 0 && (
                      <div className="text-[12px]">
                        <p className="font-medium flex items-center gap-1 mb-1"><Lightbulb className="h-3 w-3" /> Recomendações</p>
                        <ul className="list-disc pl-5 space-y-0.5">
                          {precheck.recomendacoes.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-end pt-1 flex-wrap">
                <Button variant="ghost" onClick={() => precheckMut.mutate()} disabled={precheckMut.isPending}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {precheckMut.isPending ? "Analisando..." : "Pré-validar com IA"}
                </Button>
                <Button variant="outline" onClick={() => submitMut.mutate("rascunho")} disabled={submitMut.isPending}>
                  Guardar rascunho
                </Button>
                <Button onClick={() => submitMut.mutate("submetido")} disabled={submitMut.isPending}>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Submeter para análise
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card className="elevation-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filtros
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilters(DEFAULT_FILTERS); setPage(0); }}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">UF</Label>
                <Select value={filters.uf} onValueChange={(v) => updateFilter("uf", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {ufs.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado</Label>
                <Select value={filters.estado} onValueChange={(v) => updateFilter("estado", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(Object.keys(ESTADO_META) as Estado[]).map((s) => (
                      <SelectItem key={s} value={s}>{ESTADO_META[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Ano</Label>
                <Select value={filters.ano} onValueChange={(v) => updateFilter("ano", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Mês</Label>
                <Select value={filters.mes} onValueChange={(v) => updateFilter("mes", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {String(i + 1).padStart(2, "0")} · {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Buscar ETE</Label>
                <Input
                  value={filters.busca}
                  onChange={(e) => updateFilter("busca", e.target.value)}
                  placeholder="Código, nome ou município"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de respostas */}
        <Card className="elevation-1">
          <CardHeader>
            <CardTitle className="text-base">Submissões</CardTitle>
            <CardDescription>
              {isLoading
                ? "A carregar..."
                : `${total} registo${total === 1 ? "" : "s"} · página ${page + 1} de ${totalPages}`}
              {isFetching && !isLoading ? " · atualizando..." : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ETE</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>DBO%</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {respostas.map((r) => {
                  const Meta = ESTADO_META[r.estado];
                  const ete = etes.find((e) => e.id === r.ete_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="text-[13px] font-medium">{ete?.codigo ?? r.ete_id.slice(0, 8)}</div>
                        <div className="text-[11px] text-muted-foreground">{ete?.nome}</div>
                      </TableCell>
                      <TableCell className="text-[12px]">{ete?.uf ?? "—"}</TableCell>
                      <TableCell className="text-[12px] tabular-nums">
                        {String(r.mes_referencia).padStart(2, "0")}/{r.ano_referencia}
                      </TableCell>
                      <TableCell>
                        <Badge className={Meta.cls + " font-medium"}>{Meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums">
                        {(r.payload as { eficiencia_dbo_pct?: number })?.eficiencia_dbo_pct ?? "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {isStaff && r.estado === "submetido" && (
                          <Button size="sm" variant="outline"
                            onClick={() => transitionMut.mutate({ resposta_id: r.id, novo_estado: "em_analise" })}>
                            Analisar
                          </Button>
                        )}
                        {isStaff && r.estado === "em_analise" && (
                          <>
                            <Button size="sm"
                              onClick={() => transitionMut.mutate({ resposta_id: r.id, novo_estado: "validado" })}>
                              Validar
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => openRejectDialog(r)}>
                              Rejeitar
                            </Button>
                          </>
                        )}
                        {!isStaff && r.estado === "rejeitado" && (
                          <Button size="sm" variant="outline"
                            onClick={() => transitionMut.mutate({ resposta_id: r.id, novo_estado: "rascunho" })}>
                            Reabrir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {respostas.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      {hasActiveFilters
                        ? "Nenhuma submissão corresponde aos filtros aplicados."
                        : `Sem submissões. ${!isStaff ? "Use o formulário acima para iniciar." : ""}`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Paginação */}
            <div className="flex items-center justify-between p-3 border-t">
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {total === 0 ? "0" : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)}`} de {total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                  disabled={page + 1 >= totalPages || isFetching}
                >
                  Próxima <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Rejeitar submissão
            </DialogTitle>
            <DialogDescription>
              Indique o motivo da rejeição. Esta informação é registada na trilha de auditoria
              e enviada ao operador responsável.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da rejeição</Label>
            <Textarea
              id="motivo"
              rows={5}
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setMotivoError(null); }}
              placeholder="Ex.: Eficiência DBO informada (95%) está fora da faixa típica da tipologia. Reveja os parâmetros laboratoriais e reenvie."
              maxLength={1000}
              aria-invalid={!!motivoError}
            />
            <div className="flex items-center justify-between text-[11px]">
              <span className={motivoError ? "text-destructive" : "text-muted-foreground"}>
                {motivoError ?? "Mínimo de 20 caracteres."}
              </span>
              <span className="text-muted-foreground tabular-nums">{motivo.length}/1000</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={rejecting}>
              {rejecting ? "A rejeitar..." : "Confirmar rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
