import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import { Gauge, BarChart3, Target } from "lucide-react";
import { CHART_COLORS, CHART_GRID, CHART_TICK } from "@/lib/chart-colors";
import { radarData, type Concessionaria } from "./shared";

interface Props {
  concessionarias: Concessionaria[];
  detalheScore: { dimensao: string; peso: number; descricao: string; valor: number }[];
  distribStatus: { name: string; value: number; color: string }[];
  scoreFocus: string;
  setScoreFocus: (v: string) => void;
}

export function ScoresTab({ concessionarias, detalheScore, distribStatus, scoreFocus, setScoreFocus }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border elevation-1 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" /> Score Detalhado por Dimensão (SARSB / ANA 79-2022)
                </CardTitle>
                <CardDescription className="text-body-sm mt-1">Decomposição do score nas 4 dimensões regulatórias</CardDescription>
              </div>
              <Select value={scoreFocus} onValueChange={setScoreFocus}>
                <SelectTrigger className="w-44 bg-card border-border text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {concessionarias.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome} ({c.uf})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {detalheScore.map((d) => (
              <div key={d.dimensao} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{d.dimensao}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">peso {d.peso}%</Badge>
                  </div>
                  <span className={`font-mono text-body-sm font-bold ${d.valor >= 85 ? "text-success" : d.valor >= 70 ? "text-warning" : "text-destructive"}`}>
                    {d.valor}%
                  </span>
                </div>
                <Progress value={d.valor} className="h-2" />
                <p className="text-caption text-muted-foreground">{d.descricao}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border elevation-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Distribuição de Status
            </CardTitle>
            <CardDescription className="text-body-sm">Concessionárias por nível de conformidade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={distribStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {distribStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border elevation-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Comparativo Multidimensional
          </CardTitle>
          <CardDescription className="text-body-sm">SABESP vs CEDAE vs COMPESA — 6 critérios SARSB</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={CHART_GRID} />
              <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 10, fill: CHART_TICK }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: CHART_TICK }} />
              <Radar name="SABESP" dataKey="SABESP" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="CEDAE" dataKey="CEDAE" stroke={CHART_COLORS.warning} fill={CHART_COLORS.warning} fillOpacity={0.1} strokeWidth={2} />
              <Radar name="COMPESA" dataKey="COMPESA" stroke={CHART_COLORS.destructive} fill={CHART_COLORS.destructive} fillOpacity={0.1} strokeWidth={2} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
