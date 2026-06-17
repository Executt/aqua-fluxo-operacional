import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, History, Filter, RotateCcw, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AuditRow = {
  id: string;
  resposta_id: string;
  ete_id: string | null;
  operador_id: string | null;
  ano: number | null;
  mes: number | null;
  operacao: "INSERT" | "UPDATE" | "DELETE";
  estado_anterior: string | null;
  estado_novo: string | null;
  payload_anterior: Record<string, unknown> | null;
  payload_novo: Record<string, unknown> | null;
  motivo_rejeicao: string | null;
  changed_by: string | null;
  changed_at: string;
};

type Ete = { id: string; codigo: string | null; nome: string | null; uf: string | null };

const ESTADOS = ["rascunho", "submetido", "em_analise", "validado", "rejeitado"] as const;

const estadoTone: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  submetido: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  em_analise: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  validado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejeitado: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const opTone: Record<string, string> = {
  INSERT: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  UPDATE: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  DELETE: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const PAGE_SIZE = 30;

export default function CuradoriaAuditoria() {
  const [eteId, setEteId] = useState<string>("all");
  const [estado, setEstado] = useState<string>("all");
  const [operacao, setOperacao] = useState<string>("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<AuditRow | null>(null);

  const { data: etes = [] } = useQuery({
    queryKey: ["audit-etes"],
    queryFn: async (): Promise<Ete[]> => {
      const { data, error } = await supabase
        .from("etes_curadoria")
        .select("id,codigo,nome,uf")
        .order("codigo", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Ete[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const eteMap = useMemo(() => {
    const m = new Map<string, Ete>();
    etes.forEach((e) => m.set(e.id, e));
    return m;
  }, [etes]);

  const filteredEtes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return etes;
    return etes.filter((e) =>
      [e.codigo, e.nome, e.uf].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  }, [etes, search]);

  const queryKey = [
    "audit-trail",
    { eteId, estado, operacao, from: from?.toISOString() ?? null, to: to?.toISOString() ?? null, page },
  ];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from("formulario_respostas_audit" as never)
        .select("*", { count: "exact" })
        .order("changed_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (eteId !== "all") q = q.eq("ete_id", eteId);
      if (estado !== "all") q = q.eq("estado_novo", estado);
      if (operacao !== "all") q = q.eq("operacao", operacao);
      if (from) q = q.gte("changed_at", from.toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        q = q.lte("changed_at", end.toISOString());
      }

      const { data: rows, error, count } = await q;
      if (error) throw error;
      return { rows: (rows ?? []) as unknown as AuditRow[], total: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reset = () => {
    setEteId("all");
    setEstado("all");
    setOperacao("all");
    setFrom(undefined);
    setTo(undefined);
    setSearch("");
    setPage(0);
  };

  const eteLabel = (id: string | null) => {
    if (!id) return "—";
    const e = eteMap.get(id);
    if (!e) return id.slice(0, 8);
    return `${e.codigo ?? "—"} · ${e.nome ?? ""} ${e.uf ? `(${e.uf})` : ""}`.trim();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Trilha de Auditoria</h1>
            <p className="text-sm text-muted-foreground">
              Histórico imutável de mudanças em respostas de curadoria.
            </p>
          </div>
        </header>

        <Card className="elevation-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-muted-foreground">ETE</label>
              <Select value={eteId} onValueChange={(v) => { setEteId(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Todas as ETEs" /></SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  <div className="p-2">
                    <Input
                      placeholder="Buscar código, nome, UF…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <SelectItem value="all">Todas as ETEs</SelectItem>
                  {filteredEtes.slice(0, 200).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.codigo ?? "—"} · {e.nome ?? ""} {e.uf ? `(${e.uf})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Estado (novo)</label>
              <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Operação</label>
              <Select value={operacao} onValueChange={(v) => { setOperacao(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="INSERT">INSERT</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">De</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start font-normal", !from && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {from ? format(from, "dd/MM/yyyy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={from} onSelect={(d) => { setFrom(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Até</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start font-normal", !to && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {to ? format(to, "dd/MM/yyyy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={to} onSelect={(d) => { setTo(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:col-span-2 lg:col-span-6 flex justify-end">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-1" /> Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="elevation-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              Registros {isFetching && <span className="text-xs text-muted-foreground ml-2">atualizando…</span>}
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {total.toLocaleString("pt-BR")} mudanças
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Quando</TableHead>
                    <TableHead>ETE</TableHead>
                    <TableHead className="w-[80px]">Período</TableHead>
                    <TableHead className="w-[100px]">Operação</TableHead>
                    <TableHead className="w-[220px]">Transição</TableHead>
                    <TableHead className="w-[80px] text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {!isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Nenhum registro para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(r.changed_at), "dd/MM/yy HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm">{eteLabel(r.ete_id)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.ano ? `${String(r.mes ?? "").padStart(2, "0")}/${r.ano}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-mono text-[10px]", opTone[r.operacao])}>
                          {r.operacao}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Badge variant="outline" className={cn("text-[10px]", estadoTone[r.estado_anterior ?? ""] ?? "bg-muted")}>
                            {r.estado_anterior ?? "—"}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className={cn("text-[10px]", estadoTone[r.estado_novo ?? ""] ?? "bg-muted")}>
                            {r.estado_novo ?? "—"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Ver</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between p-3 border-t">
              <div className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Anterior
                </Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe da mudança</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Quando" value={format(new Date(detail.changed_at), "dd/MM/yyyy HH:mm:ss")} />
                <Info label="Operação" value={detail.operacao} />
                <Info label="ETE" value={eteLabel(detail.ete_id)} />
                <Info label="Período" value={detail.ano ? `${String(detail.mes ?? "").padStart(2, "0")}/${detail.ano}` : "—"} />
                <Info label="Estado anterior" value={detail.estado_anterior ?? "—"} />
                <Info label="Estado novo" value={detail.estado_novo ?? "—"} />
                <Info label="Resposta ID" value={detail.resposta_id} />
                <Info label="Autor (uid)" value={detail.changed_by ?? "—"} />
              </div>
              {detail.motivo_rejeicao && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Motivo de rejeição</div>
                  <div className="rounded-md border bg-muted/30 p-3">{detail.motivo_rejeicao}</div>
                </div>
              )}
              {(detail.payload_anterior || detail.payload_novo) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <PayloadBlock title="Payload anterior" data={detail.payload_anterior} />
                  <PayloadBlock title="Payload novo" data={detail.payload_novo} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-xs break-all">{value}</div>
    </div>
  );
}

function PayloadBlock({ title, data }: { title: string; data: unknown }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <pre className="rounded-md border bg-muted/30 p-3 text-[11px] overflow-auto max-h-[320px]">
        {data ? JSON.stringify(data, null, 2) : "—"}
      </pre>
    </div>
  );
}
