import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, History, RefreshCw, Search, X } from "lucide-react";
import { useLoteAuditoria } from "@/hooks/use-lote-auditoria";
import { downloadCsv, stamp } from "@/lib/curadoria-export";
import { useToast } from "@/hooks/use-toast";

const EVENTO_LABEL: Record<string, string> = {
  validacao: "Validação",
  importacao: "Importação",
  reenfileiramento: "Reenfileiramento",
  falha: "Falha",
};

const RESULTADO_CLS: Record<string, string> = {
  compativel: "bg-success/15 text-success",
  importada: "bg-success/15 text-success",
  incompativel: "bg-warning/15 text-warning",
  rascunho: "bg-warning/15 text-warning",
  invalida: "bg-destructive/15 text-destructive",
  falha: "bg-destructive/15 text-destructive",
};

const PERIODOS = [
  { v: "todos", label: "Todo o período" },
  { v: "1", label: "Últimas 24h" },
  { v: "7", label: "Últimos 7 dias" },
  { v: "30", label: "Últimos 30 dias" },
];

export function LoteAuditoriaPanel() {
  const { toast } = useToast();
  const { data: rows = [], isLoading, isFetching, refetch } = useLoteAuditoria();
  const [busca, setBusca] = useState("");
  const [fEvento, setFEvento] = useState("todos");
  const [fResultado, setFResultado] = useState("todos");
  const [fPeriodo, setFPeriodo] = useState("todos");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const limite = fPeriodo === "todos" ? null : Date.now() - Number(fPeriodo) * 86_400_000;
    return rows.filter((r) => {
      if (fEvento !== "todos" && r.evento !== fEvento) return false;
      if (fResultado !== "todos" && r.resultado !== fResultado) return false;
      if (limite && new Date(r.created_at).getTime() < limite) return false;
      if (!q) return true;
      return `${r.ete_codigo ?? ""} ${r.uf ?? ""} ${r.nome_arquivo ?? ""} ${r.actor_email ?? ""} ${(r.motivos || []).join(" ")}`
        .toLowerCase().includes(q);
    });
  }, [rows, busca, fEvento, fResultado, fPeriodo]);

  const filtrosAtivos = busca || fEvento !== "todos" || fResultado !== "todos" || fPeriodo !== "todos";
  const resultados = useMemo(() => Array.from(new Set(rows.map((r) => r.resultado))).sort(), [rows]);

  const exportar = () => {
    if (!filtrados.length) return toast({ title: "Nada a exportar", variant: "destructive" });
    downloadCsv(
      `auditoria-lotes-${stamp()}.csv`,
      ["Data/hora", "Autor", "Evento", "Lote", "Lote de origem", "Tentativa", "Origem", "Ficheiro",
        "ETE", "UF", "Período", "Resultado", "Motivos", "Detalhe"],
      filtrados.map((r) => [
        new Date(r.created_at).toLocaleString("pt-BR"),
        r.actor_email ?? "—",
        EVENTO_LABEL[r.evento] ?? r.evento,
        r.lote_id.slice(0, 8),
        r.lote_pai_id?.slice(0, 8) ?? "—",
        r.tentativa,
        r.origem ?? "—",
        r.nome_arquivo ?? "—",
        r.ete_codigo ?? "—",
        r.uf ?? "—",
        r.ano_referencia ? `${String(r.mes_referencia ?? 0).padStart(2, "0")}/${r.ano_referencia}` : "—",
        r.resultado,
        (r.motivos || []).join(" | "),
        r.detalhe ?? "",
      ]),
    );
    toast({ title: "CSV gerado", description: `${filtrados.length} evento(s) exportado(s).` });
  };

  return (
    <Card className="elevation-1">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Trilha de auditoria de lotes
            </CardTitle>
            <CardDescription>
              Cada tentativa e reenfileiramento com autor, timestamp, ETE afetada, motivos e resultado final.
              Registos imutáveis ({filtrados.length} de {rows.length}).
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportar}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-9 pl-8 w-56 text-[12px]" placeholder="Buscar ETE, autor, motivo..."
              value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={fEvento} onValueChange={setFEvento}>
            <SelectTrigger className="h-9 w-[170px] text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os eventos</SelectItem>
              {Object.entries(EVENTO_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fResultado} onValueChange={setFResultado}>
            <SelectTrigger className="h-9 w-[170px] text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os resultados</SelectItem>
              {resultados.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fPeriodo} onValueChange={setFPeriodo}>
            <SelectTrigger className="h-9 w-[160px] text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {filtrosAtivos && (
            <Button variant="ghost" size="sm"
              onClick={() => { setBusca(""); setFEvento("todos"); setFResultado("todos"); setFPeriodo("todos"); }}>
              <X className="h-3.5 w-3.5 mr-1" /> Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando / quem</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead>Motivos</TableHead>
              <TableHead>Resultado</TableHead>
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
            {!isLoading && filtrados.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-[11px]">
                  <div className="tabular-nums font-medium">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                  <div className="text-muted-foreground">{r.actor_email ?? "sistema"}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">{EVENTO_LABEL[r.evento] ?? r.evento}</Badge>
                </TableCell>
                <TableCell className="text-[11px] font-mono">
                  {r.lote_id.slice(0, 8)}
                  <div className="text-muted-foreground font-sans">
                    tentativa {r.tentativa}{r.lote_pai_id ? ` · reenvio de ${r.lote_pai_id.slice(0, 8)}` : ""}
                    {r.origem ? ` · ${r.nome_arquivo ?? r.origem}` : ""}
                  </div>
                </TableCell>
                <TableCell className="text-[11px]">
                  {r.ete_codigo ?? "lote completo"}{r.uf ? ` · ${r.uf}` : ""}
                  {r.ano_referencia && (
                    <div className="text-muted-foreground tabular-nums">
                      {String(r.mes_referencia ?? 0).padStart(2, "0")}/{r.ano_referencia}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground max-w-[320px]">
                  {(r.motivos || []).join(" · ") || r.detalhe || "—"}
                </TableCell>
                <TableCell>
                  <Badge className={`text-[10px] ${RESULTADO_CLS[r.resultado] ?? ""}`}>{r.resultado}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  Sem eventos de auditoria para os filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
