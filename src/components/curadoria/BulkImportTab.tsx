import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, FileUp, Upload, XCircle } from "lucide-react";
import { checkIncompatibilidades } from "./ValidacoesTab";

interface Ete { id: string; codigo: string; nome: string; uf: string }

interface ParsedRow {
  idx: number;
  codigo: string;
  ete_id: string | null;
  ano_referencia: number;
  mes_referencia: number;
  payload: Record<string, number | string>;
  errors: string[];
  warnings: string[];
}

const TEMPLATE = `codigo,ano,mes,eficiencia_dbo_pct,vazao_media_lps,ph_medio,od_medio_mg_l
ETE-001,2026,7,78.5,120.4,7.1,4.2`;

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
    for (const k of ["eficiencia_dbo_pct", "vazao_media_lps", "ph_medio", "od_medio_mg_l"]) {
      const v = get(k);
      if (v !== "" && !Number.isNaN(Number(v))) payload[k] = Number(v);
    }

    const errors: string[] = [];
    if (!codigo) errors.push("Código da ETE ausente");
    else if (!ete) errors.push(`ETE "${codigo}" não encontrada / fora do seu operador`);
    if (!Number.isInteger(ano) || ano < 2000) errors.push("Ano inválido");
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) errors.push("Mês inválido");
    if (Object.keys(payload).length === 0) errors.push("Nenhum parâmetro numérico válido");

    return {
      idx: i + 1, codigo, ete_id: ete?.id ?? null,
      ano_referencia: ano, mes_referencia: mes, payload,
      errors, warnings: errors.length ? [] : checkIncompatibilidades(payload),
    };
  });
}

export function BulkImportTab() {
  const { toast } = useToast();
  const { operadorId } = useAuth();
  const qc = useQueryClient();
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);

  const { data: etes = [] } = useQuery({
    queryKey: ["etes-curadoria-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etes_curadoria")
        .select("id, codigo, nome, uf")
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
    };
  }, [parsed]);

  const validar = () => {
    const rows = parseCsv(raw, etes);
    if (rows.length === 0) {
      toast({ title: "Nada a validar", description: "Cole um CSV com cabeçalho e ao menos uma linha.", variant: "destructive" });
      return;
    }
    setParsed(rows);
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setRaw(text);
    setParsed(parseCsv(text, etes));
  };

  const importar = useMutation({
    mutationFn: async (modo: "submeter" | "rascunho") => {
      if (!operadorId) throw new Error("Utilizador sem operador associado");
      const rows = (parsed ?? []).filter((r) => r.errors.length === 0);
      if (rows.length === 0) throw new Error("Nenhuma linha válida para importar");

      // Regra: linhas com incompatibilidade NUNCA são submetidas automaticamente.
      const respostas = rows.map((r) => ({
        ete_id: r.ete_id!,
        ano_referencia: r.ano_referencia,
        mes_referencia: r.mes_referencia,
        payload: r.payload,
        estado: (modo === "submeter" && r.warnings.length === 0 ? "submetido" : "rascunho") as
          "submetido" | "rascunho",
      }));

      const { data, error } = await supabase.functions.invoke("curadoria-bulk-insert", {
        body: { operador_id: operadorId, respostas },
      });
      if (error) throw error;
      const retidas = respostas.filter((r) => r.estado === "rascunho").length;
      return { inserted: (data as any)?.inserted ?? respostas.length, retidas };
    },
    onSuccess: ({ inserted, retidas }) => {
      toast({
        title: `${inserted} registo(s) importado(s)`,
        description: retidas
          ? `${retidas} ficaram como rascunho por incompatibilidade — revise antes de submeter.`
          : "Todas as linhas passaram na validação técnica.",
      });
      qc.invalidateQueries({ queryKey: ["respostas"] });
      qc.invalidateQueries({ queryKey: ["respostas-kpis"] });
      qc.invalidateQueries({ queryKey: ["curadoria-fila-validacao"] });
    },
    onError: (e: Error) => toast({ title: "Falha na importação", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="elevation-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileUp className="h-4 w-4 text-primary" /> Importar submissões em lote
          </CardTitle>
          <CardDescription>
            Formato CSV com cabeçalho: <code className="font-mono text-[11px]">codigo, ano, mes, eficiencia_dbo_pct, vazao_media_lps, ph_medio, od_medio_mg_l</code>
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
            <Button variant="ghost" size="sm" onClick={() => { setRaw(TEMPLATE); setParsed(null); }}>
              Usar modelo de exemplo
            </Button>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Conteúdo CSV</Label>
            <Textarea rows={8} className="font-mono text-[11px]" value={raw}
              onChange={(e) => { setRaw(e.target.value); setParsed(null); }}
              placeholder={TEMPLATE} />
          </div>
          <div className="flex justify-end gap-2">
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
            <CardTitle className="text-base">Relatório de validação</CardTitle>
            <CardDescription className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">{stats.total} linhas</Badge>
              <Badge className="bg-success/15 text-success">{stats.ok} compatíveis</Badge>
              <Badge className="bg-warning/15 text-warning">{stats.incompativeis} com incompatibilidade</Badge>
              <Badge className="bg-destructive/15 text-destructive">{stats.invalidas} inválidas</Badge>
            </CardDescription>
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
                  <TableHead>Destino</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((r) => (
                  <TableRow key={r.idx}>
                    <TableCell className="text-[11px] tabular-nums text-muted-foreground">{r.idx}</TableCell>
                    <TableCell className="text-[12px] font-medium">{r.codigo || "—"}</TableCell>
                    <TableCell className="text-[12px] tabular-nums">
                      {Number.isFinite(r.mes_referencia) ? String(r.mes_referencia).padStart(2, "0") : "??"}/{r.ano_referencia || "????"}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {r.errors.length > 0 ? (
                        <span className="text-destructive inline-flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> {r.errors.join(" · ")}
                        </span>
                      ) : r.warnings.length > 0 ? (
                        <span className="text-warning inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {r.warnings.join(" · ")}
                        </span>
                      ) : (
                        <span className="text-success inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Compatível
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {r.errors.length > 0 ? "Ignorada" : r.warnings.length > 0 ? "Rascunho (retida)" : "Submissão"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
