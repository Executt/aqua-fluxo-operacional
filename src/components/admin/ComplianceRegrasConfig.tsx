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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Check, ShieldAlert, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Regra = {
  id: string; codigo: string; nome: string; descricao: string | null;
  tipo: string; gravidade_default: string; prazo_dias: number;
  expressao_json: any; ativa: boolean; usa_ia: boolean;
};

const TIPOS = [
  { v: "score", l: "Score de compliance" },
  { v: "dbo", l: "Eficiência DBO (ETE)" },
  { v: "cobertura", l: "Cobertura de rede" },
  { v: "prazo", l: "Prazo/meta" },
  { v: "custom", l: "Customizada (expressão JSON)" },
];
const GRAVIDADES = ["leve", "media", "grave", "gravissima"];

export function ComplianceRegrasConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Regra> | null>(null);

  const { data: regras, isLoading } = useQuery({
    queryKey: ["admin-compliance-regras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compliance_regras").select("*").order("codigo");
      if (error) throw error;
      return (data ?? []) as Regra[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (r: Partial<Regra>) => {
      const payload = {
        codigo: r.codigo!, nome: r.nome!, descricao: r.descricao ?? null,
        tipo: r.tipo!, gravidade_default: r.gravidade_default!,
        prazo_dias: Number(r.prazo_dias ?? 30),
        expressao_json: typeof r.expressao_json === "string"
          ? JSON.parse(r.expressao_json)
          : (r.expressao_json ?? {}),
        ativa: r.ativa ?? true,
        usa_ia: r.usa_ia ?? false,
      };
      if (r.id) {
        const { error } = await supabase.from("compliance_regras").update(payload).eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("compliance_regras").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Regra guardada" });
      qc.invalidateQueries({ queryKey: ["admin-compliance-regras"] });
      qc.invalidateQueries({ queryKey: ["compliance-regras"] });
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase.from("compliance_regras").update({ ativa }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-compliance-regras"] }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("compliance_regras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Regra removida" });
      qc.invalidateQueries({ queryKey: ["admin-compliance-regras"] });
    },
  });

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" /> Regras de compliance automático
          </CardTitle>
          <CardDescription className="text-body-sm">
            Motor determinístico que abre infrações e planos de ação. Combine com IA para casos ambíguos.
          </CardDescription>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setEditing({ ativa: true, prazo_dias: 30, gravidade_default: "media", tipo: "score", expressao_json: { valor: 60 } })}>
          <Plus className="h-3.5 w-3.5" /> Nova regra
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-[12px] text-muted-foreground">A carregar…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Gravidade</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>IA</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(regras ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-[11px]">{r.codigo}</TableCell>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.tipo}</Badge></TableCell>
                  <TableCell>
                    <span className={`text-[11px] px-2 py-0.5 rounded ${
                      r.gravidade_default === "gravissima" ? "pill-destructive" :
                      r.gravidade_default === "grave" ? "pill-destructive" :
                      r.gravidade_default === "media" ? "pill-warning" : "pill-muted"
                    }`}>{r.gravidade_default}</span>
                  </TableCell>
                  <TableCell className="text-[12px]">{r.prazo_dias}d</TableCell>
                  <TableCell>{r.usa_ia && <Sparkles className="h-3.5 w-3.5 text-primary" />}</TableCell>
                  <TableCell>
                    <Switch checked={r.ativa} onCheckedChange={(v) => toggleMut.mutate({ id: r.id, ativa: v })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => confirm(`Remover regra ${r.codigo}?`) && delMut.mutate(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(regras ?? []).length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-[12px] text-muted-foreground py-6">Nenhuma regra cadastrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar regra" : "Nova regra de compliance"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Código</Label>
                <Input value={editing.codigo ?? ""} onChange={(e) => setEditing({ ...editing, codigo: e.target.value.toUpperCase() })} placeholder="SCORE_BAIXO" className="h-9 text-[12px] font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Nome</Label>
                <Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} className="h-9 text-[12px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Tipo</Label>
                <Select value={editing.tipo} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Gravidade padrão</Label>
                <Select value={editing.gravidade_default} onValueChange={(v) => setEditing({ ...editing, gravidade_default: v })}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{GRAVIDADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Prazo de tratativa (dias)</Label>
                <Input type="number" value={editing.prazo_dias ?? 30} onChange={(e) => setEditing({ ...editing, prazo_dias: Number(e.target.value) })} className="h-9 text-[12px]" />
              </div>
              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={editing.ativa ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativa: v })} />
                  <Label className="text-[11px]">Ativa</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.usa_ia ?? false} onCheckedChange={(v) => setEditing({ ...editing, usa_ia: v })} />
                  <Label className="text-[11px]">Usa IA complementar</Label>
                </div>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[11px]">Descrição</Label>
                <Textarea rows={2} value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} className="text-[12px]" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[11px]">Expressão (JSON)</Label>
                <Textarea rows={4} className="font-mono text-[11px]"
                  value={typeof editing.expressao_json === "string" ? editing.expressao_json : JSON.stringify(editing.expressao_json ?? {}, null, 2)}
                  onChange={(e) => setEditing({ ...editing, expressao_json: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground">Ex: <code>{`{"valor": 60}`}</code> — o motor determinístico interpreta conforme o tipo.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={() => editing && saveMut.mutate(editing)} disabled={saveMut.isPending}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
