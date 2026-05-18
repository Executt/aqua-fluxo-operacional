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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Brain, Plus, Trash2, Sparkles, DollarSign, Gift, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LLMModel = {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  tier: string;
  context_window: number | null;
  description: string | null;
  capabilities: string[];
  active: boolean;
  is_default: boolean;
};

const tierMeta: Record<string, { label: string; icon: any; cls: string }> = {
  free:    { label: "Gratuito", icon: Gift,      cls: "bg-success/15 text-success border-success/30" },
  paid:    { label: "Pago",     icon: DollarSign,cls: "bg-primary/15 text-primary border-primary/30" },
  premium: { label: "Premium",  icon: Sparkles,  cls: "bg-warning/15 text-warning border-warning/30" },
};

export function LLMConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<LLMModel>>({
    provider: "google", tier: "paid", active: true, capabilities: [],
  });

  const { data: models = [], isLoading } = useQuery({
    queryKey: ["llm_models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("llm_models")
        .select("*")
        .order("tier", { ascending: true })
        .order("display_name");
      if (error) throw error;
      return data as LLMModel[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("llm_models").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm_models"] });
      toast({ title: "Modelo atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeModel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("llm_models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm_models"] });
      toast({ title: "Modelo removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { error: e1 } = await supabase.from("llm_models").update({ is_default: false }).eq("is_default", true);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("llm_models").update({ is_default: true, active: true }).eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm_models"] });
      qc.invalidateQueries({ queryKey: ["llm_models_active"] });
      toast({ title: "Modelo definido como ativo padrão" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createModel = useMutation({
    mutationFn: async () => {
      if (!form.model_id || !form.display_name || !form.provider) {
        throw new Error("Preencha provider, model_id e nome.");
      }
      const { error } = await supabase.from("llm_models").insert({
        provider: form.provider!,
        model_id: form.model_id!,
        display_name: form.display_name!,
        tier: form.tier || "paid",
        context_window: form.context_window ?? null,
        description: form.description ?? null,
        capabilities: form.capabilities ?? [],
        active: form.active ?? true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm_models"] });
      toast({ title: "Modelo cadastrado" });
      setOpen(false);
      setForm({ provider: "google", tier: "paid", active: true, capabilities: [] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const grouped = models.reduce<Record<string, LLMModel[]>>((acc, m) => {
    (acc[m.tier] ||= []).push(m); return acc;
  }, {});

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> Modelos de LLM
          </CardTitle>
          <CardDescription className="text-body-sm">
            Catálogo de modelos disponíveis via Lovable AI Gateway e outros provedores
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Novo modelo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar modelo de LLM</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Provider</Label>
                  <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="meta">Meta</SelectItem>
                      <SelectItem value="mistral">Mistral</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Camada</Label>
                  <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuito</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Model ID</Label>
                <Input className="h-9 text-[12px] font-mono"
                  placeholder="google/gemini-3-flash-preview"
                  value={form.model_id || ""}
                  onChange={(e) => setForm({ ...form, model_id: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Nome a exibir</Label>
                <Input className="h-9 text-[12px]"
                  placeholder="Gemini 3 Flash"
                  value={form.display_name || ""}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Janela de contexto (tokens)</Label>
                <Input type="number" className="h-9 text-[12px]"
                  placeholder="1000000"
                  value={form.context_window ?? ""}
                  onChange={(e) => setForm({ ...form, context_window: e.target.value ? +e.target.value : null })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Descrição</Label>
                <Textarea rows={2} className="text-[12px]"
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createModel.mutate()} disabled={createModel.isPending}>
                {createModel.isPending ? "Gravando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-body-sm text-muted-foreground">A carregar...</p>
        ) : (
          <div className="space-y-6">
            {(["free", "paid", "premium"] as const).map((tier) => {
              const list = grouped[tier] || [];
              if (!list.length) return null;
              const meta = tierMeta[tier];
              return (
                <div key={tier}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={`text-[10px] gap-1 ${meta.cls}`}>
                      <meta.icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                    <span className="text-caption text-muted-foreground">{list.length} modelo(s)</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[24%]">Nome</TableHead>
                        <TableHead className="w-[28%]">Model ID</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Contexto</TableHead>
                        <TableHead>Ativo</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((m) => (
                        <TableRow key={m.id} className={m.is_default ? "bg-primary/5" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {m.is_default && (
                                <Badge variant="outline" className="text-[9px] gap-0.5 bg-primary/15 text-primary border-primary/30">
                                  <Star className="h-2.5 w-2.5 fill-current" /> Ativo
                                </Badge>
                              )}
                              <div className="font-medium text-[13px]">{m.display_name}</div>
                            </div>
                            {m.description && (
                              <div className="text-caption text-muted-foreground line-clamp-1">{m.description}</div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-muted-foreground">{m.model_id}</TableCell>
                          <TableCell className="text-[12px] uppercase">{m.provider}</TableCell>
                          <TableCell className="font-mono text-[11px]">
                            {m.context_window ? `${(m.context_window / 1000).toLocaleString()}k` : "—"}
                          </TableCell>
                          <TableCell>
                            <Switch checked={m.active}
                              onCheckedChange={(v) => toggleActive.mutate({ id: m.id, active: v })} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                variant="ghost" size="sm" className="h-7 w-7 p-0"
                                title={m.is_default ? "Modelo ativo atual" : "Definir como modelo ativo"}
                                disabled={m.is_default || !m.active || setDefault.isPending}
                                onClick={() => setDefault.mutate(m.id)}>
                                <Star className={`h-3.5 w-3.5 ${m.is_default ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => removeModel.mutate(m.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
