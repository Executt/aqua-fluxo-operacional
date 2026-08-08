import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import type { LoteAuditoriaRow } from "@/lib/lote-auditoria";
import { downloadXlsx } from "@/lib/xlsx-export";
import { stamp } from "@/lib/curadoria-export";
import { detectarResolucoes } from "@/hooks/use-compat-notifications";

export type KpiFoco = "compativel" | "incompativel" | "tempo" | "motivos";

const FOCO_LABEL: Record<KpiFoco, string> = {
  compativel: "Eventos compatíveis / importados",
  incompativel: "Eventos incompatíveis, inválidos e falhas",
  tempo: "Casos reenfileirados e compatibilizados",
  motivos: "Motivos técnicos acionados",
};

const RESULTADO_CLS: Record<string, string> = {
  compativel: "bg-success/15 text-success",
  importada: "bg-success/15 text-success",
  incompativel: "bg-warning/15 text-warning",
  rascunho: "bg-warning/15 text-warning",
  invalida: "bg-destructive/15 text-destructive",
  falha: "bg-destructive/15 text-destructive",
};

const BOM = new Set(["compativel", "importada"]);
const RUIM = new Set(["incompativel", "invalida", "falha", "rascunho"]);

function filtrar(rows: LoteAuditoriaRow[], foco: KpiFoco) {
  if (foco === "compativel") return rows.filter((r) => BOM.has(r.resultado));
  if (foco === "incompativel") return rows.filter((r) => RUIM.has(r.resultado));
  if (foco === "motivos") return rows.filter((r) => (r.motivos ?? []).length > 0);
  const chaves = new Set(detectarResolucoes(rows).map((r) => r.loteId));
  return rows.filter((r) => chaves.has(r.lote_id));
}

interface Grupo {
  key: string;
  loteId: string;
  paiId: string | null;
  tentativa: number;
  quando: string;
  autor: string;
  origem: string;
  eventos: LoteAuditoriaRow[];
}

export function KpiDetalheDialog({ foco, rows, onOpenChange }: {
  foco: KpiFoco | null;
  rows: LoteAuditoriaRow[];
  onOpenChange: (open: boolean) => void;
}) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  const grupos = useMemo<Grupo[]>(() => {
    if (!foco) return [];
    const map = new Map<string, Grupo>();
    for (const r of filtrar(rows, foco)) {
      const key = `${r.lote_id}|${r.tentativa}`;
      const g = map.get(key) ?? {
        key,
        loteId: r.lote_id,
        paiId: r.lote_pai_id,
        tentativa: r.tentativa,
        quando: r.created_at,
        autor: r.actor_email ?? "sistema",
        origem: r.nome_arquivo ?? r.origem ?? "—",
        eventos: [],
      };
      g.eventos.push(r);
      if (r.created_at > g.quando) g.quando = r.created_at;
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.quando.localeCompare(a.quando));
  }, [rows, foco]);

  const totalEventos = grupos.reduce((s, g) => s + g.eventos.length, 0);

  const exportar = () => {
    if (!foco) return;
    downloadXlsx(`trilha-kpi-${foco}-${stamp()}.xlsx`, [
      {
        nome: "Resumo por lote",
        headers: ["Lote", "Lote de origem", "Tentativa", "Última atividade", "Autor", "Origem", "Eventos"],
        rows: grupos.map((g) => [
          g.loteId, g.paiId ?? "—", g.tentativa,
          new Date(g.quando).toLocaleString("pt-BR"), g.autor, g.origem, g.eventos.length,
        ]),
      },
      {
        nome: "Eventos",
        headers: ["Data/hora", "Lote", "Tentativa", "Evento", "ETE", "UF", "Período", "Resultado", "Motivos", "Detalhe", "Autor"],
        rows: grupos.flatMap((g) => g.eventos.map((r) => [
          new Date(r.created_at).toLocaleString("pt-BR"), r.lote_id, r.tentativa, r.evento,
          r.ete_codigo ?? "—", r.uf ?? "—",
          r.ano_referencia ? `${String(r.mes_referencia ?? 0).padStart(2, "0")}/${r.ano_referencia}` : "—",
          r.resultado, (r.motivos ?? []).join(" | "), r.detalhe ?? "", r.actor_email ?? "sistema",
        ])),
      },
    ]);
  };

  return (
    <Dialog open={!!foco} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{foco ? FOCO_LABEL[foco] : ""}</DialogTitle>
          <DialogDescription>
            Detalhe da trilha de auditoria por lote, reenfileiramento e tentativa —
            {" "}{grupos.length} lote(s)/tentativa(s), {totalEventos} evento(s).
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={exportar} disabled={!totalEventos}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> XLSX
          </Button>
        </div>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-2">
            {grupos.map((g) => {
              const aberto = abertos[g.key] ?? false;
              const finais = g.eventos.filter((e) => e.evento !== "validacao");
              const resultadoFinal = (finais[0] ?? g.eventos[0])?.resultado ?? "—";
              return (
                <div key={g.key} className="rounded-md border">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50"
                    onClick={() => setAbertos((p) => ({ ...p, [g.key]: !aberto }))}
                  >
                    <span className="flex items-center gap-2 text-[12px]">
                      {aberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <span className="font-mono">{g.loteId.slice(0, 8)}</span>
                      <span className="text-muted-foreground">
                        tentativa {g.tentativa}
                        {g.paiId ? ` · reenvio de ${g.paiId.slice(0, 8)}` : ""} · {g.origem}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {new Date(g.quando).toLocaleString("pt-BR")} · {g.autor}
                      <Badge className={`text-[10px] ${RESULTADO_CLS[resultadoFinal] ?? ""}`}>{resultadoFinal}</Badge>
                      <Badge variant="outline" className="text-[10px]">{g.eventos.length} ev.</Badge>
                    </span>
                  </button>
                  {aberto && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quando</TableHead>
                          <TableHead>Evento</TableHead>
                          <TableHead>Alvo</TableHead>
                          <TableHead>Motivos</TableHead>
                          <TableHead>Resultado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.eventos.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-[11px] tabular-nums">
                              {new Date(r.created_at).toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-[11px]">{r.evento}</TableCell>
                            <TableCell className="text-[11px]">
                              {r.ete_codigo ?? "lote completo"}{r.uf ? ` · ${r.uf}` : ""}
                              {r.ano_referencia && (
                                <div className="text-muted-foreground tabular-nums">
                                  {String(r.mes_referencia ?? 0).padStart(2, "0")}/{r.ano_referencia}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[11px] text-muted-foreground max-w-[280px]">
                              {(r.motivos ?? []).join(" · ") || r.detalhe || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${RESULTADO_CLS[r.resultado] ?? ""}`}>{r.resultado}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })}
            {grupos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                Sem eventos na trilha para este indicador.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
