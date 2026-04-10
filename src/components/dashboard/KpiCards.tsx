import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Activity, Droplets, Database } from "lucide-react";

const kpis = [
  {
    title: "ETEs Monitorizadas",
    value: "2.847",
    change: "+12 este mês",
    icon: Droplets,
    color: "text-success",
    glowClass: "glow-success",
  },
  {
    title: "Infrações Críticas",
    value: "34",
    change: "↑ 8 desde ontem",
    icon: AlertTriangle,
    color: "text-destructive",
    glowClass: "glow-destructive",
    alert: true,
  },
  {
    title: "Taxa de Tratamento Média",
    value: "87.3%",
    change: "+2.1% vs mês anterior",
    icon: Activity,
    color: "text-primary",
    glowClass: "glow-primary",
  },
  {
    title: "Volume de Dados Ingeridos",
    value: "1.2 TB",
    change: "Últimas 24h",
    icon: Database,
    color: "text-muted-foreground",
    glowClass: "",
  },
];

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className={`bg-card border-border hover:border-primary/30 transition-all ${kpi.glowClass}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {kpi.title}
              </span>
              <kpi.icon className={`h-4 w-4 ${kpi.color} ${kpi.alert ? "animate-pulse-glow" : ""}`} />
            </div>
            <div className={`text-3xl font-bold ${kpi.color} font-mono`}>
              {kpi.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
