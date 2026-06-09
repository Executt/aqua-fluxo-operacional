import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FolderArchive, Plus, Trash2, Edit3, ExternalLink, FileText, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type PdfRepo = {
  id: string;
  name: string;
  description: string;
  url: string;
  source: "publico" | "interno" | "drive" | "outro";
  doc_count: number;
  tags: string[];
  active: boolean;
  updated_at: string;
};

const STORAGE_KEY = "sigsan:pdf-repos:v1";

const SEED: PdfRepo[] = [
  {
    id: "rep-conama",
    name: "Resoluções CONAMA — Efluentes",
    description: "Coletânea oficial de resoluções CONAMA 357/2005, 430/2011 e correlatas sobre lançamento de efluentes.",
    url: "https://www.gov.br/mma/pt-br/assuntos/conama",
    source: "publico",
    doc_count: 18,
    tags: ["CONAMA", "efluentes", "regulatório"],
    active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: "rep-ana-normas",
    name: "ANA — Normas de Referência (NR)",
    description: "Normas de Referência publicadas pela ANA para regulação do saneamento básico (Lei 14.026/2020).",
    url: "https://www.gov.br/ana/pt-br/assuntos/saneamento-basico/normas-de-referencia",
    source: "publico",
    doc_count: 24,
    tags: ["ANA", "saneamento", "NR"],
    active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: "rep-abnt",
    name: "ABNT NBR — Esgotamento Sanitário",
    description: "Normas ABNT NBR 9648, 9649, 12209 e 13969 — projeto de redes e ETEs.",
    url: "https://www.abntcatalogo.com.br/",
    source: "interno",
    doc_count: 12,
    tags: ["ABNT", "ETE", "técnico"],
    active: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: "rep-snis",
    name: "SNIS — Glossário & Manuais",
    description: "Manuais metodológicos e glossário do Sistema Nacional de Informações sobre Saneamento.",
    url: "https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/snis",
    source: "publico",
    doc_count: 9,
    tags: ["SNIS", "indicadores"],
    active: true,
    updated_at: new Date().toISOString(),
  },
];

const load = (): PdfRepo[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    return JSON.parse(raw);
  } catch {
    return SEED;
  }
};
const save = (list: PdfRepo[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

const sourceLabel: Record<PdfRepo["source"], string> = {
  publico: "Público",
  interno: "Interno",
  drive: "Drive/SharePoint",
  outro: "Outro",
};

export function PdfRepositoriesConfig() {
  const { toast } = useToast();
  const [items, setItems] = useState<PdfRepo[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PdfRepo | null>(null);
  const [form, setForm] = useState<Partial<PdfRepo> & { tagsText?: string }>({
    source: "publico", active: true, doc_count: 0, tagsText: "",
  });

  useEffect(() => { setItems(load()); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      `${r.name} ${r.description} ${r.tags.join(" ")}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalDocs = items.reduce((sum, r) => sum + (r.active ? r.doc_count : 0), 0);

  const openNew = () => {
    setEditing(null);
    setForm({ source: "publico", active: true, doc_count: 0, tagsText: "" });
    setOpen(true);
  };
  const openEdit = (r: PdfRepo) => {
    setEditing(r);
    setForm({ ...r, tagsText: r.tags.join(", ") });
    setOpen(true);
  };

  const persist = () => {
    if (!form.name || !form.url) {
      toast({ title: "Erro", description: "Informe nome e URL.", variant: "destructive" });
      return;
    }
    const tags = (form.tagsText || "").split(",").map((t) => t.trim()).filter(Boolean);
    const next: PdfRepo = {
      id: editing?.id || `rep-${Date.now()}`,
      name: form.name!,
      description: form.description || "",
      url: form.url!,
      source: (form.source as PdfRepo["source"]) || "publico",
      doc_count: Number(form.doc_count) || 0,
      tags,
      active: form.active ?? true,
      updated_at: new Date().toISOString(),
    };
    const list = editing
      ? items.map((i) => (i.id === editing.id ? next : i))
      : [next, ...items];
    setItems(list); save(list); setOpen(false);
    toast({ title: editing ? "Repositório atualizado" : "Repositório adicionado" });
  };

  const remove = (id: string) => {
    const list = items.filter((i) => i.id !== id);
    setItems(list); save(list);
    toast({ title: "Repositório removido" });
  };

  const toggle = (id: string) => {
    const list = items.map((i) => i.id === id ? { ...i, active: !i.active, updated_at: new Date().toISOString() } : i);
    setItems(list); save(list);
  };

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <FolderArchive className="h-4 w-4 text-primary" /> Repositórios de PDF
          </CardTitle>
          <CardDescription className="text-body-sm">
            Bibliotecas de normas, manuais e documentos consultados pelos agentes —
            <span className="ml-1 font-medium text-primary">{totalDocs} documentos ativos</span>
          </CardDescription>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Novo repositório
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-9 pl-8 text-[12px]"
            placeholder="Buscar repositório..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">Nenhum repositório encontrado.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{sourceLabel[r.source]}</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <FileText className="h-2.5 w-2.5" />{r.doc_count} docs
                      </Badge>
                      {!r.active && <Badge variant="outline" className="text-[10px] bg-muted">Inativo</Badge>}
                    </div>
                    <h3 className="font-medium text-[13px] leading-snug">{r.name}</h3>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Switch checked={r.active} onCheckedChange={() => toggle(r.id)} className="scale-75" />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-caption text-muted-foreground line-clamp-2 mb-2">{r.description}</p>
                <div className="flex flex-wrap items-center gap-1 justify-between">
                  <div className="flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-soft text-primary">{t}</span>
                    ))}
                  </div>
                  <a
                    href={r.url} target="_blank" rel="noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar repositório" : "Novo repositório de PDF"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Nome</Label>
                <Input className="h-9 text-[12px]" value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">URL / Caminho</Label>
                <Input className="h-9 text-[12px]" placeholder="https://..." value={form.url || ""}
                  onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Origem</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background text-[12px] px-2"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value as PdfRepo["source"] })}
                  >
                    <option value="publico">Público</option>
                    <option value="interno">Interno</option>
                    <option value="drive">Drive/SharePoint</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Nº de documentos</Label>
                  <Input type="number" className="h-9 text-[12px]" value={form.doc_count ?? 0}
                    onChange={(e) => setForm({ ...form, doc_count: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Tags (separadas por vírgula)</Label>
                <Input className="h-9 text-[12px]" value={form.tagsText || ""}
                  onChange={(e) => setForm({ ...form, tagsText: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Descrição</Label>
                <Textarea rows={3} className="text-[12px]" value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label className="text-[12px]">Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={persist}>{editing ? "Atualizar" : "Cadastrar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
