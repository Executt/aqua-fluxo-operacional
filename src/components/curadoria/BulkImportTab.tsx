import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, FileUp, History, RotateCcw, Search,
  Trash2, Upload, X, XCircle,
} from "lucide-react";
import { checkIncompatibilidades } from "./ValidacoesTab";
import { downloadCsv, downloadPdf, stamp } from "@/lib/curadoria-export";
import { downloadXlsx } from "@/lib/xlsx-export";
import { computeIndicadoresHidricos, fmt } from "@/lib/hidrico";
import { useBulkBatches, type BulkBatch } from "@/hooks/use-bulk-batches";
import { logLoteEventos } from "@/lib/lote-auditoria";
import { useLoteAuditoria } from "@/hooks/use-lote-auditoria";
import { useCompatNotifications } from "@/hooks/use-compat-notifications";
import { ValidacaoKpiPanel, tempoMedioCompatibilizacao } from "./ValidacaoKpiPanel";
import { LoteAuditoriaPanel } from "./LoteAuditoriaPanel";


interface Ete { id: string; codigo: string; nome: string; uf: string; vazao_projeto_lps: number | null }

interface ParsedRow {
  idx: number;
  linha: string;
  codigo: string;
  uf: string;
  ete_id: string | null;
  ano_referencia: number;
  mes_referencia: number;
  payload: Record<string, number | string>;
  errors: string[];
  warnings: string[];
  indicadores: ReturnType<typeof computeIndicadoresHidricos>;
}

const TEMPLATE = `codigo,ano,mes,eficiencia_dbo_pct,vazao_media_lps,ph_medio,od_medio_mg_l
ETE-001,2026,7,78.5,120.4,7.1,4.2`;

const CAMPOS = ["eficiencia_dbo_pct", "vazao_media_lps", "ph_medio", "od_medio_mg_l", "dbo_afluente_mg_l"];

function headerLine(text: string): string {
  return text.trim().split(/\r?\n/)[0] ?? "codigo,ano,mes,eficiencia_dbo_pct,vazao_media_lps,ph_medio,od_medio_mg_l";
}

function parseCsv(text: string, etes: Ete[]): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
  const col = (n: string) => header.indexOf(n);

  return lines.slice(1).map((line, i) => {
    const cells = line.split(/[,;]/).map((c) => c.trim());
    const get = (n: string) => { const c = col(n); return c >= 0 ? cells[c] : ""; };
    const codigo = get("codigo");
    const ete = etes.find((e) => e.codigo.toLowerCase() === codigo.toLowerCase());
    const ano = Number(get("ano"));
    const mes = Number(get("mes"));

    const payload: Record<string, number | string> = {};
    for (const k of CAMPOS) {
      const v = get(k);
      if (v !== "" && !Number.isNaN(Number(v))) payload[k] = Number(v);
    }

    const errors: string[] = [];
    if (!codigo) errors.push("Código da ETE ausente");
    else if (!ete) errors.push(`ETE "${codigo}" não encontrada / fora do seu operador`);
    if (!Number.isInteger(ano) || ano < 2000) errors.push("Ano inválido");
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) errors.push("Mês inválido");
    if (Object.keys(payload).length === 0) errors.push("Nenhum parâmetro numérico válido");

    const opts = { vazaoProjetoLps: ete?.vazao_projeto_lps };
    return {
      idx: i + 1, linha: line, codigo, uf: ete?.uf ?? "", ete_id: ete?.id ?? null,
      ano_referencia: ano, mes_referencia: mes, payload,
      errors,
      warnings: errors.length ? [] : checkIncompatibilidades(payload, opts),
      indicadores: computeIndicadoresHidricos(payload, opts),
    };
  });
}

const statusDe = (r: ParsedRow) =>
  r.errors.length ? "invalida" : r.warnings.length ? "incompativel" : "compativel";

export function BulkImportTab() {
  const { toast } = useToast();
  const { operadorId } = useAuth();
  const qc = useQueryClient();
  const { batches, addBatch, updateBatch, removeBatch, clear } = useBulkBatches();

  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [origem, setOrigem] = useState<"colado" | "arquivo" | "reenfileiramento">("colado");
  const [nomeArquivo, setNomeArquivo] = useState<string | undefined>();
  const [reenfileirandoDe, setReenfileirandoDe] = useState<string | null>(null);
  const [loteId, setLoteId] = useState<string>(() => crypto.randomUUID());
  const [loteParenteId, setLoteParenteId] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(1);
  const { data: auditoriaRows = [] } = useLoteAuditoria();
  useCompatNotifications(auditoriaRows);


  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState<"todos" | "compativel" | "incompativel" | "invalida">("todos");
  const [fUf, setFUf] = useState("todos");
  const [fAno, setFAno] = useState("todos");
  const [fMes, setFMes] = useState("todos");

  const { data: etes = [] } = useQuery({
    queryKey: ["etes-curadoria-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etes_curadoria")
        .select("id, codigo, nome, uf, vazao_projeto_lps")
        .order("codigo");
      if (error) throw error;
      return (data ?? []) as Ete[];
    },
    staleTime: 5 * 60_000,
  });

  const stats = useMemo(() => {
    const rows = parsed ?? [];
    return {
      total: rows.length,
      invalidas: rows.filter((r) => r.errors.length > 0).length,
      incompativeis: rows.filter((r) => !r.errors.length && r.warnings.length > 0).length,
      ok: rows.filter((r) => !r.errors.length && !r.warnings.length).length,
      cargaRemanescente: rows.reduce((s, r) => s + (r.indicadores.cargaRemanescenteKgDia ?? 0), 0),
      foraConama: rows.filter((r) => r.indicadores.atendeConama430 === false).length,
    };
  }, [parsed]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (parsed ?? []).filter((r) => {
      if (q && !r.codigo.toLowerCase().includes(q)) return false;
      if (fStatus !== "todos" && statusDe(r) !== fStatus) return false;
      if (fUf !== "todos" && r.uf !== fUf) return false;
      if (fAno !== "todos" && String(r.ano_referencia) !== fAno) return false;
      if (fMes !== "todos" && String(r.mes_referencia) !== fMes) return false;
      return true;
    });
  }, [parsed, busca, fStatus, fUf, fAno, fMes]);

  const ufs = useMemo(() => Array.from(new Set((parsed ?? []).map((r) => r.uf).filter(Boolean))).sort(), [parsed]);
  const anos = useMemo(
    () => Array.from(new Set((parsed ?? []).map((r) => r.ano_referencia).filter((a) => Number.isFinite(a)))).sort(),
    [parsed],
  );
  const filtrosAtivos = busca || fStatus !== "todos" || fUf !== "todos" || fAno !== "todos" || fMes !== "todos";
  const limparFiltros = () => { setBusca(""); setFStatus("todos"); setFUf("todos"); setFAno("todos"); setFMes("todos"); };

  /** Regista na trilha os eventos por linha de um lote. */
  const registarEventos = (
    rows: ParsedRow[],
    evento: "validacao" | "importacao" | "reenfileiramento" | "falha",
    modo: "submeter" | "rascunho" | null,
    extra?: { detalhe?: string | null; resultadoOverride?: string },
  ) => {
    logLoteEventos(
      rows.slice(0, 400).map((r) => ({
        lote_id: loteId,
        lote_pai_id: loteParenteId,
        tentativa,
        evento,
        modo,
        origem,
        nome_arquivo: nomeArquivo ?? null,
        operador_id: operadorId ?? null,
        ete_id: r.ete_id ?? null,
        ete_codigo: r.codigo || null,
        uf: r.uf || null,
        ano_referencia: Number.isFinite(r.ano_referencia) ? r.ano_referencia : null,
        mes_referencia: Number.isFinite(r.mes_referencia) ? r.mes_referencia : null,
        resultado:
          extra?.resultadoOverride ??
          (r.errors.length ? "invalida" : r.warnings.length ? "incompativel" : "compativel"),
        motivos: [...r.errors, ...r.warnings],
        detalhe: extra?.detalhe ?? null,
        duracao_ms: null,
      })),
    );
  };

  const validar = () => {
    const rows = parseCsv(raw, etes);
    if (rows.length === 0) {
      toast({ title: "Nada a validar", description: "Cole um CSV com cabeçalho e ao menos uma linha.", variant: "destructive" });
      return;
    }
    setParsed(rows);
    registarEventos(rows, "validacao", null);
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setRaw(text);
    setOrigem("arquivo");
    setNomeArquivo(file.name);
    setReenfileirandoDe(null);
    setLoteParenteId(null);
    setLoteId(crypto.randomUUID());
    setTentativa(1);
    setParsed(parseCsv(text, etes));
  };

  const HEADERS = [
    "#", "ETE", "UF", "Período", "Status", "Ocorrências", "Destino",
    "Vazão (L/s)", "Ef. DBO (%)", "DBO efluente est. (mg/L)",
    "Carga remanescente (kg DBO/dia)", "Uso da capacidade (%)", "CONAMA 430",
  ];

  const exportRows = (rows: ParsedRow[]) => rows.map((r) => [
    r.idx, r.codigo || "—", r.uf || "—",
    `${Number.isFinite(r.mes_referencia) ? String(r.mes_referencia).padStart(2, "0") : "??"}/${r.ano_referencia || "????"}`,
    r.errors.length ? "Inválida" : r.warnings.length ? "Incompatível" : "Compatível",
    [...r.errors, ...r.warnings].join(" | "),
    r.errors.length ? "Ignorada" : r.warnings.length ? "Rascunho (retida)" : "Submissão",
    fmt(r.payload.vazao_media_lps as number | undefined),
    fmt(r.payload.eficiencia_dbo_pct as number | undefined),
    fmt(r.indicadores.dboEfluenteEstimadoMgL, 0),
    fmt(r.indicadores.cargaRemanescenteKgDia, 1),
    fmt(r.indicadores.utilizacaoCapacidadePct, 0),
    r.indicadores.atendeConama430 === undefined ? "—" : r.indicadores.atendeConama430 ? "Atende" : "Não atende",
  ]);

  const exportarCsv = () => {
    if (!filtradas.length) return toast({ title: "Nada a exportar", variant: "destructive" });
    downloadCsv(`pre-validacao-lote-${stamp()}.csv`, HEADERS, exportRows(filtradas));
    toast({ title: "CSV gerado", description: `${filtradas.length} linha(s) exportada(s).` });
  };

  const exportarXlsx = () => {
    if (!filtradas.length) return toast({ title: "Nada a exportar", variant: "destructive" });
    downloadXlsx(`pre-validacao-lote-${stamp()}.xlsx`, [
      {
        nome: "Estatísticas",
        headers: ["Indicador", "Valor"],
        rows: [
          ["Linhas do lote", stats.total],
          ["Linhas no recorte filtrado", filtradas.length],
          ["Compatíveis", stats.ok],
          ["Incompatíveis (rascunho)", stats.incompativeis],
          ["Inválidas", stats.invalidas],
          ["Fora do CONAMA 430", stats.foraConama],
          ["Carga remanescente (kg DBO/dia)", Number(stats.cargaRemanescente.toFixed(1))],
          ["Tempo médio até compatibilizar (h)", kpiData.tempoMedioHoras === null ? "—" : Number(kpiData.tempoMedioHoras.toFixed(1))],
          ["Casos reenfileirados e compatibilizados", kpiData.amostraTempo],
          ["Origem", origem], ["Ficheiro", nomeArquivo ?? "—"],
          ["Lote", loteId], ["Tentativa", tentativa],
          ["Status", fStatus], ["UF", fUf], ["Ano", fAno], ["Mês", fMes], ["Busca", busca || "—"],
        ],
      },
      { nome: "Linhas filtradas", headers: HEADERS, rows: exportRows(filtradas) },
      {
        nome: "Motivos",
        headers: ["Motivo", "Ocorrências"],
        rows: kpiData.motivos.map((m) => [m.motivo, m.qtd]),
      },
      {
        nome: "Por UF",
        headers: ["UF", "Compatíveis", "Incompatíveis"],
        rows: kpiData.porModelo.map((m) => [m.nome, m.compativel, m.incompativel]),
      },
      {
        nome: "Por origem",
        headers: ["Origem", "Linhas"],
        rows: kpiData.porOrigem.map((o) => [o.nome, o.qtd]),
      },
      {
        nome: "Histórico de lotes",
        headers: ["Criado em", "Modo", "Origem", "Ficheiro", "Total", "Importadas", "Rascunho", "Inválidas", "Status", "Tentativa", "Lote"],
        rows: batches.map((b) => [
          new Date(b.criadoEm).toLocaleString("pt-BR"), b.modo, b.origem, b.nomeArquivo ?? "—",
          b.total, b.importadas, b.retidas, b.invalidas, b.status, b.tentativas, b.loteId ?? "—",
        ]),
      },
    ]);
    toast({ title: "XLSX gerado", description: `${filtradas.length} linha(s) e estatísticas exportadas.` });
  };


  const exportarPdf = () => {
    if (!filtradas.length) return toast({ title: "Nada a exportar", variant: "destructive" });
    downloadPdf({
      filename: `pre-validacao-lote-${stamp()}.pdf`,
      title: "Relatório de pré-validação do lote — Curadoria Nacional de Saneamento",
      subtitle: nomeArquivo ? `Fonte: ${nomeArquivo}` : "Fonte: conteúdo colado",
      summary: [
        { label: "Linhas", value: stats.total },
        { label: "Compatíveis", value: stats.ok },
        { label: "Incompatíveis", value: stats.incompativeis },
        { label: "Inválidas", value: stats.invalidas },
        { label: "Fora do CONAMA 430", value: stats.foraConama },
        { label: "Carga remanescente (kg DBO/dia)", value: fmt(stats.cargaRemanescente, 1) },
      ],
      notes: [
        "Linhas incompatíveis são importadas exclusivamente como rascunho — nunca submetidas automaticamente.",
        "DBO afluente assumida em 300 mg/L (Atlas Esgotos/ANA) quando a coluna dbo_afluente_mg_l não é informada.",
      ],
      headers: HEADERS,
      rows: exportRows(filtradas),
    });
    toast({ title: "PDF gerado", description: `${filtradas.length} linha(s) no relatório.` });
  };

  const importar = useMutation({
    mutationFn: async (modo: "submeter" | "rascunho") => {
      if (!operadorId) throw new Error("Utilizador sem operador associado");
      const all = parsed ?? [];
      const rows = all.filter((r) => r.errors.length === 0);
      if (rows.length === 0) throw new Error("Nenhuma linha válida para importar");
      const t0 = performance.now();

      // Regra: linhas com incompatibilidade NUNCA são submetidas automaticamente.
      const respostas = rows.map((r) => ({
        ete_id: r.ete_id!,
        ano_referencia: r.ano_referencia,
        mes_referencia: r.mes_referencia,
        payload: { ...r.payload, _origem: "lote", _lote_id: loteId },
        estado: (modo === "submeter" && r.warnings.length === 0 ? "submetido" : "rascunho") as
          "submetido" | "rascunho",
      }));

      const { data, error } = await supabase.functions.invoke("curadoria-bulk-insert", {
        body: { operador_id: operadorId, respostas },
      });
      if (error) throw error;

      const retidas = respostas.filter((r) => r.estado === "rascunho").length;
      const invalidas = all.filter((r) => r.errors.length > 0);
      const csvPendente = invalidas.length
        ? [headerLine(raw), ...invalidas.map((r) => r.linha)].join("\n")
        : undefined;

      // trilha: resultado final por linha
      logLoteEventos(
        all.slice(0, 400).map((r) => ({
          lote_id: loteId,
          lote_pai_id: loteParenteId,
          tentativa,
          evento: reenfileirandoDe ? ("reenfileiramento" as const) : ("importacao" as const),
          modo,
          origem,
          nome_arquivo: nomeArquivo ?? null,
          operador_id: operadorId ?? null,
          ete_id: r.ete_id ?? null,
          ete_codigo: r.codigo || null,
          uf: r.uf || null,
          ano_referencia: Number.isFinite(r.ano_referencia) ? r.ano_referencia : null,
          mes_referencia: Number.isFinite(r.mes_referencia) ? r.mes_referencia : null,
          resultado: r.errors.length ? "invalida" : r.warnings.length ? "rascunho" : "importada",
          motivos: [...r.errors, ...r.warnings],
          detalhe: null,
          duracao_ms: Math.round(performance.now() - t0),
        })),
      );

      return {
        inserted: (data as { inserted?: number } | null)?.inserted ?? respostas.length,
        retidas, modo, total: all.length, invalidas: invalidas.length, csvPendente,
      };
    },
    onSuccess: ({ inserted, retidas, modo, total, invalidas, csvPendente }) => {
      addBatch({
        modo, origem, nomeArquivo,
        total, importadas: inserted, retidas, invalidas,
        status: invalidas > 0 ? "parcial" : "concluido",
        loteId,
        csvPendente,
        paiId: reenfileirandoDe ?? undefined,
      });
      if (reenfileirandoDe) updateBatch(reenfileirandoDe, { status: "reenfileirado" });
      setReenfileirandoDe(null);
      setLoteParenteId(loteId);
      setLoteId(crypto.randomUUID());
      toast({
        title: `${inserted} registo(s) importado(s)`,
        description: [
          retidas ? `${retidas} ficaram como rascunho por incompatibilidade.` : "Todas as linhas passaram na validação técnica.",
          invalidas ? `${invalidas} linha(s) inválida(s) ficaram pendentes — reenfileire após corrigir.` : "",
        ].filter(Boolean).join(" "),
      });
      qc.invalidateQueries({ queryKey: ["respostas"] });
      qc.invalidateQueries({ queryKey: ["respostas-kpis"] });
      qc.invalidateQueries({ queryKey: ["curadoria-fila-validacao"] });
      qc.invalidateQueries({ queryKey: ["curadoria-lote-auditoria"] });
    },
    onError: (e: Error, modo) => {
      addBatch({
        modo, origem, nomeArquivo,
        total: parsed?.length ?? 0, importadas: 0, retidas: 0,
        invalidas: parsed?.filter((r) => r.errors.length > 0).length ?? 0,
        status: "falha", erro: e.message,
        loteId,
        csvPendente: raw.trim() || undefined,
        paiId: reenfileirandoDe ?? undefined,
      });
      logLoteEventos([{
        lote_id: loteId, lote_pai_id: loteParenteId, tentativa, evento: "falha", modo,
        origem, nome_arquivo: nomeArquivo ?? null, operador_id: operadorId ?? null,
        ete_id: null, ete_codigo: null, uf: null, ano_referencia: null, mes_referencia: null,
        resultado: "falha", motivos: [e.message], detalhe: e.message, duracao_ms: null,
      }]);
      qc.invalidateQueries({ queryKey: ["curadoria-lote-auditoria"] });
      toast({ title: "Falha na importação", description: e.message, variant: "destructive" });
    },
  });

  const reenfileirar = (b: BulkBatch, auto: boolean) => {
    if (!b.csvPendente) return;
    const rows = parseCsv(b.csvPendente, etes);
    setRaw(b.csvPendente);
    setParsed(rows);
    setOrigem("reenfileiramento");
    setNomeArquivo(b.nomeArquivo);
    setReenfileirandoDe(b.id);
    setLoteParenteId(b.loteId ?? null);
    setLoteId(crypto.randomUUID());
    setTentativa((b.tentativas ?? 1) + 1);
    limparFiltros();
    const validas = rows.filter((r) => r.errors.length === 0).length;
    if (auto && validas > 0) {
      importar.mutate(b.modo);
      return;
    }
    toast({
      title: auto ? "Nada a reenviar automaticamente" : "Lote recarregado",
      description: validas > 0
        ? `${validas} de ${rows.length} linha(s) prontas para nova tentativa.`
        : "Todas as linhas continuam inválidas — corrija o repositório/base antes de tentar novamente.",
      variant: auto && validas === 0 ? "destructive" : undefined,
    });
  };

  const statusBadge = (s: BulkBatch["status"]) => ({
    concluido: "bg-success/15 text-success",
    parcial: "bg-warning/15 text-warning",
    falha: "bg-destructive/15 text-destructive",
    reenfileirado: "bg-info/15 text-info",
  })[s];

  const kpiData = useMemo(() => {
    const linhas = parsed ?? [];
    const motivos = new Map<string, number>();
    const modelos = new Map<string, { compativel: number; incompativel: number }>();
    for (const r of linhas) {
      for (const m of [...r.errors, ...r.warnings]) motivos.set(m, (motivos.get(m) ?? 0) + 1);
      const nome = r.uf || "—";
      const acc = modelos.get(nome) ?? { compativel: 0, incompativel: 0 };
      if (r.errors.length || r.warnings.length) acc.incompativel++; else acc.compativel++;
      modelos.set(nome, acc);
    }
    const origens = new Map<string, number>();
    for (const b of batches) origens.set(b.origem, (origens.get(b.origem) ?? 0) + b.total);
    if (linhas.length) origens.set(origem, (origens.get(origem) ?? 0) + linhas.length);
    const compativeis = linhas.filter((r) => !r.errors.length && !r.warnings.length).length;
    return {
      total: linhas.length,
      compativeis,
      incompativeis: linhas.length - compativeis,
      motivos: [...motivos.entries()].map(([motivo, qtd]) => ({ motivo, qtd })).sort((a, b) => b.qtd - a.qtd),
      porModelo: [...modelos.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) =>
        (b.compativel + b.incompativel) - (a.compativel + a.incompativel)).slice(0, 10),
      porOrigem: [...origens.entries()].map(([nome, qtd]) => ({ nome, qtd })),
      ...tempoMedioCompatibilizacao(auditoriaRows),
    };
  }, [parsed, batches, origem, auditoriaRows]);

  return (
    <div className="space-y-6">
      <Card className="elevation-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileUp className="h-4 w-4 text-primary" /> Importar submissões em lote
          </CardTitle>
          <CardDescription>
            Formato CSV com cabeçalho: <code className="font-mono text-[11px]">codigo, ano, mes, eficiencia_dbo_pct, vazao_media_lps, ph_medio, od_medio_mg_l</code>
            {" "}(opcional: <code className="font-mono text-[11px]">dbo_afluente_mg_l</code>)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="bulk-file" type="file" accept=".csv,text/csv,text/plain" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            <Button variant="outline" size="sm" onClick={() => document.getElementById("bulk-file")?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Carregar ficheiro CSV
            </Button>
            <Button variant="ghost" size="sm"
              onClick={() => { setRaw(TEMPLATE); setParsed(null); setOrigem("colado"); setNomeArquivo(undefined); setReenfileirandoDe(null); setLoteParenteId(null); setLoteId(crypto.randomUUID()); setTentativa(1); }}>
              Usar modelo de exemplo
            </Button>
            {reenfileirandoDe && (
              <Badge className="bg-info/15 text-info">Reenfileiramento de lote anterior</Badge>
            )}
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Conteúdo CSV</Label>
            <Textarea rows={8} className="font-mono text-[11px]" value={raw}
              onChange={(e) => { setRaw(e.target.value); setParsed(null); setOrigem("colado"); }}
              placeholder={TEMPLATE} />
          </div>
          <div className="flex justify-end gap-2 flex-wrap">
            <Button variant="outline" onClick={validar}>Validar</Button>
            <Button
              disabled={!parsed || stats.total - stats.invalidas === 0 || importar.isPending}
              onClick={() => importar.mutate("submeter")}
            >
              {importar.isPending ? "A importar..." : "Importar e submeter compatíveis"}
            </Button>
            <Button
              variant="secondary"
              disabled={!parsed || stats.total - stats.invalidas === 0 || importar.isPending}
              onClick={() => importar.mutate("rascunho")}
            >
              Importar tudo como rascunho
            </Button>
          </div>
        </CardContent>
      </Card>

      {parsed && (
        <Card className="elevation-1">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Relatório de validação</CardTitle>
                <CardDescription className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline">{stats.total} linhas</Badge>
                  <Badge className="bg-success/15 text-success">{stats.ok} compatíveis</Badge>
                  <Badge className="bg-warning/15 text-warning">{stats.incompativeis} com incompatibilidade</Badge>
                  <Badge className="bg-destructive/15 text-destructive">{stats.invalidas} inválidas</Badge>
                  <Badge variant="outline">{fmt(stats.cargaRemanescente, 0)} kg DBO/dia remanescentes</Badge>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportarCsv}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportarPdf}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="h-9 pl-8 w-48 text-[12px]" placeholder="Buscar código..."
                  value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={fStatus} onValueChange={(v) => setFStatus(v as typeof fStatus)}>
                <SelectTrigger className="h-9 w-[170px] text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="compativel">Compatíveis</SelectItem>
                  <SelectItem value="incompativel">Incompatíveis (rascunho)</SelectItem>
                  <SelectItem value="invalida">Inválidas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fUf} onValueChange={setFUf}>
                <SelectTrigger className="h-9 w-[110px] text-[12px]"><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas UF</SelectItem>
                  {ufs.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fAno} onValueChange={setFAno}>
                <SelectTrigger className="h-9 w-[110px] text-[12px]"><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todo ano</SelectItem>
                  {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fMes} onValueChange={setFMes}>
                <SelectTrigger className="h-9 w-[110px] text-[12px]"><SelectValue placeholder="Mês" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todo mês</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filtrosAtivos && (
                <Button variant="ghost" size="sm" onClick={limparFiltros}>
                  <X className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
              )}
              <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                {filtradas.length} de {stats.total} linhas
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.incompativeis > 0 && (
              <Alert className="border-warning/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ativação automática bloqueada</AlertTitle>
                <AlertDescription className="text-[12px]">
                  Linhas com incompatibilidade técnica são importadas apenas como <strong>rascunho</strong> e
                  nunca submetidas automaticamente. Corrija os valores e submeta manualmente.
                </AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>ETE</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Indicadores hídricos</TableHead>
                  <TableHead>Destino</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((r) => (
                  <TableRow key={r.idx}>
                    <TableCell className="text-[11px] tabular-nums text-muted-foreground">{r.idx}</TableCell>
                    <TableCell className="text-[12px] font-medium">
                      {r.codigo || "—"} {r.uf && <span className="text-muted-foreground font-normal">· {r.uf}</span>}
                    </TableCell>
                    <TableCell className="text-[12px] tabular-nums">
                      {Number.isFinite(r.mes_referencia) ? String(r.mes_referencia).padStart(2, "0") : "??"}/{r.ano_referencia || "????"}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {r.errors.length > 0 ? (
                        <span className="text-destructive inline-flex items-center gap-1">
                          <XCircle className="h-3 w-3 shrink-0" /> {r.errors.join(" · ")}
                        </span>
                      ) : r.warnings.length > 0 ? (
                        <span className="text-warning inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> {r.warnings.join(" · ")}
                        </span>
                      ) : (
                        <span className="text-success inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Compatível
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] tabular-nums text-muted-foreground">
                      DBO efl. {fmt(r.indicadores.dboEfluenteEstimadoMgL, 0)} mg/L ·{" "}
                      {fmt(r.indicadores.cargaRemanescenteKgDia, 1)} kg/dia ·{" "}
                      {fmt(r.indicadores.utilizacaoCapacidadePct, 0)}% cap.
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {r.errors.length > 0 ? "Ignorada" : r.warnings.length > 0 ? "Rascunho (retida)" : "Submissão"}
                    </TableCell>
                  </TableRow>
                ))}
                {filtradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Nenhuma linha para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="elevation-1">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Histórico de lotes
              </CardTitle>
              <CardDescription>
                Status de cada tentativa. Após corrigir o repositório/base, reenfileire as linhas pendentes.
              </CardDescription>
            </div>
            {batches.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clear}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Limpar histórico
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="text-[12px]">
                    <div className="font-medium tabular-nums">{new Date(b.criadoEm).toLocaleString("pt-BR")}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {b.modo === "submeter" ? "Submeter compatíveis" : "Tudo como rascunho"} · tentativa {b.tentativas}
                      {b.paiId ? " · reenvio" : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {b.origem === "arquivo" ? b.nomeArquivo ?? "ficheiro" : b.origem === "colado" ? "conteúdo colado" : "reenfileiramento"}
                  </TableCell>
                  <TableCell className="text-[11px] tabular-nums">
                    {b.importadas}/{b.total} importadas · {b.retidas} rascunho · {b.invalidas} inválidas
                    {b.erro && <div className="text-destructive">{b.erro}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadge(b.status)}>{b.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" disabled={!b.csvPendente || importar.isPending}
                      onClick={() => reenfileirar(b, false)}>
                      Recarregar
                    </Button>
                    <Button size="sm" disabled={!b.csvPendente || importar.isPending}
                      onClick={() => reenfileirar(b, true)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeBatch(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {batches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum lote importado nesta sessão.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ValidacaoKpiPanel data={kpiData} titulo="Importação em lote" />

      <LoteAuditoriaPanel />
    </div>
  );
}
