import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BookMarked, Edit3, Search, Loader2, Database, FolderArchive, History as HistoryIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logInfraAudit } from "@/lib/infra-audit";

type Alvo = "repositorio" | "base";

type Item = {
  id: string;
  target: Alvo;
  name: string;
  description: string | null;
  owner_name: string | null;
  owner_email: string | null;
  custo_acesso_mensal: number;
  custo_manutencao_mensal: number;
  criticidade: string;
  sla_atualizacao_horas: number;
  metadata_updated_at: string | null;
  active: boolean;
  origem: string;
};

const CRITICIDADES = [
  { value: "critica", label: "Crítica" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Nunca preenchido";

const CRIT_CLASS: Record<string, string> = {
  critica: "border-destructive/30 text-destructive bg-destructive/5",
  alta: "border-warning/30 text-warning bg-warning/5",
  media: "border-border text-muted-foreground",
  baixa: "border-border text-muted-foreground",
};

export function RepoMetadadosTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Alvo | "todos">("todos");
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<Partial<Item>>({});
  const [motivo, setMotivo] = useState("");

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["repo-metadados"],
    queryFn: async () => {
      const [repos, bases] = await Promise.all([
        supabase
          .from("data_repositories" as any)
          .select("id,name,description,owner_name,owner_email,custo_acesso_mensal,custo_manutencao_mensal,criticidade,sla_atualizacao_horas,metadata_updated_at,active,provider")
          .order("name"),
        supabase
          .from("database_connections" as any)
          .select("id,name,description,owner_name,owner_email,custo_acesso_mensal,custo_manutencao_mensal,criticidade,sla_atualizacao_horas,metadata_updated_at,active,engine")
          .order("name"),
      ]);
      if (repos.error) throw repos.error;
      if (bases.error) throw bases.error;
      const a: Item[] = ((repos.data ?? []) as any[]).map((r) => ({ ...r, target: "repositorio" as Alvo, origem: r.provider }));
      const b: Item[] = ((bases.data ?? []) as any[]).map((r) => ({ ...r, target: "base" as Alvo, origem: r.engine }));
      return [...a, ...b];
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const table = editing.target === "base" ? "database_connections" : "data_repositories";
      const { data: auth } = await supabase.auth.getUser();
      const patch = {
        description: form.description ?? null,
        owner_name: form.owner_name ?? null,
        owner_email: form.owner_email ?? null,
        custo_acesso_mensal: Number(form.custo_acesso_mensal ?? 0),
        custo_manutencao_mensal: Number(form.custo_manutencao_mensal ?? 0),
        criticidade: form.criticidade ?? "media",
        sla_atualizacao_horas: Number(form.sla_atualizacao_horas ?? 24),
        metadata_updated_at: new Date().toISOString(),
        metadata_updated_by: auth.user?.id ?? null,
      };
      const { error } = await supabase.from(table as any).update(patch as any).eq("id", editing.id);
      if (error) throw error;
      await logInfraAudit({
        entity_type: editing.target === "base" ? "database" : "repository",
        entity_id: editing.id,
        entity_name: editing.name,
        action: "update",
        motivo: motivo.trim() || "Atualização de metadados (responsável e custos)",
        before_json: {
          description: editing.description,
          owner_name: editing.owner_name,
          owner_email: editing.owner_email,
          custo_acesso_mensal: editing.custo_acesso_mensal,
          custo_manutencao_mensal: editing.custo_manutencao_mensal,
          criticidade: editing.criticidade,
          sla_atualizacao_horas: editing.sla_atualizacao_horas,
        },
        after_json: patch,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repo-metadados"] });
      setEditing(null);
      setMotivo("");
      toast({ title: "Metadados guardados", description: "Alteração registada na trilha de auditoria." });
    },
    onError: (e: Error) => toast({ title: "Erro ao guardar", description: e.message, variant: "destructive" }),
  });

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return itens.filter(
      (i) =>
        (filtro === "todos" || i.target === filtro) &&
        (!t ||
          i.name.toLowerCase().includes(t) ||
          (i.owner_name ?? "").toLowerCase().includes(t) ||
          (i.owner_email ?? "").toLowerCase().includes(t)),
    );
  }, [itens, filtro, busca]);

  const totais = useMemo(() => {
    const acesso = filtrados.reduce((s, i) => s + Number(i.custo_acesso_mensal ?? 0), 0);
    const manut = filtrados.reduce((s, i) => s + Number(i.custo_manutencao_mensal ?? 0), 0);
    const semDono = filtrados.filter((i) => !i.owner_name).length;
    return { acesso, manut, total: acesso + manut, semDono };
  }, [filtrados]);

  const abrir = (i: Item) => {
    setEditing(i);
    setForm({ ...i });
    setMotivo("");
  };

  return (
    <div className="lg:col-span-3 space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Custo de acesso / mês" value={money(totais.acesso)} />
        <Kpi label="Custo de manutenção / mês" value={money(totais.manut)} />
        <Kpi label="Custo total / mês" value={money(totais.total)} strong />
        <Kpi label="Sem responsável definido" value={String(totais.semDono)} warn={totais.semDono > 0} />
      </div>

      <Card className="surface-card">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <div>
            <CardTitle className="text-heading-2 flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-primary" /> Metadados de repositórios e bases
            </CardTitle>
            <CardDescription className="text-body-sm">
              Descrição, responsável, custos e criticidade. Cada alteração fica registada na trilha de auditoria.
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
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> A carregar...
                </TableCell></TableRow>
              )}
              {!isLoading && filtrados.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum registo encontrado.
                </TableCell></TableRow>
              )}
              {filtrados.map((i) => (
                <TableRow key={`${i.target}-${i.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      {i.target === "base" ? <Database className="h-3.5 w-3.5 text-muted-foreground" /> : <FolderArchive className="h-3.5 w-3.5 text-muted-foreground" />}
                      {i.name}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {i.description?.slice(0, 70) || "Sem descrição"}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px]">
                    {i.owner_name ? (
                      <>
                        <div>{i.owner_name}</div>
                        <span className="text-[11px] text-muted-foreground">{i.owner_email ?? "—"}</span>
                      </>
                    ) : (
                      <span className="text-warning">Por definir</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] ${CRIT_CLASS[i.criticidade] ?? ""}`}>
                      {CRITICIDADES.find((c) => c.value === i.criticidade)?.label ?? i.criticidade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[12px]">{money(i.custo_acesso_mensal)}</TableCell>
                  <TableCell className="text-right font-mono text-[12px]">{money(i.custo_manutencao_mensal)}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><HistoryIcon className="h-3 w-3" />{fmt(i.metadata_updated_at)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => abrir(i)}>
                      <Edit3 className="h-3 w-3" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Metadados — {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[12px]">Descrição</Label>
              <Textarea
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Para que serve esta origem de dados"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Responsável</Label>
                <Input value={form.owner_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))} placeholder="Nome" />
              </div>
              <div>
                <Label className="text-[12px]">E-mail do responsável</Label>
                <Input type="email" value={form.owner_email ?? ""} onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))} placeholder="nome@orgao.gov.br" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Custo de acesso mensal (R$)</Label>
                <Input type="number" min={0} step="0.01" value={form.custo_acesso_mensal ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, custo_acesso_mensal: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-[12px]">Custo de manutenção mensal (R$)</Label>
                <Input type="number" min={0} step="0.01" value={form.custo_manutencao_mensal ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, custo_manutencao_mensal: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Criticidade</Label>
                <Select value={form.criticidade ?? "media"} onValueChange={(v) => setForm((f) => ({ ...f, criticidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRITICIDADES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Prazo de atualização (horas)</Label>
                <Input type="number" min={1} value={form.sla_atualizacao_horas ?? 24}
                  onChange={(e) => setForm((f) => ({ ...f, sla_atualizacao_horas: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label className="text-[12px]">Motivo da alteração (auditoria)</Label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: revisão anual de contratos" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <Card className="surface-card">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 font-semibold ${strong ? "text-xl text-primary" : warn ? "text-xl text-warning" : "text-xl text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
