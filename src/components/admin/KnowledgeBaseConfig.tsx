import { useState } from "react";
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
import { BookOpen, Plus, Trash2, Tag, Edit3 } from "lucide-react";
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

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["knowledge_base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as KBItem[];
    },
  });

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
        {isLoading ? (
          <p className="text-body-sm text-muted-foreground">A carregar...</p>
        ) : items.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">Nenhum artigo cadastrado.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((it) => (
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
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-soft text-primary inline-flex items-center gap-0.5">
                        <Tag className="h-2.5 w-2.5" />{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
