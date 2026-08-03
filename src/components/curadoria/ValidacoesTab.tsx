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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, FileSearch, RefreshCw, Search } from "lucide-react";

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
}

interface Ete { id: string; codigo: string; nome: string; municipio_nome: string; uf: string }

/** Regras determinísticas de compatibilidade (não bloqueiam, sinalizam). */
export function checkIncompatibilidades(payload: Record<string, unknown>): string[] {
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
  return out;
}

export function ValidacoesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Row | null>(null);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);

  const { data: etes = [] } = useQuery({
    queryKey: ["etes-curadoria-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etes_curadoria")
        .select("id, codigo, nome, municipio_nome, uf")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Ete[];
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

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const e = etes.find((x) => x.id === r.ete_id);
      return `${e?.codigo} ${e?.nome} ${e?.municipio_nome} ${e?.uf}`.toLowerCase().includes(q);
    });
  }, [rows, etes, busca]);

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
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="h-9 pl-8 w-56 text-[12px]" placeholder="Buscar ETE..."
                  value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
              </Button>
            </div>
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
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))}
              {!isLoading && filtered.map((r) => {
                const e = etes.find((x) => x.id === r.ete_id);
                const issues = checkIncompatibilidades(r.payload || {});
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="text-[13px] font-medium">{e?.codigo ?? r.ete_id.slice(0, 8)}</div>
                      <div className="text-[11px] text-muted-foreground">{e?.nome} · {e?.municipio_nome}/{e?.uf}</div>
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
                              <AlertTriangle className="h-3 w-3" /> {i}
                            </li>
                          ))}
                        </ul>
                      )}
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
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma submissão aguardando validação.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </>
  );
}
