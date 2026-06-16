import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { CHART_COLORS, CHART_GRID, CHART_TICK } from "@/lib/chart-colors";
import { CustomTooltip, evolucaoMensal } from "./shared";

export function EvolucaoTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border elevation-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Evolução por Estado
            </CardTitle>
            <CardDescription className="text-body-sm">Últimos 6 meses (% compliance)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={evolucaoMensal} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} domain={[40, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="SP" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
                <Bar dataKey="MG" fill={CHART_COLORS.success} radius={[3, 3, 0, 0]} />
                <Bar dataKey="RJ" fill={CHART_COLORS.warning} radius={[3, 3, 0, 0]} />
                <Bar dataKey="BA" fill={CHART_COLORS.purple} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border elevation-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Tendência de Compliance
            </CardTitle>
            <CardDescription className="text-body-sm">Linha de tendência por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} domain={[40, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="SP" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="MG" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="RJ" stroke={CHART_COLORS.warning} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="PE" stroke={CHART_COLORS.destructive} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
