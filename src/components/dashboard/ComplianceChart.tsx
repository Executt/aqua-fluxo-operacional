import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

const data = [
  { mes: "Out", SP: 92, MG: 78, RJ: 65, BA: 58 },
  { mes: "Nov", SP: 93, MG: 80, RJ: 68, BA: 60 },
  { mes: "Dez", SP: 91, MG: 82, RJ: 70, BA: 62 },
  { mes: "Jan", SP: 94, MG: 83, RJ: 72, BA: 64 },
  { mes: "Fev", SP: 95, MG: 85, RJ: 74, BA: 66 },
  { mes: "Mar", SP: 96, MG: 87, RJ: 76, BA: 68 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
      <p className="text-xs font-medium text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs text-muted-foreground">
          <span style={{ color: p.color }}>●</span> {p.dataKey}: {p.value}%
        </p>
      ))}
    </div>
  );
};

export function ComplianceChart() {
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Evolução de Compliance por Estado
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 16%)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(215 15% 55%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(215 15% 55%)" }} axisLine={false} tickLine={false} domain={[50, 100]} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", color: "hsl(215 15% 55%)" }} />
            <Bar dataKey="SP" fill="hsl(210 80% 52%)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="MG" fill="hsl(152 60% 42%)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="RJ" fill="hsl(38 92% 55%)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="BA" fill="hsl(270 60% 55%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
