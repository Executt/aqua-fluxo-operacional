import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Activity, Droplets, Database, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

const kpis = [
  {
    title: "ETEs Monitorizadas",
    value: "2.847",
    change: "+11.01%",
    trending: "up",
    icon: Droplets,
    color: "text-primary",
  },
  {
    title: "Infrações Críticas",
    value: "34",
    change: "-0.03%",
    trending: "down",
    icon: AlertTriangle,
    color: "text-destructive",
    alert: true,
  },
  {
    title: "Taxa de Tratamento",
    value: "87.3%",
    change: "+15.03%",
    trending: "up",
    icon: Activity,
    color: "text-success",
  },
  {
    title: "Dados Ingeridos",
    value: "1.2 TB",
    change: "+6.08%",
    trending: "up",
    icon: Database,
    color: "text-informative",
  },
];

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
        >
          <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-body-sm text-muted-foreground font-medium">
                  {kpi.title}
                </span>
                <kpi.icon className={`h-4 w-4 ${kpi.color} ${kpi.alert ? "animate-pulse-glow" : ""}`} />
              </div>
              <div className="flex items-end justify-between">
                <div className={`text-[28px] font-semibold ${kpi.color} font-mono leading-none`}>
                  {kpi.value}
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-medium ${kpi.trending === "up" ? "text-success" : "text-destructive"}`}>
                  {kpi.trending === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {kpi.change}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
