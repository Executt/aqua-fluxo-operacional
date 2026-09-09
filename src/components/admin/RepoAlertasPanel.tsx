import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, RefreshCw, Search, Loader2, PlugZap, Clock, Database, FolderArchive,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logInfraAudit } from "@/lib/infra-audit";

type Alerta = {
  id: string;
  target: "repositorio" | "base";
  target_id: string;
  target_name: string | null;
  tipo: "conexao_falha" | "sync_parado" | "sem_dados";
  severidade: string;
  mensagem: string;
  detalhes: Record<string, unknown>;
  status: "aberto" | "resolvido";
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
};

const TIPO_META: Record<Alerta["tipo"], { label: string; icon: typeof PlugZap; hint: string }> = {
  conexao_falha: { label: "Conexão falhou", icon: PlugZap, hint: "O último teste de conexão não passou" },
  sync_parado: { label: "Sincronização parada", icon: Clock, hint: "Sem atualização dentro do prazo definido" },
  sem_dados: { label: "Sem dados", icon: FolderArchive, hint: "Repositório ativo sem documentos indexados" },
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export function RepoAlertasPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"aberto" | "resolvido" | "todos">("aberto");
  const [tipo, setTipo] = useState<Alerta["tipo"] | "todos">("todos");
  const [alvo, setAlvo] = useState<"repositorio" | "base" | "todos">("todos");
  const [busca, setBusca] = useState("");

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ["repo-alertas", status],
    queryFn: async () => {
      let q = supabase
        .from("repo_alertas" as any)
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(300);
      if (status !== "todos") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Alerta[];
    },
    refetchInterval: 60_000,
  });

  const verificar = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("detect_repo_alertas");
      if (error) throw error;
      return data as { ativos: number; resolvidos: number };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["repo-alertas"] });
      toast({
        title: "Verificação concluída",
        description: `${r?.ativos ?? 0} alerta(s) ativo(s), ${r?.resolvidos ?? 0} resolvido(s) automaticamente.`,
      });
    },
    onError: (e: Error) => toast({ title: "Falha na verificação", description: e.message, variant: "destructive" }),
  });

  const resolver = useMutation({
    mutationFn: async (a: Alerta) => {
      const { error } = await supabase
        .from("repo_alertas" as any)
        .update({ status: "resolvido", resolved_at: new Date().toISOString() })
        .eq("id", a.id);
      if (error) throw error;
      await logInfraAudit({
        entity_type: a.target === "base" ? "database" : "repository",
        entity_id: a.target_id,
        entity_name: a.target_name,
        action: "update",
        motivo: `Alerta "${TIPO_META[a.tipo].label}" marcado como resolvido manualmente`,
        before_json: { status: "aberto", mensagem: a.mensagem },
        after_json: { status: "resolvido" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repo-alertas"] });
      toast({ title: "Alerta resolvido", description: "Registado na trilha de auditoria." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return alertas.filter(
      (a) =>
        (tipo === "todos" || a.tipo === tipo) &&
        (alvo === "todos" || a.target === alvo) &&
        (!t || (a.target_name ?? "").toLowerCase().includes(t) || a.mensagem.toLowerCase().includes(t)),
    );
  }, [alertas, tipo, alvo, busca]);

  const kpis = useMemo(() => {
    const abertos = alertas.filter((a) => a.status === "aberto");
    return {
      total: abertos.length,
      conexao: abertos.filter((a) => a.tipo === "conexao_falha").length,
      sync: abertos.filter((a) => a.tipo === "sync_parado").length,
      vazios: abertos.filter((a) => a.tipo === "sem_dados").length,
    };
  }, [alertas]);

  return (
    <div className="lg:col-span-3 space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <KpiCard label="Alertas em aberto" value={kpis.total} tone={kpis.total ? "danger" : "ok"} />
        <KpiCard label="Conexões falhadas" value={kpis.conexao} tone={kpis.conexao ? "danger" : "ok"} />
        <KpiCard label="Sincronizações paradas" value={kpis.sync} tone={kpis.sync ? "warn" : "ok"} />
        <KpiCard label="Repositórios sem dados" value={kpis.vazios} tone={kpis.vazios ? "warn" : "ok"} />
      </div>

      <Card className="surface-card">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <div>
            <CardTitle className="text-heading-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" /> Monitorização de repositórios e bases
            </CardTitle>
            <CardDescription className="text-body-sm">
              Verificação automática de hora a hora. Alertas fecham sozinhos quando a origem volta ao normal.
            </CardDescription>
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => verificar.mutate()} disabled={verificar.isPending}>
            {verificar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Verificar agora
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Procurar por nome ou mensagem..."
                className="h-8 w-60 pl-8 text-[12px]"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-8 w-40 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aberto">Em aberto</SelectItem>
                <SelectItem value="resolvido">Resolvidos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger className="h-8 w-48 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="conexao_falha">Conexão falhou</SelectItem>
                <SelectItem value="sync_parado">Sincronização parada</SelectItem>
                <SelectItem value="sem_dados">Sem dados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={alvo} onValueChange={(v) => setAlvo(v as typeof alvo)}>
              <SelectTrigger className="h-8 w-44 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Repositórios e bases</SelectItem>
                <SelectItem value="repositorio">Só repositórios</SelectItem>
                <SelectItem value="base">Só bases de dados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Detetado</TableHead>
                <TableHead>Última verificação</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> A carregar...
                </TableCell></TableRow>
              )}
              {!isLoading && filtradas.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <CheckCircle2 className="h-4 w-4 inline mr-2 text-success" /> Nenhum alerta com estes filtros.
                </TableCell></TableRow>
              )}
              {filtradas.map((a) => {
                const meta = TIPO_META[a.tipo];
                const Icon = meta.icon;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {a.target === "base" ? <Database className="h-3.5 w-3.5 text-muted-foreground" /> : <FolderArchive className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="font-medium">{a.target_name ?? "—"}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {a.target === "base" ? "Base de dados" : "Repositório"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`gap-1 text-[11px] ${a.severidade === "alta" ? "border-destructive/30 text-destructive bg-destructive/5" : "border-warning/30 text-warning bg-warning/5"}`}
                      >
                        <Icon className="h-3 w-3" /> {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[360px] text-[12px] text-muted-foreground">{a.mensagem}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{fmt(a.first_seen_at)}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{fmt(a.last_seen_at)}</TableCell>
                    <TableCell className="text-right">
                      {a.status === "aberto" ? (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]"
                          onClick={() => resolver.mutate(a)} disabled={resolver.isPending}>
                          Marcar resolvido
                        </Button>
                      ) : (
                        <span className="pill-success text-[11px] px-2 py-0.5 rounded">
                          Resolvido {fmt(a.resolved_at)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "danger" }) {
  const color = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-success";
  return (
    <Card className="surface-card">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
