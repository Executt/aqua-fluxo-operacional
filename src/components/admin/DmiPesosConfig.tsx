import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, RotateCcw, Sliders } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useDmiPesos, type DmiPesos } from "@/hooks/use-dmi";

const DEFAULT: DmiPesos = { idh: 0.3, receita_pc: 0.3, servidores: 0.2, completude: 0.2, min_group_size: 30 };

const PESO_FIELDS: Array<{ key: keyof Omit<DmiPesos, "min_group_size">; label: string; desc: string }> = [
  { key: "idh", label: "IDH-M (Atlas PNUD)", desc: "Peso do índice de desenvolvimento humano municipal" },
  { key: "receita_pc", label: "Receita corrente per capita (STN/Finbra)", desc: "Capacidade fiscal do município" },
  { key: "servidores", label: "Servidores da regulação local (ANA)", desc: "Governança institucional" },
  { key: "completude", label: "Completude SNIS (%)", desc: "Qualidade da notificação — proxy de subnotificação" },
];

export function DmiPesosConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useDmiPesos();
  const [pesos, setPesos] = useState<DmiPesos>(DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setPesos(data); }, [data]);

  const total = pesos.idh + pesos.receita_pc + pesos.servidores + pesos.completude;
  const isBalanced = Math.abs(total - 1) < 0.001;

  async function save() {
    if (!isBalanced) {
      toast({ title: "Pesos inválidos", description: `Soma deve ser 1.000 (atual: ${total.toFixed(3)}).`, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .update({ value: pesos as any })
      .eq("key", "dmi_pesos");
    setSaving(false);
    if (error) {
      toast({ title: "Falha ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["dmi-pesos"] });
    toast({ title: "Pesos DMI atualizados", description: "Guard-rail passa a usar a nova calibração." });
  }

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-heading-2 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" /> Pesos do índice DMI
            </CardTitle>
            <CardDescription className="text-body-sm">
              Regra do Falso Afluente — calibração da estratificação por maturidade institucional
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={isBalanced ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"}
          >
            Soma: {total.toFixed(3)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {PESO_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-[11px]">{f.label}</Label>
            <Input
              type="number" step="0.05" min={0} max={1}
              value={pesos[f.key]}
              onChange={(e) => setPesos((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
              className="h-9 text-[12px] font-mono"
            />
            <p className="text-[10px] text-muted-foreground">{f.desc}</p>
          </div>
        ))}

        <Separator className="md:col-span-2" />

        <div className="space-y-1.5">
          <Label className="text-[11px]">Tamanho mínimo de grupo (n)</Label>
          <Input
            type="number" min={5} step="1"
            value={pesos.min_group_size}
            onChange={(e) => setPesos((p) => ({ ...p, min_group_size: Number(e.target.value) }))}
            className="h-9 text-[12px] font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            Estratos com n abaixo deste valor são rejeitados pelo <code>analytics-guardrail</code>.
          </p>
        </div>

        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => setPesos(DEFAULT)}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restaurar padrão
          </Button>
          <Button size="sm" disabled={saving || !isBalanced} onClick={save}>
            <Check className="h-3.5 w-3.5 mr-1.5" /> Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
