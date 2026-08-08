import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { CHART_COLORS, CHART_GRID, CHART_TICK } from "@/lib/chart-colors";
import { Activity, AlertTriangle, Gauge, Radio, Timer } from "lucide-react";
import type { LoteAuditoriaRow } from "@/lib/lote-auditoria";
import { KpiDetalheDialog, type KpiFoco } from "./KpiDetalheDialog";

export interface KpiValidacaoData {
  total: number;
  compativeis: number;
  incompativeis: number;
  motivos: { motivo: string; qtd: number }[];
  porModelo: { nome: string; compativel: number; incompativel: number }[];
  porOrigem: { nome: string; qtd: number }[];
  tempoMedioHoras: number | null;
  amostraTempo: number;
}

const PIE = [
  CHART_COLORS.primary, CHART_COLORS.teal, CHART_COLORS.violet,
  CHART_COLORS.warning, CHART_COLORS.informative, CHART_COLORS.success,
];

/** Tempo médio (h) entre a primeira ocorrência incompatível/inválida de uma ETE-período e a sua compatibilização. */
export function tempoMedioCompatibilizacao(rows: LoteAuditoriaRow[]) {
  const primeiraFalha = new Map<string, number>();
  const sucesso = new Map<string, number>();
  const chave = (r: LoteAuditoriaRow) =>
    `${r.ete_codigo ?? r.ete_id ?? "?"}|${r.ano_referencia ?? "?"}|${r.mes_referencia ?? "?"}`;

  for (const r of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!r.ete_codigo && !r.ete_id) continue;
    const k = chave(r);
    const t = new Date(r.created_at).getTime();
    const ruim = r.resultado === "incompativel" || r.resultado === "invalida" || r.evento === "falha";
    const bom = r.resultado === "compativel" || r.resultado === "importada";
    if (ruim && !primeiraFalha.has(k)) primeiraFalha.set(k, t);
    if (bom && primeiraFalha.has(k) && !sucesso.has(k)) sucesso.set(k, t);
  }

  const deltas: number[] = [];
  sucesso.forEach((t, k) => {
    const f = primeiraFalha.get(k);
    if (f !== undefined && t >= f) deltas.push((t - f) / 3_600_000);
  });
  return {
    tempoMedioHoras: deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null,
    amostraTempo: deltas.length,
  };
}

function Kpi({ icon: Icon, label, value, hint, tone, onClick }: {
  icon: typeof Gauge; label: string; value: string; hint?: string;
  tone?: "success" | "warning" | "primary"; onClick?: () => void;
}) {
  const cls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary";
  return (
    <Card
      className={`elevation-1 ${onClick ? "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring outline-none" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Icon className={`h-3.5 w-3.5 ${cls}`} /> {label}
        </div>
        <div className={`text-2xl font-semibold tabular-nums mt-1 ${cls}`}>{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
        {onClick && <div className="text-[10px] text-primary mt-1">Ver trilha de auditoria →</div>}
      </CardContent>
    </Card>
  );
}

export function ValidacaoKpiPanel({ data, titulo = "Painel analítico de compatibilidade", auditoria = [], aoVivo = false }: {
  data: KpiValidacaoData; titulo?: string; auditoria?: LoteAuditoriaRow[]; aoVivo?: boolean;
}) {
  const taxa = data.total ? (data.compativeis / data.total) * 100 : 0;
  const topMotivos = data.motivos.slice(0, 6);
  const [foco, setFoco] = useState<KpiFoco | null>(null);
  const abrir = auditoria.length ? (f: KpiFoco) => () => setFoco(f) : () => undefined;

  return (
    <div className="space-y-4">
      {aoVivo && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Radio className="h-3 w-3 text-success animate-pulse" />
          Atualização em tempo real ativa durante reenfileiramentos e tentativas
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Gauge} label="Taxa de compatibilidade" value={`${taxa.toFixed(1)}%`}
          tone={taxa >= 80 ? "success" : "warning"}
          hint={`${data.compativeis} de ${data.total} registos`}
          onClick={abrir("compativel")} />
        <Kpi icon={AlertTriangle} label="Incompatíveis" value={String(data.incompativeis)} tone="warning"
          hint={topMotivos[0] ? `principal: ${topMotivos[0].motivo}` : "sem ocorrências"}
          onClick={abrir("incompativel")} />
        <Kpi icon={Timer} label="Tempo médio até compatibilizar"
          value={data.tempoMedioHoras === null ? "—" : `${data.tempoMedioHoras.toFixed(1)} h`}
          hint={`${data.amostraTempo} caso(s) reenfileirado(s) e corrigido(s)`}
          onClick={abrir("tempo")} />
        <Kpi icon={Activity} label="Motivos distintos" value={String(data.motivos.length)}
          hint="regras técnicas acionadas"
          onClick={abrir("motivos")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="elevation-1">
          <CardHeader>
            <CardTitle className="text-base">{titulo} — principais motivos de incompatibilidade</CardTitle>
            <CardDescription>Ocorrências agregadas no recorte filtrado.</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {topMotivos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">Nenhuma incompatibilidade registada.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMotivos} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: CHART_TICK }} allowDecimals={false} />
                  <YAxis type="category" dataKey="motivo" width={210}
                    tick={{ fontSize: 9, fill: CHART_TICK }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="qtd" name="Ocorrências" fill={CHART_COLORS.warning} radius={[0, 3, 3, 0]}
                    onClick={() => auditoria.length && setFoco("motivos")}
                    cursor={auditoria.length ? "pointer" : undefined} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="elevation-1">
          <CardHeader>
            <CardTitle className="text-base">Distribuição por modelo e origem</CardTitle>
            <CardDescription>Compatíveis vs. incompatíveis por modelo; volume por origem dos dados.</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] grid grid-cols-2 gap-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.porModelo} margin={{ left: -18, right: 4 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 9, fill: CHART_TICK }} interval={0} angle={-20} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 10, fill: CHART_TICK }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="compativel" name="Compatível" stackId="a" fill={CHART_COLORS.success}
                  onClick={() => auditoria.length && setFoco("compativel")}
                  cursor={auditoria.length ? "pointer" : undefined} />
                <Bar dataKey="incompativel" name="Incompatível" stackId="a" fill={CHART_COLORS.destructive}
                  onClick={() => auditoria.length && setFoco("incompativel")}
                  cursor={auditoria.length ? "pointer" : undefined} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.porOrigem} dataKey="qtd" nameKey="nome" innerRadius={38} outerRadius={70}>
                  {data.porOrigem.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <KpiDetalheDialog foco={foco} rows={auditoria} onOpenChange={(o) => !o && setFoco(null)} />
    </div>
  );
}
