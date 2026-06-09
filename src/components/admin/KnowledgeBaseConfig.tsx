import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { BookOpen, Plus, Trash2, Tag, Edit3, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, FolderArchive, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PdfRepositoriesConfig } from "./PdfRepositoriesConfig";
import { SasbDatasetsConfig } from "./SasbDatasetsConfig";
import { useToast } from "@/hooks/use-toast";

type KBItem = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  active: boolean;
  updated_at: string;
};

const categoryLabel: Record<string, string> = {
  geral: "Geral",
  regulatorio: "Regulatório",
  operacional: "Operacional",
  curadoria: "Curadoria",
  tecnico: "Técnico",
};

export function KnowledgeBaseConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KBItem | null>(null);
  const [form, setForm] = useState<Partial<KBItem> & { tagsText?: string }>({
    category: "geral", active: true, tagsText: "",
  });

  // ── Filters ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Sorting + pagination ─────────────────────────────
  type SortKey = "updated_desc" | "updated_asc" | "title_asc" | "title_desc";
  const [sortBy, setSortBy] = useState<SortKey>("updated_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["knowledge_base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as KBItem[];
    },
  });

  // Derived: all unique tags + category counts
  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => it.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((it) => { counts[it.category] = (counts[it.category] || 0) + 1; });
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((it) => {
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (selectedTags.length && !selectedTags.every((t) => it.tags?.includes(t))) return false;
      if (q) {
        const hay = `${it.title} ${it.content} ${(it.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "updated_asc":  return a.updated_at.localeCompare(b.updated_at);
        case "title_asc":    return a.title.localeCompare(b.title, "pt");
        case "title_desc":   return b.title.localeCompare(a.title, "pt");
        case "updated_desc":
        default:             return b.updated_at.localeCompare(a.updated_at);
      }
    });
    return sorted;
  }, [items, search, categoryFilter, selectedTags, sortBy]);

  // Reset page when filters/sort change
  useEffect(() => { setPage(1); }, [search, categoryFilter, selectedTags, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  // Tag autocomplete suggestions based on current search input
  const tagSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allTags
      .filter((t) => t.toLowerCase().includes(q) && !selectedTags.includes(t))
      .slice(0, 8);
  }, [allTags, search, selectedTags]);

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const addTagFromSuggestion = (t: string) => {
    toggleTag(t);
    setSearch("");
    setShowSuggestions(false);
  };

  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setSelectedTags([]); };


  const openNew = () => {
    setEditing(null);
    setForm({ category: "geral", active: true, tagsText: "" });
    setOpen(true);
  };
  const openEdit = (item: KBItem) => {
    setEditing(item);
    setForm({ ...item, tagsText: item.tags.join(", ") });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.content) throw new Error("Preencha título e conteúdo.");
      const tags = (form.tagsText || "")
        .split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        title: form.title!,
        category: form.category || "geral",
        tags,
        content: form.content!,
        active: form.active ?? true,
      };
      if (editing) {
        const { error } = await supabase.from("knowledge_base").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("knowledge_base").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge_base"] });
      toast({ title: editing ? "Artigo atualizado" : "Artigo cadastrado" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge_base"] });
      toast({ title: "Artigo removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const hasFilters = search || categoryFilter !== "all" || selectedTags.length > 0;
  const categories = Object.keys(categoryLabel);

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Base de conhecimento
          </CardTitle>
          <CardDescription className="text-body-sm">
            Artigos, procedimentos e referências usados pelos agentes de IA como contexto
          </CardDescription>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Novo artigo
        </Button>
      </CardHeader>
      <CardContent>
        {/* Search + Category navigation */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-9 pl-8 text-[12px]"
              placeholder="Buscar por título, conteúdo ou tag..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && tagSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                  Tags sugeridas
                </div>
                {tagSuggestions.map((t) => (
                  <button
                    key={t}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addTagFromSuggestion(t)}
                    className="w-full text-left flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] hover:bg-accent"
                  >
                    <Tag className="h-3 w-3 text-primary" /> {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected tags (multi-select chips) */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-muted-foreground mr-1">Filtrando por:</span>
              {selectedTags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 bg-primary text-primary-foreground"
                >
                  <Tag className="h-2.5 w-2.5" />{t}
                  <X className="h-2.5 w-2.5" />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent"
              }`}
            >
              Todas <span className="opacity-70">({items.length})</span>
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  categoryFilter === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-accent"
                }`}
              >
                {categoryLabel[c]} <span className="opacity-70">({categoryCounts[c] || 0})</span>
              </button>
            ))}
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground mr-1" />
              {allTags.map((t) => {
                const sel = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 transition-colors ${
                      sel
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary-soft text-primary hover:bg-primary/20"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] ml-2 text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                >
                  <X className="h-3 w-3" /> Limpar filtros
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-caption text-muted-foreground">
              {filtered.length} de {items.length} artigo(s)
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="h-7 text-[11px] w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_desc" className="text-[12px]">Mais recentes</SelectItem>
                  <SelectItem value="updated_asc" className="text-[12px]">Mais antigos</SelectItem>
                  <SelectItem value="title_asc" className="text-[12px]">Título (A→Z)</SelectItem>
                  <SelectItem value="title_desc" className="text-[12px]">Título (Z→A)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(+v)}>
                <SelectTrigger className="h-7 text-[11px] w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6" className="text-[12px]">6 / pág</SelectItem>
                  <SelectItem value="12" className="text-[12px]">12 / pág</SelectItem>
                  <SelectItem value="24" className="text-[12px]">24 / pág</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-body-sm text-muted-foreground">A carregar...</p>
        ) : filtered.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">
            {hasFilters ? "Nenhum artigo corresponde aos filtros." : "Nenhum artigo cadastrado."}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {paginated.map((it) => (
              <div key={it.id} className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {categoryLabel[it.category] || it.category}
                      </Badge>
                      {!it.active && <Badge variant="outline" className="text-[10px] bg-muted">Inativo</Badge>}
                    </div>
                    <h3 className="font-medium text-[13px] leading-snug">{it.title}</h3>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(it)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => remove.mutate(it.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-caption text-muted-foreground line-clamp-3 mb-2">{it.content}</p>
                {it.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {it.tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleTag(t)}
                        className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 transition-colors ${
                          selectedTags.includes(t)
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary-soft text-primary hover:bg-primary/20"
                        }`}
                      >
                        <Tag className="h-2.5 w-2.5" />{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className="text-caption text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm" className="h-7 px-2 gap-1 text-[11px]"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </Button>
              <Button
                variant="outline" size="sm" className="h-7 px-2 gap-1 text-[11px]"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar artigo" : "Novo artigo"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Título</Label>
                <Input className="h-9 text-[12px]"
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Geral</SelectItem>
                      <SelectItem value="regulatorio">Regulatório</SelectItem>
                      <SelectItem value="operacional">Operacional</SelectItem>
                      <SelectItem value="curadoria">Curadoria</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Tags (separadas por vírgula)</Label>
                  <Input className="h-9 text-[12px]"
                    placeholder="DBO, CONAMA, efluentes"
                    value={form.tagsText || ""}
                    onChange={(e) => setForm({ ...form, tagsText: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Conteúdo</Label>
                <Textarea rows={10} className="text-[12px]"
                  value={form.content || ""}
                  onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active ?? true}
                  onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label className="text-[12px]">Ativo (disponível para os agentes)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Gravando..." : editing ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
