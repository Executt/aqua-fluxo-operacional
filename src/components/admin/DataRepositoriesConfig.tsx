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
  FolderArchive, Plus, Trash2, Edit3, ExternalLink, FileText, Search, Zap, Image as ImageIcon, Map,
  CheckCircle2, AlertTriangle, XCircle, Loader2, Cloud, HardDrive,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Provider =
  | "aws_s3" | "azure_blob" | "gcp_gcs" | "oci_object"
  | "google_drive" | "onedrive" | "sharepoint" | "dropbox" | "box"
  | "filesystem" | "ftp" | "sftp" | "http" | "minio" | "outro";

type Kind = "documents" | "images" | "geospatial" | "mixed";
type TestStatus = "ok" | "warn" | "fail" | "pending";

type Repo = {
  id: string;
  name: string;
  description: string;
  kind: Kind;
  provider: Provider;
  config: Record<string, any>;
  credentials_ref: string | null;
  tags: string[];
  doc_count: number;
  size_bytes: number;
  last_test_at: string | null;
  last_test_status: TestStatus | null;
  last_test_message: string | null;
  active: boolean;
  updated_at: string;
};

const PROVIDERS: { value: Provider; label: string; group: "Nuvem pública" | "Colaboração" | "On-premises / Rede" }[] = [
  { value: "aws_s3", label: "AWS S3", group: "Nuvem pública" },
  { value: "azure_blob", label: "Azure Blob Storage", group: "Nuvem pública" },
  { value: "gcp_gcs", label: "Google Cloud Storage", group: "Nuvem pública" },
  { value: "oci_object", label: "Oracle OCI Object Storage", group: "Nuvem pública" },
  { value: "minio", label: "MinIO (S3-compatible)", group: "Nuvem pública" },
  { value: "google_drive", label: "Google Drive", group: "Colaboração" },
  { value: "onedrive", label: "Microsoft OneDrive", group: "Colaboração" },
  { value: "sharepoint", label: "Microsoft SharePoint", group: "Colaboração" },
  { value: "dropbox", label: "Dropbox", group: "Colaboração" },
  { value: "box", label: "Box", group: "Colaboração" },
  { value: "filesystem", label: "Sistema de arquivos local", group: "On-premises / Rede" },
  { value: "ftp", label: "FTP", group: "On-premises / Rede" },
  { value: "sftp", label: "SFTP / SSH", group: "On-premises / Rede" },
  { value: "http", label: "HTTP / WebDAV", group: "On-premises / Rede" },
  { value: "outro", label: "Outro (customizado)", group: "On-premises / Rede" },
];

const KIND_META: Record<Kind, { label: string; icon: typeof FileText; hint: string }> = {
  documents:  { label: "Documentos",   icon: FileText,  hint: "PDF, Word, Excel, TXT, CSV, Markdown" },
  images:     { label: "Imagens",      icon: ImageIcon, hint: "JPG, PNG, TIFF, WEBP, HEIC" },
  geospatial: { label: "Geoespacial",  icon: Map,       hint: "Shapefile, GeoJSON, KML, GeoTIFF, GPKG" },
  mixed:      { label: "Misto",        icon: FolderArchive, hint: "Qualquer tipo de arquivo" },
};

// Campos por provider — chave, label, tipo, obrigatório, placeholder, hint
type FieldSpec = { key: string; label: string; type?: "text" | "password" | "number" | "textarea"; required?: boolean; placeholder?: string; hint?: string };

const CONFIG_SCHEMA: Record<Provider, FieldSpec[]> = {
  aws_s3: [
    { key: "bucket", label: "Bucket", required: true, placeholder: "meu-bucket" },
    { key: "region", label: "Região", required: true, placeholder: "us-east-1" },
    { key: "prefix", label: "Prefixo (path)", placeholder: "docs/normativos/" },
    { key: "endpoint", label: "Endpoint customizado", placeholder: "https://s3.amazonaws.com (opcional)" },
    { key: "access_key_id", label: "Access Key ID", placeholder: "AKIA..." },
    { key: "secret_access_key", label: "Secret Access Key", type: "password" },
  ],
  azure_blob: [
    { key: "account", label: "Storage Account", required: true, placeholder: "meucontainerstorage" },
    { key: "container", label: "Container", required: true, placeholder: "documentos" },
    { key: "prefix", label: "Prefixo (path)", placeholder: "regulatorio/" },
    { key: "sas_token", label: "SAS Token", type: "password", placeholder: "?sv=..." },
    { key: "account_key", label: "Account Key (opcional)", type: "password" },
  ],
  gcp_gcs: [
    { key: "bucket", label: "Bucket", required: true, placeholder: "meu-bucket" },
    { key: "prefix", label: "Prefixo (path)", placeholder: "docs/" },
    { key: "service_account_json", label: "Service Account JSON", type: "textarea", placeholder: '{"type":"service_account", ...}' },
  ],
  oci_object: [
    { key: "endpoint", label: "Endpoint OCI", required: true, placeholder: "https://objectstorage.sa-saopaulo-1.oraclecloud.com" },
    { key: "namespace", label: "Namespace", required: true },
    { key: "bucket", label: "Bucket", required: true },
    { key: "region", label: "Região", placeholder: "sa-saopaulo-1" },
    { key: "tenancy_ocid", label: "Tenancy OCID" },
    { key: "user_ocid", label: "User OCID" },
    { key: "fingerprint", label: "Fingerprint" },
    { key: "private_key", label: "Private key (PEM)", type: "textarea" },
  ],
  minio: [
    { key: "endpoint", label: "Endpoint", required: true, placeholder: "https://minio.empresa.gov.br" },
    { key: "bucket", label: "Bucket", required: true },
    { key: "access_key_id", label: "Access Key" },
    { key: "secret_access_key", label: "Secret Key", type: "password" },
    { key: "region", label: "Região", placeholder: "us-east-1" },
  ],
  google_drive: [
    { key: "folder_id", label: "Folder ID", required: true, placeholder: "1AbCdEf..." },
    { key: "oauth_client_id", label: "OAuth Client ID" },
    { key: "oauth_refresh_token", label: "OAuth Refresh Token", type: "password" },
  ],
  onedrive: [
    { key: "drive_id", label: "Drive ID", required: true },
    { key: "folder_path", label: "Pasta (path)", placeholder: "/Documentos/SIGSAN" },
    { key: "tenant_id", label: "Tenant ID (Azure AD)" },
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", type: "password" },
  ],
  sharepoint: [
    { key: "site_url", label: "Site URL", required: true, placeholder: "https://empresa.sharepoint.com/sites/sigsan" },
    { key: "document_library", label: "Biblioteca", placeholder: "Documentos" },
    { key: "folder_path", label: "Pasta", placeholder: "/Regulatorio" },
    { key: "tenant_id", label: "Tenant ID" },
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", type: "password" },
  ],
  dropbox: [
    { key: "folder_path", label: "Pasta", required: true, placeholder: "/SIGSAN" },
    { key: "access_token", label: "Access Token", type: "password" },
  ],
  box: [
    { key: "folder_id", label: "Folder ID", required: true },
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", type: "password" },
    { key: "enterprise_id", label: "Enterprise ID" },
  ],
  filesystem: [
    { key: "path", label: "Caminho absoluto", required: true, placeholder: "/mnt/sigsan/documentos" },
    { key: "recursive", label: "Recursivo? (true/false)", placeholder: "true" },
  ],
  ftp: [
    { key: "host", label: "Host", required: true, placeholder: "ftp.empresa.gov.br" },
    { key: "port", label: "Porta", type: "number", placeholder: "21" },
    { key: "path", label: "Path", placeholder: "/documentos" },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
    { key: "passive", label: "Modo passivo (true/false)", placeholder: "true" },
  ],
  sftp: [
    { key: "host", label: "Host", required: true, placeholder: "sftp.empresa.gov.br" },
    { key: "port", label: "Porta", type: "number", placeholder: "22" },
    { key: "path", label: "Path" },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
    { key: "private_key", label: "Chave privada (opcional)", type: "textarea" },
  ],
  http: [
    { key: "url", label: "URL base", required: true, placeholder: "https://api.empresa.gov.br/documentos" },
    { key: "auth_type", label: "Auth (none/basic/bearer)", placeholder: "bearer" },
    { key: "username", label: "Usuário (basic)" },
    { key: "password", label: "Senha/Token", type: "password" },
    { key: "headers_json", label: "Headers extras (JSON)", type: "textarea", placeholder: '{"X-App":"sigsan"}' },
  ],
  outro: [
    { key: "endpoint", label: "Endpoint / URI" },
    { key: "notes", label: "Notas técnicas", type: "textarea" },
  ],
};

const providerLabel = (p: Provider) => PROVIDERS.find((x) => x.value === p)?.label ?? p;
const providerGroup = (p: Provider) => PROVIDERS.find((x) => x.value === p)?.group ?? "Outro";

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

export function DataRepositoriesConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | Kind>("all");
  const [providerFilter, setProviderFilter] = useState<"all" | Provider>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Repo | null>(null);
  const [form, setForm] = useState<Partial<Repo> & { tagsText?: string }>({
    kind: "documents", provider: "aws_s3", active: true, tagsText: "", config: {},
  });
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["data_repositories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("data_repositories" as any).select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Repo[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (providerFilter !== "all" && r.provider !== providerFilter) return false;
      if (!q) return true;
      return `${r.name} ${r.description} ${r.tags?.join(" ")} ${providerLabel(r.provider)}`.toLowerCase().includes(q);
    });
  }, [items, search, kindFilter, providerFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ kind: "documents", provider: "aws_s3", active: true, tagsText: "", config: {} });
    setOpen(true);
  };
  const openEdit = (r: Repo) => {
    setEditing(r);
    setForm({ ...r, tagsText: r.tags?.join(", ") ?? "", config: r.config || {} });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Nome é obrigatório");
      const spec = CONFIG_SCHEMA[form.provider as Provider] || [];
      for (const f of spec) {
        if (f.required && !form.config?.[f.key]) throw new Error(`Campo obrigatório: ${f.label}`);
      }
      const tags = (form.tagsText || "").split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        name: form.name,
        description: form.description ?? "",
        kind: form.kind ?? "documents",
        provider: form.provider ?? "aws_s3",
        config: form.config ?? {},
        credentials_ref: form.credentials_ref ?? null,
        tags,
        active: form.active ?? true,
      };
      if (editing) {
        const { error } = await supabase.from("data_repositories" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("data_repositories" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data_repositories"] });
      toast({ title: editing ? "Repositório atualizado" : "Repositório cadastrado" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("data_repositories" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data_repositories"] });
      toast({ title: "Repositório removido" });
    },
  });

  const testConn = async (r: Repo) => {
    setTestingId(r.id);
    try {
      const { data, error } = await supabase.functions.invoke("connection-test", {
        body: { target: "repository", id: r.id },
      });
      if (error) throw error;
      const status = data?.status || "warn";
      toast({
        title: `Teste: ${status.toUpperCase()}`,
        description: data?.message || "Concluído",
        variant: status === "fail" ? "destructive" : "default",
      });
      qc.invalidateQueries({ queryKey: ["data_repositories"] });
    } catch (e: any) {
      toast({ title: "Falha no teste", description: e.message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const spec = CONFIG_SCHEMA[form.provider as Provider] || [];
  const totalActive = items.filter((i) => i.active).length;

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <FolderArchive className="h-4 w-4 text-primary" /> Repositórios de dados
          </CardTitle>
          <CardDescription className="text-body-sm">
            Documentos (PDF/Word/Excel/TXT), imagens e arquivos geoespaciais em nuvem pública, colaboração ou on-premises —
            <span className="ml-1 font-medium text-primary">{totalActive} ativo(s)</span> de {items.length}
          </CardDescription>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Novo repositório
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-9 pl-8 text-[12px]" placeholder="Buscar por nome, provider, tag..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
            <SelectTrigger className="h-9 text-[12px] w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">Todos os tipos</SelectItem>
              {(Object.keys(KIND_META) as Kind[]).map((k) => (
                <SelectItem key={k} value={k} className="text-[12px]">{KIND_META[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={providerFilter} onValueChange={(v) => setProviderFilter(v as any)}>
            <SelectTrigger className="h-9 text-[12px] w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">Todos os providers</SelectItem>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-[12px]">
                  {p.label} <span className="opacity-60">— {p.group}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {isLoading ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">A carregar...</p>
        ) : filtered.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">Nenhum repositório encontrado.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((r) => {
              const KIcon = KIND_META[r.kind].icon;
              const isCloud = ["aws_s3","azure_blob","gcp_gcs","oci_object","minio","dropbox","box"].includes(r.provider);
              const isCollab = ["google_drive","onedrive","sharepoint"].includes(r.provider);
              const PIcon = isCloud || isCollab ? Cloud : HardDrive;
              return (
                <div key={r.id} className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <KIcon className="h-2.5 w-2.5" /> {KIND_META[r.kind].label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <PIcon className="h-2.5 w-2.5" /> {providerLabel(r.provider)}
                        </Badge>
                        {statusPill(r.last_test_status)}
                        {!r.active && <Badge variant="outline" className="text-[10px] bg-muted">Inativo</Badge>}
                      </div>
                      <h3 className="font-medium text-[13px] leading-snug">{r.name}</h3>
                      {r.description && (
                        <p className="text-caption text-muted-foreground line-clamp-2 mt-0.5">{r.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
                        <span><FileText className="inline h-2.5 w-2.5 mr-0.5" /> {r.doc_count.toLocaleString("pt-BR")} docs</span>
                        {r.config?.bucket && <span className="font-mono">bucket: {r.config.bucket}</span>}
                        {r.config?.endpoint && <span className="font-mono truncate max-w-[160px]">{r.config.endpoint}</span>}
                        {r.last_test_at && <span>testado {new Date(r.last_test_at).toLocaleString("pt-BR")}</span>}
                      </div>
                      {r.last_test_message && (
                        <p className="text-[10px] mt-1 text-muted-foreground italic line-clamp-1">{r.last_test_message}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Switch checked={r.active} onCheckedChange={async (v) => {
                        await supabase.from("data_repositories" as any).update({ active: v }).eq("id", r.id);
                        qc.invalidateQueries({ queryKey: ["data_repositories"] });
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
              );
            })}
          </div>
        )}

        {/* Dialog cadastro/edição */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar repositório" : "Novo repositório de dados"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Tipo de conteúdo</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as Kind })}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_META) as Kind[]).map((k) => (
                        <SelectItem key={k} value={k} className="text-[12px]">
                          {KIND_META[k].label} — <span className="opacity-70">{KIND_META[k].hint}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Provider</Label>
                  <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v as Provider, config: {} })}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Nuvem pública","Colaboração","On-premises / Rede"] as const).map((g) => (
                        <div key={g}>
                          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{g}</div>
                          {PROVIDERS.filter((p) => p.group === g).map((p) => (
                            <SelectItem key={p.value} value={p.value} className="text-[12px]">{p.label}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Nome</Label>
                <Input className="h-9 text-[12px]" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Descrição</Label>
                <Textarea rows={2} className="text-[12px]" value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Tags (separadas por vírgula)</Label>
                <Input className="h-9 text-[12px]" value={form.tagsText || ""}
                  onChange={(e) => setForm({ ...form, tagsText: e.target.value })} />
              </div>

              {/* Config dinâmico */}
              <div className="border border-border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold">Configuração — {providerLabel(form.provider as Provider)}</Label>
                  <Badge variant="outline" className="text-[9px]">{providerGroup(form.provider as Provider)}</Badge>
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
                      {f.hint && <p className="text-[9px] text-muted-foreground">{f.hint}</p>}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  ⚠ Credenciais salvas aqui ficam restritas a administradores/gestores via RLS.
                  Para maior segurança, armazene tokens no cofre de segredos e referencie o nome em <span className="font-mono">credentials_ref</span>.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Ref. de segredo (opcional)</Label>
                <Input className="h-9 text-[12px] font-mono" placeholder="MEU_REPO_TOKEN"
                  value={form.credentials_ref || ""}
                  onChange={(e) => setForm({ ...form, credentials_ref: e.target.value })} />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label className="text-[12px]">Ativo</Label>
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
