import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { Coins, Database, FolderArchive, Loader2, Search, History as HistoryIcon } from "lucide-react";
import { CHART_COLORS } from "@/lib/chart-colors";

type Alvo = "repositorio" | "base";

type Linha = {
  id: string;
  target: Alvo;
  name: string;
  owner_name: string | null;
  custo_acesso_mensal: number;
  custo_manutencao_mensal: number;
  criticidade: string;
  active: boolean;
};

const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

const CRIT_LABEL: Record<string, string> = {
  critica: "Crítica", alta: "Alta", media: "Média", baixa: "Baixa",
};

export function RepoCustosTab() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Alvo | "todos">("todos");

  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ["repo-custos"],
    queryFn: async () => {
      const cols = "id,name,owner_name,custo_acesso_mensal,custo_manutencao_mensal,criticidade,active";
      const [repos, bases] = await Promise.all([
        supabase.from("data_repositories" as any).select(cols).order("name"),
        supabase.from("database_connections" as any).select(cols).order("name"),
      ]);
      if (repos.error) throw repos.error;
      if (bases.error) throw bases.error;
      return [
        ...((repos.data ?? []) as any[]).map((r) => ({ ...r, target: "repositorio" as Alvo })),
        ...((bases.data ?? []) as any[]).map((r) => ({ ...r, target: "base" as Alvo })),
      ] as Linha[];
    },
  });

  const { data: auditoria = [] } = useQuery({
    queryKey: ["repo-custos-auditoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infra_audit_log" as any)
        .select("id,entity_name,entity_type,motivo,changed_by_email,created_at,before_json,after_json")
        .in("entity_type", ["repository", "database"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return linhas.filter(
      (l) =>
        (filtro === "todos" || l.target === filtro) &&
        (!t || l.name.toLowerCase().includes(t) || (l.owner_name ?? "").toLowerCase().includes(t)),
    );
  }, [linhas, filtro, busca]);

  const totais = useMemo(() => {
    const acesso = filtradas.reduce((s, l) => s + Number(l.custo_acesso_mensal ?? 0), 0);
    const manut = filtradas.reduce((s, l) => s + Number(l.custo_manutencao_mensal ?? 0), 0);
    const repos = filtradas.filter((l) => l.target === "repositorio");
    const bases = filtradas.filter((l) => l.target === "base");
    const soma = (arr: Linha[]) =>
      arr.reduce((s, l) => s + Number(l.custo_acesso_mensal ?? 0) + Number(l.custo_manutencao_mensal ?? 0), 0);
    return {
      acesso,
      manut,
      total: acesso + manut,
      anual: (acesso + manut) * 12,
      repos: soma(repos),
      bases: soma(bases),
    };
  }, [filtradas]);

  const grafico = useMemo(
    () =>
      [...filtradas]
        .map((l) => ({
          nome: l.name.length > 22 ? `${l.name.slice(0, 21)}…` : l.name,
          total: Number(l.custo_acesso_mensal ?? 0) + Number(l.custo_manutencao_mensal ?? 0),
          target: l.target,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
    [filtradas],
  );

  const palette = [CHART_COLORS.primary, CHART_COLORS.teal];

  return (
    <div className="lg:col-span-3 space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Custo de acesso / mês" value={money(totais.acesso)} />
        <Kpi label="Custo de manutenção / mês" value={money(totais.manut)} />
        <Kpi label="Custo total / mês" value={money(totais.total)} strong />
        <Kpi label="Projeção anual" value={money(totais.anual)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="surface-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-heading-2 flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" /> Maiores custos mensais
            </CardTitle>
            <CardDescription className="text-body-sm">
              Dez origens de dados com maior custo somado (acesso + manutenção).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {grafico.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-[12px]">
                Sem dados para o filtro atual.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafico} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" tickFormatter={(v) => money(Number(v))} fontSize={11} />
                  <YAxis type="category" dataKey="nome" width={150} fontSize={11} />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {grafico.map((g, i) => (
                      <Cell key={i} fill={g.target === "base" ? palette[1] : palette[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-heading-2">Repartição</CardTitle>
            <CardDescription className="text-body-sm">Custo mensal por tipo de origem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Reparticao label="Repositórios de ficheiros" value={totais.repos} total={totais.total} icon={FolderArchive} />
            <Reparticao label="Bases de dados" value={totais.bases} total={totais.total} icon={Database} />
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <div>
            <CardTitle className="text-heading-2">Custos por repositório e base</CardTitle>
            <CardDescription className="text-body-sm">
              Valores definidos na aba Metadados; cada alteração fica registada na auditoria.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Nome ou responsável..."
                className="h-8 w-52 pl-8 text-[12px]"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
              <SelectTrigger className="h-8 w-44 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Repositórios e bases</SelectItem>
                <SelectItem value="repositorio">Só repositórios</SelectItem>
                <SelectItem value="base">Só bases de dados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Criticidade</TableHead>
                <TableHead className="text-right">Acesso / mês</TableHead>
                <TableHead className="text-right">Manutenção / mês</TableHead>
                <TableHead className="text-right">Total / mês</TableHead>
                <TableHead className="text-right">Total / ano</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> A carregar...
                </TableCell></TableRow>
              )}
              {!isLoading && filtradas.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum registo encontrado.
                </TableCell></TableRow>
              )}
              {filtradas.map((l) => {
                const total = Number(l.custo_acesso_mensal ?? 0) + Number(l.custo_manutencao_mensal ?? 0);
                return (
                  <TableRow key={`${l.target}-${l.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {l.target === "base"
                          ? <Database className="h-3.5 w-3.5 text-muted-foreground" />
                          : <FolderArchive className="h-3.5 w-3.5 text-muted-foreground" />}
                        {l.name}
                        {!l.active && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px]">
                      {l.owner_name ?? <span className="text-warning">Por definir</span>}
                    </TableCell>
                    <TableCell className="text-[12px]">{CRIT_LABEL[l.criticidade] ?? l.criticidade}</TableCell>
                    <TableCell className="text-right font-mono text-[12px]">{money(l.custo_acesso_mensal)}</TableCell>
                    <TableCell className="text-right font-mono text-[12px]">{money(l.custo_manutencao_mensal)}</TableCell>
                    <TableCell className="text-right font-mono text-[12px] font-semibold">{money(total)}</TableCell>
                    <TableCell className="text-right font-mono text-[12px] text-muted-foreground">{money(total * 12)}</TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && filtradas.length > 0 && (
                <TableRow className="bg-secondary/40">
                  <TableCell colSpan={3} className="font-semibold text-[12px]">Total</TableCell>
                  <TableCell className="text-right font-mono text-[12px] font-semibold">{money(totais.acesso)}</TableCell>
                  <TableCell className="text-right font-mono text-[12px] font-semibold">{money(totais.manut)}</TableCell>
                  <TableCell className="text-right font-mono text-[12px] font-semibold">{money(totais.total)}</TableCell>
                  <TableCell className="text-right font-mono text-[12px] font-semibold">{money(totais.anual)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-primary" /> Últimas alterações registadas
          </CardTitle>
          <CardDescription className="text-body-sm">
            Trilha de auditoria das origens de dados (responsáveis, custos e criticidade).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditoria.length === 0 && (
            <p className="text-[12px] text-muted-foreground">Ainda sem alterações registadas.</p>
          )}
          {auditoria.map((a) => {
            const antes = Number(a.before_json?.custo_acesso_mensal ?? 0) + Number(a.before_json?.custo_manutencao_mensal ?? 0);
            const depois = Number(a.after_json?.custo_acesso_mensal ?? 0) + Number(a.after_json?.custo_manutencao_mensal ?? 0);
            const mudouCusto = a.before_json && a.after_json && antes !== depois;
            return (
              <div key={a.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-[12px] font-medium">{a.entity_name ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.motivo || "Sem motivo indicado"} · {a.changed_by_email ?? "sistema"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {mudouCusto && (
                    <p className="text-[11px] font-mono">{money(antes)} → {money(depois)}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Reparticao({
  label, value, total, icon: Icon,
}: { label: string; value: number; total: number; icon: typeof Database }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="font-mono font-medium">{money(value)}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{pct}% do custo mensal</p>
    </div>
  );
}

function Kpi({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Card className="surface-card">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 font-semibold text-xl ${strong ? "text-primary" : "text-foreground"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
