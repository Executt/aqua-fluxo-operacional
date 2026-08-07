import { useMemo, useState } from "react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, CheckCircle2, Download, FileSearch, FileText, RefreshCw, Search, X,
} from "lucide-react";
import { downloadCsv, downloadInstitutionalPdf, stamp } from "@/lib/curadoria-export";
import { useAuth } from "@/contexts/AuthContext";
import { useLoteAuditoria } from "@/hooks/use-lote-auditoria";
import { ValidacaoKpiPanel, tempoMedioCompatibilizacao } from "./ValidacaoKpiPanel";
import { alertasHidricos, computeIndicadoresHidricos, fmt } from "@/lib/hidrico";

const motivoSchema = z.string().trim()
  .min(20, "O motivo deve ter pelo menos 20 caracteres para garantir rastreabilidade")
  .max(1000, "O motivo não pode exceder 1000 caracteres");

type Estado = "rascunho" | "submetido" | "em_analise" | "validado" | "rejeitado";

interface Row {
  id: string;
  ete_id: string;
  ano_referencia: number;
  mes_referencia: number;
  estado: Estado;
  payload: Record<string, unknown>;
  submitted_at: string | null;
  created_at: string;
}

interface Ete {
  id: string; codigo: string; nome: string; municipio_nome: string; uf: string;
  vazao_projeto_lps: number | null;
  tipologias_tratamento: { nome: string } | null;
}

/** Regras determinísticas de compatibilidade (não bloqueiam, sinalizam). */
export function checkIncompatibilidades(
  payload: Record<string, unknown>,
  opts: { vazaoProjetoLps?: number | null } = {},
): string[] {
  const out: string[] = [];
  const n = (k: string) => (typeof payload?.[k] === "number" ? (payload[k] as number) : undefined);
  const dbo = n("eficiencia_dbo_pct");
  const ph = n("ph_medio");
  const od = n("od_medio_mg_l");
  const vazao = n("vazao_media_lps");
  if (dbo !== undefined && (dbo < 0 || dbo > 100)) out.push("Eficiência DBO fora de 0–100%");
  if (dbo !== undefined && dbo < 60) out.push("Eficiência DBO abaixo do mínimo típico (60%)");
  if (ph !== undefined && (ph < 5 || ph > 9)) out.push("pH fora da faixa CONAMA 357 (5–9)");
  if (od !== undefined && od < 2) out.push("OD abaixo de 2 mg/L");
  if (vazao !== undefined && vazao <= 0) out.push("Vazão média deve ser maior que zero");
  if (dbo === undefined && vazao === undefined) out.push("Sem parâmetros quantitativos informados");
  out.push(...alertasHidricos(payload, opts));
  return Array.from(new Set(out));
}

const origemDe = (payload: Record<string, unknown>): "lote" | "manual" | "api" => {
  const o = payload?.["_origem"];
  return o === "lote" || o === "api" ? o : "manual";
};

const PERIODOS = [
  { v: "todos", label: "Todo o período" },
  { v: "7", label: "Últimos 7 dias" },
  { v: "30", label: "Últimos 30 dias" },
  { v: "90", label: "Últimos 90 dias" },
];

export function ValidacoesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, roles } = useAuth();
  const { data: auditoriaRows = [] } = useLoteAuditoria();
  const [busca, setBusca] = useState("");
  const [fEstado, setFEstado] = useState<"todos" | "submetido" | "em_analise">("todos");
  const [fResultado, setFResultado] = useState<"todos" | "compativel" | "incompativel">("todos");
  const [fOrigem, setFOrigem] = useState<"todos" | "lote" | "manual" | "api">("todos");
  const [fTipologia, setFTipologia] = useState("todos");
  const [fPeriodo, setFPeriodo] = useState("todos");
  const [rejectTarget, setRejectTarget] = useState<Row | null>(null);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);

  const { data: etes = [] } = useQuery({
    queryKey: ["etes-curadoria-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etes_curadoria")
        .select("id, codigo, nome, municipio_nome, uf, vazao_projeto_lps, tipologias_tratamento(nome)")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Ete[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["curadoria-fila-validacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formulario_respostas")
        .select("*")
        .in("estado", ["submetido", "em_analise"])
        .order("submitted_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const transition = useMutation({
    mutationFn: async (v: { resposta_id: string; novo_estado: Estado; motivo?: string }) => {
      const { error } = await supabase.functions.invoke("curadoria-transition", {
        body: { resposta_id: v.resposta_id, novo_estado: v.novo_estado, motivo_rejeicao: v.motivo },
      });
      if (error) throw error;
      return v.novo_estado;
    },
    onSuccess: (estado) => {
      toast({ title: `Submissão ${estado}` });
      qc.invalidateQueries({ queryKey: ["curadoria-fila-validacao"] });
      qc.invalidateQueries({ queryKey: ["respostas"] });
      qc.invalidateQueries({ queryKey: ["respostas-kpis"] });
    },
    onError: (e: Error) => toast({ title: "Falha", description: e.message, variant: "destructive" }),
  });

  const tipologias = useMemo(
    () => Array.from(new Set(etes.map((e) => e.tipologias_tratamento?.nome).filter(Boolean) as string[])).sort(),
    [etes],
  );

  const enriched = useMemo(() => {
    return rows.map((r) => {
      const ete = etes.find((x) => x.id === r.ete_id);
      const issues = checkIncompatibilidades(r.payload || {}, { vazaoProjetoLps: ete?.vazao_projeto_lps });
      const ind = computeIndicadoresHidricos(r.payload || {}, { vazaoProjetoLps: ete?.vazao_projeto_lps });
      return { r, ete, issues, ind, origem: origemDe(r.payload || {}) };
    });
  }, [rows, etes]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const limite = fPeriodo === "todos" ? null : Date.now() - Number(fPeriodo) * 86_400_000;
    return enriched.filter(({ r, ete, issues, origem }) => {
      if (q && !`${ete?.codigo} ${ete?.nome} ${ete?.municipio_nome} ${ete?.uf}`.toLowerCase().includes(q)) return false;
      if (fEstado !== "todos" && r.estado !== fEstado) return false;
      if (fResultado === "compativel" && issues.length > 0) return false;
      if (fResultado === "incompativel" && issues.length === 0) return false;
      if (fOrigem !== "todos" && origem !== fOrigem) return false;
      if (fTipologia !== "todos" && ete?.tipologias_tratamento?.nome !== fTipologia) return false;
      if (limite) {
        const t = new Date(r.submitted_at ?? r.created_at).getTime();
        if (!Number.isFinite(t) || t < limite) return false;
      }
      return true;
    });
  }, [enriched, busca, fEstado, fResultado, fOrigem, fTipologia, fPeriodo]);

  const resumo = useMemo(() => ({
    total: filtered.length,
    compativeis: filtered.filter((f) => f.issues.length === 0).length,
    incompativeis: filtered.filter((f) => f.issues.length > 0).length,
    conama430: filtered.filter((f) => f.ind.atendeConama430 === false).length,
    sobrecarga: filtered.filter((f) => (f.ind.utilizacaoCapacidadePct ?? 0) > 100).length,
    cargaRemanescente: filtered.reduce((s, f) => s + (f.ind.cargaRemanescenteKgDia ?? 0), 0),
  }), [filtered]);

  const kpiData = useMemo(() => {
    const motivos = new Map<string, number>();
    const modelos = new Map<string, { compativel: number; incompativel: number }>();
    const origens = new Map<string, number>();
    for (const f of filtered) {
      for (const m of f.issues) motivos.set(m, (motivos.get(m) ?? 0) + 1);
      const nome = f.ete?.tipologias_tratamento?.nome ?? "Sem tipologia";
      const acc = modelos.get(nome) ?? { compativel: 0, incompativel: 0 };
      if (f.issues.length) acc.incompativel++; else acc.compativel++;
      modelos.set(nome, acc);
      origens.set(f.origem, (origens.get(f.origem) ?? 0) + 1);
    }
    return {
      total: resumo.total,
      compativeis: resumo.compativeis,
      incompativeis: resumo.incompativeis,
      motivos: [...motivos.entries()].map(([motivo, qtd]) => ({ motivo, qtd })).sort((a, b) => b.qtd - a.qtd),
      porModelo: [...modelos.entries()].map(([nome, v]) => ({ nome, ...v })),
      porOrigem: [...origens.entries()].map(([nome, qtd]) => ({ nome, qtd })),
      ...tempoMedioCompatibilizacao(auditoriaRows),
    };
  }, [filtered, resumo, auditoriaRows]);

  const filtrosAtivos =
    busca || fEstado !== "todos" || fResultado !== "todos" || fOrigem !== "todos" ||
    fTipologia !== "todos" || fPeriodo !== "todos";

  const limparFiltros = () => {
    setBusca(""); setFEstado("todos"); setFResultado("todos");
    setFOrigem("todos"); setFTipologia("todos"); setFPeriodo("todos");
  };

  const HEADERS = [
    "ETE", "Nome", "Município/UF", "Tipologia", "Origem", "Período", "Estado",
    "Resultado", "Incompatibilidades", "Vazão (L/s)", "Ef. DBO (%)",
    "DBO efluente est. (mg/L)", "Carga remanescente (kg DBO/dia)", "Uso da capacidade (%)", "CONAMA 430",
  ];

  const exportRows = () => filtered.map(({ r, ete, issues, ind, origem }) => [
    ete?.codigo ?? r.ete_id.slice(0, 8),
    ete?.nome ?? "",
    ete ? `${ete.municipio_nome}/${ete.uf}` : "",
    ete?.tipologias_tratamento?.nome ?? "",
    origem,
    `${String(r.mes_referencia).padStart(2, "0")}/${r.ano_referencia}`,
    r.estado,
    issues.length ? "Incompatível" : "Compatível",
    issues.join(" | "),
    fmt(typeof r.payload?.vazao_media_lps === "number" ? (r.payload.vazao_media_lps as number) : undefined),
    fmt(typeof r.payload?.eficiencia_dbo_pct === "number" ? (r.payload.eficiencia_dbo_pct as number) : undefined),
    fmt(ind.dboEfluenteEstimadoMgL, 0),
    fmt(ind.cargaRemanescenteKgDia, 1),
    fmt(ind.utilizacaoCapacidadePct, 0),
    ind.atendeConama430 === undefined ? "—" : ind.atendeConama430 ? "Atende" : "Não atende",
  ]);

  const exportarCsv = () => {
    if (!filtered.length) return toast({ title: "Nada a exportar", variant: "destructive" });
    downloadCsv(`validacoes-curadoria-${stamp()}.csv`, HEADERS, exportRows());
    toast({ title: "CSV gerado", description: `${filtered.length} registo(s) exportado(s).` });
  };

  const [assinaturaOpen, setAssinaturaOpen] = useState(false);
  const [signNome, setSignNome] = useState("");
  const [signCargo, setSignCargo] = useState(localStorage.getItem("curadoria.assinatura.cargo") ?? "");

  const abrirAssinatura = () => {
    if (!filtered.length) return toast({ title: "Nada a exportar", variant: "destructive" });
    setSignNome(signNome || user?.email?.split("@")[0] || "");
    setAssinaturaOpen(true);
  };

  const exportarPdf = () => {
    if (!filtered.length) return toast({ title: "Nada a exportar", variant: "destructive" });
    localStorage.setItem("curadoria.assinatura.cargo", signCargo);

    const incompativeis = filtered.filter((f) => f.issues.length > 0);
    const protocolo = downloadInstitutionalPdf({
      filename: `validacoes-curadoria-${stamp()}.pdf`,
      title: "Relatório de Validações — Curadoria Nacional de Saneamento",
      subtitle: filtrosAtivos ? "Recorte filtrado da fila de validação" : "Fila completa de validação",
      summary: [
        { label: "Submissões", value: resumo.total },
        { label: "Compatíveis", value: resumo.compativeis },
        { label: "Incompatíveis", value: resumo.incompativeis },
        { label: "Taxa de compatibilidade", value: `${kpiData.total ? ((resumo.compativeis / resumo.total) * 100).toFixed(1) : "0.0"}%` },
        { label: "Fora do CONAMA 430", value: resumo.conama430 },
        { label: "Sobrecarga hidráulica", value: resumo.sobrecarga },
        { label: "Carga remanescente (kg DBO/dia)", value: fmt(resumo.cargaRemanescente, 1) },
      ],
      notes: [
        "DBO efluente estimada a partir de DBO afluente típica de 300 mg/L (Atlas Esgotos/ANA) quando não informada.",
        "CONAMA 430/2011 art. 21: conformidade com DBO ≤ 120 mg/L ou remoção mínima de 60%.",
        "Validação é sempre manual — este relatório não ativa nem submete registos.",
      ],
      secoes: [
        {
          titulo: "Fila de validação (detalhe por submissão)",
          descricao: "Indicadores hídricos calculados por submissão e respetivas incompatibilidades.",
          headers: HEADERS,
          rows: exportRows(),
        },
        {
          titulo: "Motivos de incompatibilidade",
          descricao: "Ocorrências agregadas no recorte apresentado.",
          headers: ["Motivo", "Ocorrências", "% das incompatibilidades"],
          rows: kpiData.motivos.map((m) => [
            m.motivo, m.qtd,
            incompativeis.length ? `${((m.qtd / incompativeis.length) * 100).toFixed(1)}%` : "—",
          ]),
        },
        {
          titulo: "Distribuição por tipologia e origem",
          headers: ["Agrupamento", "Compatíveis", "Incompatíveis"],
          rows: [
            ...kpiData.porModelo.map((m) => [m.nome, m.compativel, m.incompativel]),
            ...kpiData.porOrigem.map((o) => [`Origem: ${o.nome}`, o.qtd, ""]),
          ],
        },
      ],
      assinatura: {
        nome: signNome || user?.email || "Responsável não identificado",
        cargo: signCargo || undefined,
        email: user?.email ?? undefined,
        papel: roles?.join(", "),
      },
    });
    setAssinaturaOpen(false);
    toast({ title: "PDF assinado gerado", description: `Protocolo ${protocolo} · ${filtered.length} registo(s).` });
  };

  async function confirmReject() {
    const parsed = motivoSchema.safeParse(motivo);
    if (!parsed.success) { setMotivoError(parsed.error.issues[0].message); return; }
    if (!rejectTarget) return;
    await transition.mutateAsync({ resposta_id: rejectTarget.id, novo_estado: "rejeitado", motivo: parsed.data });
    setRejectTarget(null);
    setMotivo("");
  }

  return (
    <>
      <Card className="elevation-1">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-primary" /> Fila de validação
              </CardTitle>
              <CardDescription>
                Submissões aguardando análise. Incompatibilidades são sinalizadas — a validação nunca é automática.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportarCsv}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={abrirAssinatura}>
                <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="h-9 pl-8 w-56 text-[12px]" placeholder="Buscar ETE, município, UF..."
                value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Select value={fEstado} onValueChange={(v) => setFEstado(v as typeof fEstado)}>
              <SelectTrigger className="h-9 w-[150px] text-[12px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os estados</SelectItem>
                <SelectItem value="submetido">Submetido</SelectItem>
                <SelectItem value="em_analise">Em análise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fResultado} onValueChange={(v) => setFResultado(v as typeof fResultado)}>
              <SelectTrigger className="h-9 w-[160px] text-[12px]"><SelectValue placeholder="Resultado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Compatível + incompatível</SelectItem>
                <SelectItem value="compativel">Somente compatíveis</SelectItem>
                <SelectItem value="incompativel">Somente incompatíveis</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fOrigem} onValueChange={(v) => setFOrigem(v as typeof fOrigem)}>
              <SelectTrigger className="h-9 w-[150px] text-[12px]"><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as origens</SelectItem>
                <SelectItem value="manual">Formulário manual</SelectItem>
                <SelectItem value="lote">Importação em lote</SelectItem>
                <SelectItem value="api">API / integração</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fTipologia} onValueChange={setFTipologia}>
              <SelectTrigger className="h-9 w-[180px] text-[12px]"><SelectValue placeholder="Tipologia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as tipologias</SelectItem>
                {tipologias.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fPeriodo} onValueChange={setFPeriodo}>
              <SelectTrigger className="h-9 w-[150px] text-[12px]"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {filtrosAtivos && (
              <Button variant="ghost" size="sm" onClick={limparFiltros}>
                <X className="h-3.5 w-3.5 mr-1" /> Limpar
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-3">
            <Badge variant="outline">{resumo.total} na fila</Badge>
            <Badge className="bg-success/15 text-success">{resumo.compativeis} compatíveis</Badge>
            <Badge className="bg-warning/15 text-warning">{resumo.incompativeis} com incompatibilidade</Badge>
            <Badge className="bg-destructive/15 text-destructive">{resumo.conama430} fora do CONAMA 430</Badge>
            <Badge variant="outline">{fmt(resumo.cargaRemanescente, 0)} kg DBO/dia remanescentes</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ETE</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Validação técnica</TableHead>
                <TableHead>Indicadores hídricos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))}
              {!isLoading && filtered.map(({ r, ete, issues, ind, origem }) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-[13px] font-medium">{ete?.codigo ?? r.ete_id.slice(0, 8)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {ete?.nome} · {ete?.municipio_nome}/{ete?.uf}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {ete?.tipologias_tratamento?.nome ?? "sem tipologia"} · origem: {origem}
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] tabular-nums">
                    {String(r.mes_referencia).padStart(2, "0")}/{r.ano_referencia}
                  </TableCell>
                  <TableCell>
                    <Badge className={r.estado === "submetido" ? "bg-info/15 text-info" : "bg-warning/15 text-warning"}>
                      {r.estado === "submetido" ? "Submetido" : "Em análise"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {issues.length === 0 ? (
                      <span className="text-[11px] text-success inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Compatível
                      </span>
                    ) : (
                      <ul className="text-[11px] text-warning space-y-0.5">
                        {issues.map((i, k) => (
                          <li key={k} className="inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> {i}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="text-[11px] tabular-nums text-muted-foreground">
                    <div>DBO efl. est.: {fmt(ind.dboEfluenteEstimadoMgL, 0)} mg/L</div>
                    <div>Carga remanesc.: {fmt(ind.cargaRemanescenteKgDia, 1)} kg/dia</div>
                    <div>Uso capacidade: {fmt(ind.utilizacaoCapacidadePct, 0)}%</div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {r.estado === "submetido" && (
                      <Button size="sm" variant="outline" disabled={transition.isPending}
                        onClick={() => transition.mutate({ resposta_id: r.id, novo_estado: "em_analise" })}>
                        Analisar
                      </Button>
                    )}
                    {r.estado === "em_analise" && (
                      <>
                        <Button size="sm" disabled={transition.isPending}
                          onClick={() => transition.mutate({ resposta_id: r.id, novo_estado: "validado" })}>
                          Validar
                        </Button>
                        <Button size="sm" variant="destructive"
                          onClick={() => { setRejectTarget(r); setMotivo(""); setMotivoError(null); }}>
                          Rejeitar
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    {filtrosAtivos ? "Nenhuma submissão para os filtros aplicados." : "Nenhuma submissão aguardando validação."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-6">
        <ValidacaoKpiPanel data={kpiData} titulo="Validações" />
      </div>



      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Rejeitar submissão
            </DialogTitle>
            <DialogDescription>
              O motivo é registado na trilha de auditoria e devolvido ao operador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-val">Motivo da rejeição</Label>
            <Textarea id="motivo-val" rows={5} maxLength={1000} value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setMotivoError(null); }} />
            <div className="flex items-center justify-between text-[11px]">
              <span className={motivoError ? "text-destructive" : "text-muted-foreground"}>
                {motivoError ?? "Mínimo de 20 caracteres."}
              </span>
              <span className="text-muted-foreground tabular-nums">{motivo.length}/1000</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={transition.isPending}>
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assinaturaOpen} onOpenChange={setAssinaturaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assinatura eletrónica do relatório</DialogTitle>
            <DialogDescription>
              O relatório institucional é emitido com protocolo, sumário, numeração de páginas e assinatura
              eletrónica simples (MP 2.200-2/2001) do responsável identificado abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sign-nome">Nome do responsável</Label>
              <Input id="sign-nome" value={signNome} onChange={(e) => setSignNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sign-cargo">Cargo / função</Label>
              <Input id="sign-cargo" value={signCargo} placeholder="Ex.: Analista de Curadoria — ANA"
                onChange={(e) => setSignCargo(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              E-mail autenticado: {user?.email ?? "—"} · Papéis: {roles?.join(", ") || "—"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssinaturaOpen(false)}>Cancelar</Button>
            <Button onClick={exportarPdf} disabled={signNome.trim().length < 3}>Assinar e gerar PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
