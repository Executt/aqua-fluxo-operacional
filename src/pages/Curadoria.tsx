import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Droplets, FileText, Send, CheckCircle2, XCircle, Clock, FileSearch, Plus, AlertTriangle,
} from "lucide-react";

const motivoRejeicaoSchema = z.string()
  .trim()
  .min(20, "O motivo deve ter pelo menos 20 caracteres para garantir rastreabilidade")
  .max(1000, "O motivo não pode exceder 1000 caracteres");

type Estado = "rascunho" | "submetido" | "em_analise" | "validado" | "rejeitado";

const ESTADO_META: Record<Estado, { label: string; cls: string; icon: typeof Clock }> = {
  rascunho:   { label: "Rascunho",   cls: "bg-muted text-muted-foreground",          icon: FileText },
  submetido:  { label: "Submetido",  cls: "bg-info/15 text-info",                    icon: Send },
  em_analise: { label: "Em análise", cls: "bg-warning/15 text-warning",              icon: FileSearch },
  validado:   { label: "Validado",   cls: "bg-success/15 text-success",              icon: CheckCircle2 },
  rejeitado:  { label: "Rejeitado",  cls: "bg-destructive/15 text-destructive",      icon: XCircle },
};

interface Ete {
  id: string;
  codigo: string;
  nome: string;
  municipio_nome: string;
  uf: string;
  status_operacional: string;
  eficiencia_dbo_pct: number | null;
  faixa_dbo: string | null;
}

interface Resposta {
  id: string;
  ete_id: string;
  ano_referencia: number;
  mes_referencia: number;
  estado: Estado;
  payload: Record<string, unknown>;
  motivo_rejeicao: string | null;
  submitted_at: string | null;
}

export default function Curadoria() {
  const { user, operadorId, isStaff } = useAuth();
  const { toast } = useToast();
  const [etes, setEtes] = useState<Ete[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    ete_id: "",
    ano_referencia: new Date().getFullYear(),
    mes_referencia: new Date().getMonth() + 1,
    eficiencia_dbo_pct: "",
    vazao_media_lps: "",
    ph_medio: "",
    od_medio_mg_l: "",
    observacoes: "",
  });

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operadorId]);

  async function load() {
    setLoading(true);
    const [etesQ, respQ] = await Promise.all([
      supabase.from("etes_curadoria").select("*").order("nome"),
      supabase.from("formulario_respostas").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setEtes(etesQ.data ?? []);
    setRespostas((respQ.data as Resposta[] | null) ?? []);
    setLoading(false);
  }

  async function handleSubmit(estado: "rascunho" | "submetido") {
    if (!form.ete_id) {
      toast({ title: "Selecione uma ETE", variant: "destructive" });
      return;
    }
    const payload: Record<string, unknown> = {};
    if (form.eficiencia_dbo_pct) payload.eficiencia_dbo_pct = Number(form.eficiencia_dbo_pct);
    if (form.vazao_media_lps)    payload.vazao_media_lps    = Number(form.vazao_media_lps);
    if (form.ph_medio)           payload.ph_medio           = Number(form.ph_medio);
    if (form.od_medio_mg_l)      payload.od_medio_mg_l      = Number(form.od_medio_mg_l);
    if (form.observacoes)        payload.observacoes        = form.observacoes;

    const { data, error } = await supabase.functions.invoke("curadoria-submit", {
      body: {
        ete_id: form.ete_id,
        ano_referencia: form.ano_referencia,
        mes_referencia: form.mes_referencia,
        payload,
        estado,
      },
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: estado === "submetido" ? "Resposta submetida" : "Rascunho guardado",
      description: data?.resposta?.id ?? "OK",
    });
    void load();
  }

  async function transition(resposta_id: string, novo_estado: Estado, motivo?: string) {
    const { error } = await supabase.functions.invoke("curadoria-transition", {
      body: { resposta_id, novo_estado, motivo_rejeicao: motivo },
    });
    if (error) {
      toast({ title: "Falha", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Resposta ${novo_estado}` });
    void load();
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Curadoria Nacional de Saneamento</h1>
            <p className="text-sm text-muted-foreground">
              {isStaff
                ? "Visão de auditor — todas as submissões"
                : "Submeta dados das ETEs do seu operador"}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["rascunho", "submetido", "em_analise", "validado"] as Estado[]).map((e) => {
            const Meta = ESTADO_META[e];
            const count = respostas.filter((r) => r.estado === e).length;
            return (
              <Card key={e} className="elevation-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-md flex items-center justify-center ${Meta.cls}`}>
                    <Meta.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold tabular-nums">{count}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{Meta.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Formulário */}
        {!isStaff && (
          <Card className="elevation-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova submissão mensal
              </CardTitle>
              <CardDescription>
                Parâmetros validados contra Atlas Esgotos / CONAMA 357/2005.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <Label>ETE</Label>
                  <Select value={form.ete_id} onValueChange={(v) => setForm({ ...form, ete_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar ETE..." /></SelectTrigger>
                    <SelectContent>
                      {etes.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.codigo} · {e.nome} · {e.municipio_nome}/{e.uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano referência</Label>
                  <Input type="number" min={2000} max={new Date().getFullYear() + 1}
                    value={form.ano_referencia}
                    onChange={(e) => setForm({ ...form, ano_referencia: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Mês referência</Label>
                  <Input type="number" min={1} max={12}
                    value={form.mes_referencia}
                    onChange={(e) => setForm({ ...form, mes_referencia: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Eficiência DBO (%)</Label>
                  <Input type="number" min={0} max={100} step="0.01"
                    value={form.eficiencia_dbo_pct}
                    onChange={(e) => setForm({ ...form, eficiencia_dbo_pct: e.target.value })} />
                </div>
                <div>
                  <Label>Vazão média (L/s)</Label>
                  <Input type="number" min={0} step="0.1"
                    value={form.vazao_media_lps}
                    onChange={(e) => setForm({ ...form, vazao_media_lps: e.target.value })} />
                </div>
                <div>
                  <Label>pH médio</Label>
                  <Input type="number" min={0} max={14} step="0.01"
                    value={form.ph_medio}
                    onChange={(e) => setForm({ ...form, ph_medio: e.target.value })} />
                </div>
                <div>
                  <Label>OD médio (mg/L)</Label>
                  <Input type="number" min={0} max={20} step="0.01"
                    value={form.od_medio_mg_l}
                    onChange={(e) => setForm({ ...form, od_medio_mg_l: e.target.value })} />
                </div>
                <div className="md:col-span-3">
                  <Label>Observações</Label>
                  <Textarea rows={2} value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={() => handleSubmit("rascunho")}>Guardar rascunho</Button>
                <Button onClick={() => handleSubmit("submetido")}>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Submeter para análise
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de respostas */}
        <Card className="elevation-1">
          <CardHeader>
            <CardTitle className="text-base">Submissões recentes</CardTitle>
            <CardDescription>{loading ? "A carregar..." : `${respostas.length} registos`}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ETE</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>DBO%</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {respostas.map((r) => {
                  const Meta = ESTADO_META[r.estado];
                  const ete = etes.find((e) => e.id === r.ete_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="text-[13px] font-medium">{ete?.codigo ?? r.ete_id.slice(0, 8)}</div>
                        <div className="text-[11px] text-muted-foreground">{ete?.nome}</div>
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums">
                        {String(r.mes_referencia).padStart(2, "0")}/{r.ano_referencia}
                      </TableCell>
                      <TableCell>
                        <Badge className={Meta.cls + " font-medium"}>{Meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums">
                        {(r.payload as { eficiencia_dbo_pct?: number })?.eficiencia_dbo_pct ?? "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {isStaff && r.estado === "submetido" && (
                          <Button size="sm" variant="outline"
                            onClick={() => transition(r.id, "em_analise")}>
                            Analisar
                          </Button>
                        )}
                        {isStaff && r.estado === "em_analise" && (
                          <>
                            <Button size="sm"
                              onClick={() => transition(r.id, "validado")}>
                              Validar
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => {
                                const m = window.prompt("Motivo da rejeição:");
                                if (m) transition(r.id, "rejeitado", m);
                              }}>
                              Rejeitar
                            </Button>
                          </>
                        )}
                        {!isStaff && r.estado === "rejeitado" && (
                          <Button size="sm" variant="outline"
                            onClick={() => transition(r.id, "rascunho")}>
                            Reabrir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {respostas.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      Sem submissões. {!isStaff && "Use o formulário acima para iniciar."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
