import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Database, Plus, Trash2, Edit3, Search, Zap, Loader2,
  CheckCircle2, AlertTriangle, XCircle, Lock, Unlock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Engine =
  | "postgres" | "mysql" | "mssql" | "mariadb" | "mongodb" | "oracle"
  | "oci_autonomous" | "snowflake" | "bigquery" | "redshift" | "clickhouse"
  | "dynamodb" | "cosmosdb" | "sqlite" | "duckdb" | "outro";

type TestStatus = "ok" | "warn" | "fail" | "pending";

type DBConn = {
  id: string;
  name: string;
  description: string;
  engine: Engine;
  config: Record<string, any>;
  credentials_ref: string | null;
  tags: string[];
  read_only: boolean;
  last_test_at: string | null;
  last_test_status: TestStatus | null;
  last_test_message: string | null;
  active: boolean;
  updated_at: string;
};

const ENGINES: { value: Engine; label: string; group: "Relacional" | "NoSQL" | "Analítico / Data Warehouse" | "Embedded / Outro" }[] = [
  { value: "postgres",       label: "PostgreSQL",           group: "Relacional" },
  { value: "mysql",          label: "MySQL",                group: "Relacional" },
  { value: "mariadb",        label: "MariaDB",              group: "Relacional" },
  { value: "mssql",          label: "Microsoft SQL Server", group: "Relacional" },
  { value: "oracle",         label: "Oracle Database",      group: "Relacional" },
  { value: "oci_autonomous", label: "Oracle Autonomous DB (OCI)", group: "Relacional" },
  { value: "mongodb",        label: "MongoDB",              group: "NoSQL" },
  { value: "dynamodb",       label: "AWS DynamoDB",         group: "NoSQL" },
  { value: "cosmosdb",       label: "Azure Cosmos DB",      group: "NoSQL" },
  { value: "snowflake",      label: "Snowflake",            group: "Analítico / Data Warehouse" },
  { value: "bigquery",       label: "Google BigQuery",      group: "Analítico / Data Warehouse" },
  { value: "redshift",       label: "AWS Redshift",         group: "Analítico / Data Warehouse" },
  { value: "clickhouse",     label: "ClickHouse",           group: "Analítico / Data Warehouse" },
  { value: "duckdb",         label: "DuckDB",               group: "Embedded / Outro" },
  { value: "sqlite",         label: "SQLite",               group: "Embedded / Outro" },
  { value: "outro",          label: "Outro (JDBC/ODBC custom)", group: "Embedded / Outro" },
];

type FieldSpec = { key: string; label: string; type?: "text" | "password" | "number" | "textarea"; required?: boolean; placeholder?: string; hint?: string };

const CONFIG_SCHEMA: Record<Engine, FieldSpec[]> = {
  postgres: [
    { key: "host", label: "Host", required: true, placeholder: "db.empresa.gov.br" },
    { key: "port", label: "Porta", type: "number", placeholder: "5432" },
    { key: "database", label: "Database", required: true },
    { key: "schema", label: "Schema", placeholder: "public" },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
    { key: "ssl", label: "SSL (require/verify-full/disable)", placeholder: "require" },
  ],
  mysql: [
    { key: "host", label: "Host", required: true },
    { key: "port", label: "Porta", type: "number", placeholder: "3306" },
    { key: "database", label: "Database", required: true },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
    { key: "ssl", label: "SSL (true/false)", placeholder: "true" },
  ],
  mariadb: [
    { key: "host", label: "Host", required: true },
    { key: "port", label: "Porta", type: "number", placeholder: "3306" },
    { key: "database", label: "Database", required: true },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
  ],
  mssql: [
    { key: "host", label: "Host", required: true },
    { key: "port", label: "Porta", type: "number", placeholder: "1433" },
    { key: "database", label: "Database", required: true },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
    { key: "encrypt", label: "Encrypt (true/false)", placeholder: "true" },
  ],
  oracle: [
    { key: "host", label: "Host", required: true },
    { key: "port", label: "Porta", type: "number", placeholder: "1521" },
    { key: "service_name", label: "Service Name / SID", required: true },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
  ],
  oci_autonomous: [
    { key: "host", label: "Host (adb URL)", required: true, placeholder: "adb.sa-saopaulo-1.oraclecloud.com" },
    { key: "service_name", label: "Service Name", required: true, placeholder: "mydb_high" },
    { key: "wallet_path", label: "Wallet path" },
    { key: "wallet_password", label: "Wallet password", type: "password" },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
  ],
  mongodb: [
    { key: "host", label: "Host / URI seed", required: true, placeholder: "cluster0.mongodb.net" },
    { key: "port", label: "Porta", type: "number", placeholder: "27017" },
    { key: "database", label: "Database" },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
    { key: "auth_source", label: "AuthSource", placeholder: "admin" },
    { key: "replica_set", label: "Replica set" },
    { key: "srv", label: "SRV (true/false)", placeholder: "true" },
  ],
  dynamodb: [
    { key: "host", label: "Endpoint (região)", required: true, placeholder: "dynamodb.us-east-1.amazonaws.com" },
    { key: "region", label: "Região", placeholder: "us-east-1" },
    { key: "access_key_id", label: "Access Key ID" },
    { key: "secret_access_key", label: "Secret Access Key", type: "password" },
  ],
  cosmosdb: [
    { key: "host", label: "Endpoint (URI)", required: true, placeholder: "https://minhaconta.documents.azure.com:443/" },
    { key: "key", label: "Primary Key", type: "password" },
    { key: "database", label: "Database" },
    { key: "api", label: "API (sql/mongo/cassandra/table)", placeholder: "sql" },
  ],
  snowflake: [
    { key: "account", label: "Account", required: true, placeholder: "xy12345.sa-east-1" },
    { key: "warehouse", label: "Warehouse" },
    { key: "database", label: "Database" },
    { key: "schema", label: "Schema" },
    { key: "role", label: "Role" },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
  ],
  bigquery: [
    { key: "project_id", label: "Project ID", required: true },
    { key: "dataset", label: "Dataset padrão" },
    { key: "location", label: "Location", placeholder: "US" },
    { key: "service_account_json", label: "Service Account JSON", type: "textarea" },
  ],
  redshift: [
    { key: "host", label: "Host", required: true, placeholder: "cluster.abc.us-east-1.redshift.amazonaws.com" },
    { key: "port", label: "Porta", type: "number", placeholder: "5439" },
    { key: "database", label: "Database", required: true },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
  ],
  clickhouse: [
    { key: "host", label: "Host", required: true },
    { key: "port", label: "Porta HTTP(S)", type: "number", placeholder: "8443" },
    { key: "database", label: "Database" },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
    { key: "secure", label: "Secure (true/false)", placeholder: "true" },
  ],
  sqlite: [
    { key: "path", label: "Caminho do arquivo .db", required: true, placeholder: "/data/local.db" },
  ],
  duckdb: [
    { key: "path", label: "Caminho do arquivo .duckdb", required: true, placeholder: "/data/analytics.duckdb" },
  ],
  outro: [
    { key: "jdbc_url", label: "JDBC/ODBC URL" },
    { key: "driver", label: "Driver class / DSN" },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
    { key: "notes", label: "Notas", type: "textarea" },
  ],
};

const engineLabel = (e: Engine) => ENGINES.find((x) => x.value === e)?.label ?? e;
const engineGroup = (e: Engine) => ENGINES.find((x) => x.value === e)?.group ?? "Outro";

const statusPill = (s: TestStatus | null) => {
  if (!s) return null;
  const map: Record<TestStatus, { cls: string; icon: any; label: string }> = {
    ok:      { cls: "text-emerald-600 bg-emerald-50 border-emerald-200",  icon: CheckCircle2, label: "OK" },
    warn:    { cls: "text-amber-600 bg-amber-50 border-amber-200",        icon: AlertTriangle, label: "Atenção" },
    fail:    { cls: "text-red-600 bg-red-50 border-red-200",              icon: XCircle,       label: "Falha" },
    pending: { cls: "text-muted-foreground bg-muted border-border",       icon: Loader2,       label: "Pendente" },
  };
  const m = map[s]; const Icon = m.icon;
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${m.cls}`}>
      <Icon className={`h-2.5 w-2.5 ${s === "pending" ? "animate-spin" : ""}`} /> {m.label}
    </Badge>
  );
};

export function DatabaseConnectionsConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [engineFilter, setEngineFilter] = useState<"all" | Engine>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DBConn | null>(null);
  const [form, setForm] = useState<Partial<DBConn> & { tagsText?: string }>({
    engine: "postgres", active: true, read_only: true, tagsText: "", config: {},
  });
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["database_connections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("database_connections" as any).select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DBConn[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (engineFilter !== "all" && r.engine !== engineFilter) return false;
      if (!q) return true;
      return `${r.name} ${r.description} ${r.tags?.join(" ")} ${engineLabel(r.engine)}`.toLowerCase().includes(q);
    });
  }, [items, search, engineFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ engine: "postgres", active: true, read_only: true, tagsText: "", config: {} });
    setOpen(true);
  };
  const openEdit = (r: DBConn) => {
    setEditing(r);
    setForm({ ...r, tagsText: r.tags?.join(", ") ?? "", config: r.config || {} });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Nome é obrigatório");
      const spec = CONFIG_SCHEMA[form.engine as Engine] || [];
      for (const f of spec) {
        if (f.required && !form.config?.[f.key]) throw new Error(`Campo obrigatório: ${f.label}`);
      }
      const tags = (form.tagsText || "").split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        name: form.name,
        description: form.description ?? "",
        engine: form.engine ?? "postgres",
        config: form.config ?? {},
        credentials_ref: form.credentials_ref ?? null,
        tags,
        read_only: form.read_only ?? true,
        active: form.active ?? true,
      };
      if (editing) {
        const { error } = await supabase.from("database_connections" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("database_connections" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["database_connections"] });
      toast({ title: editing ? "Conexão atualizada" : "Conexão cadastrada" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("database_connections" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["database_connections"] });
      toast({ title: "Conexão removida" });
    },
  });

  const testConn = async (r: DBConn) => {
    setTestingId(r.id);
    try {
      const { data, error } = await supabase.functions.invoke("connection-test", {
        body: { target: "database", id: r.id },
      });
      if (error) throw error;
      const status = data?.status || "warn";
      toast({
        title: `Teste: ${status.toUpperCase()}`,
        description: data?.message || "Concluído",
        variant: status === "fail" ? "destructive" : "default",
      });
      qc.invalidateQueries({ queryKey: ["database_connections"] });
    } catch (e: any) {
      toast({ title: "Falha no teste", description: e.message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const spec = CONFIG_SCHEMA[form.engine as Engine] || [];
  const totalActive = items.filter((i) => i.active).length;

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> Bases de dados
          </CardTitle>
          <CardDescription className="text-body-sm">
            Conexões a bancos relacionais, NoSQL e data warehouses consultados pelos agentes —
            <span className="ml-1 font-medium text-primary">{totalActive} ativa(s)</span> de {items.length}
          </CardDescription>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Nova conexão
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-9 pl-8 text-[12px]" placeholder="Buscar por nome, engine, tag..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={engineFilter} onValueChange={(v) => setEngineFilter(v as any)}>
            <SelectTrigger className="h-9 text-[12px] w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">Todos os engines</SelectItem>
              {ENGINES.map((e) => (
                <SelectItem key={e.value} value={e.value} className="text-[12px]">
                  {e.label} <span className="opacity-60">— {e.group}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">A carregar...</p>
        ) : filtered.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">Nenhuma conexão cadastrada.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{engineLabel(r.engine)}</Badge>
                      <Badge variant="outline" className="text-[10px]">{engineGroup(r.engine)}</Badge>
                      {statusPill(r.last_test_status)}
                      <Badge variant="outline" className={`text-[10px] gap-1 ${r.read_only ? "text-emerald-700" : "text-amber-700"}`}>
                        {r.read_only ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                        {r.read_only ? "read-only" : "read-write"}
                      </Badge>
                      {!r.active && <Badge variant="outline" className="text-[10px] bg-muted">Inativo</Badge>}
                    </div>
                    <h3 className="font-medium text-[13px] leading-snug">{r.name}</h3>
                    {r.description && (
                      <p className="text-caption text-muted-foreground line-clamp-2 mt-0.5">{r.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground font-mono">
                      {r.config?.host && <span>host: {r.config.host}{r.config?.port ? `:${r.config.port}` : ""}</span>}
                      {r.config?.database && <span>db: {r.config.database}</span>}
                      {r.config?.account && <span>account: {r.config.account}</span>}
                      {r.config?.project_id && <span>project: {r.config.project_id}</span>}
                    </div>
                    {r.last_test_message && (
                      <p className="text-[10px] mt-1 text-muted-foreground italic line-clamp-1">{r.last_test_message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Switch checked={r.active} onCheckedChange={async (v) => {
                      await supabase.from("database_connections" as any).update({ active: v }).eq("id", r.id);
                      qc.invalidateQueries({ queryKey: ["database_connections"] });
                    }} className="scale-75" />
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                        onClick={() => testConn(r)} disabled={testingId === r.id} title="Testar conexão">
                        {testingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-primary" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => remove.mutate(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
                {r.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.tags.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-soft text-primary">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar conexão" : "Nova conexão de banco de dados"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Engine</Label>
                <Select value={form.engine} onValueChange={(v) => setForm({ ...form, engine: v as Engine, config: {} })}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Relacional","NoSQL","Analítico / Data Warehouse","Embedded / Outro"] as const).map((g) => (
                      <div key={g}>
                        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{g}</div>
                        {ENGINES.filter((e) => e.group === g).map((e) => (
                          <SelectItem key={e.value} value={e.value} className="text-[12px]">{e.label}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Nome</Label>
                <Input className="h-9 text-[12px]" value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Descrição</Label>
                <Textarea rows={2} className="text-[12px]" value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Tags</Label>
                <Input className="h-9 text-[12px]" value={form.tagsText || ""}
                  onChange={(e) => setForm({ ...form, tagsText: e.target.value })} />
              </div>

              <div className="border border-border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold">Configuração — {engineLabel(form.engine as Engine)}</Label>
                  <Badge variant="outline" className="text-[9px]">{engineGroup(form.engine as Engine)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {spec.map((f) => (
                    <div key={f.key} className={`space-y-1 ${f.type === "textarea" ? "col-span-2" : ""}`}>
                      <Label className="text-[10px]">
                        {f.label} {f.required && <span className="text-destructive">*</span>}
                      </Label>
                      {f.type === "textarea" ? (
                        <Textarea rows={3} className="text-[11px] font-mono"
                          placeholder={f.placeholder}
                          value={form.config?.[f.key] || ""}
                          onChange={(e) => setForm({ ...form, config: { ...form.config, [f.key]: e.target.value } })}
                        />
                      ) : (
                        <Input className="h-8 text-[11px]"
                          type={f.type || "text"}
                          placeholder={f.placeholder}
                          value={form.config?.[f.key] || ""}
                          onChange={(e) => setForm({ ...form, config: { ...form.config, [f.key]: e.target.value } })}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  ⚠ Segredos ficam restritos a admin/gestor via RLS.
                  Para produção, use <span className="font-mono">credentials_ref</span> apontando para segredo do cofre.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Ref. de segredo</Label>
                <Input className="h-9 text-[12px] font-mono" placeholder="MEU_DB_PASSWORD"
                  value={form.credentials_ref || ""}
                  onChange={(e) => setForm({ ...form, credentials_ref: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label className="text-[12px]">Ativa</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.read_only ?? true} onCheckedChange={(v) => setForm({ ...form, read_only: v })} />
                  <Label className="text-[12px]">Somente leitura</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editing ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
