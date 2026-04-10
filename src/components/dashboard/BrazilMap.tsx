import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const markers = [
  { x: 65, y: 25, status: "ok", label: "Manaus" },
  { x: 80, y: 30, status: "ok", label: "Belém" },
  { x: 85, y: 42, status: "critical", label: "Fortaleza" },
  { x: 88, y: 52, status: "ok", label: "Recife" },
  { x: 82, y: 62, status: "critical", label: "Salvador" },
  { x: 70, y: 68, status: "ok", label: "Brasília" },
  { x: 75, y: 75, status: "ok", label: "Belo Horizonte" },
  { x: 72, y: 82, status: "ok", label: "São Paulo" },
  { x: 76, y: 80, status: "critical", label: "Rio de Janeiro" },
  { x: 68, y: 85, status: "ok", label: "Curitiba" },
  { x: 55, y: 55, status: "ok", label: "Cuiabá" },
  { x: 62, y: 88, status: "ok", label: "Porto Alegre" },
];

export function BrazilMap() {
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Mapa de Monitorização Nacional
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="relative w-full aspect-[4/3] bg-muted/30 rounded-lg border border-border overflow-hidden">
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`} stroke="hsl(var(--primary))" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`v${i}`} x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" stroke="hsl(var(--primary))" strokeWidth="0.5" />
            ))}
          </svg>

          {/* Simulated Brazil shape outline */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M60,15 Q85,18 88,35 Q92,50 90,55 Q88,65 82,70 Q78,78 73,83 Q68,90 60,92 Q55,88 52,80 Q48,70 45,60 Q42,50 50,40 Q55,30 58,20 Z"
              fill="hsl(var(--primary) / 0.08)"
              stroke="hsl(var(--primary) / 0.3)"
              strokeWidth="0.5"
            />
          </svg>

          {/* Markers */}
          {markers.map((m) => (
            <div
              key={m.label}
              className="absolute group"
              style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -50%)" }}
            >
              <div className={`h-3 w-3 rounded-full border-2 ${
                m.status === "critical"
                  ? "bg-destructive border-destructive/50 animate-pulse-glow"
                  : "bg-success border-success/50"
              }`} />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden group-hover:block bg-card border border-border rounded px-2 py-1 text-[10px] text-foreground whitespace-nowrap z-10 shadow-lg">
                {m.label}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" /> Normal
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive" /> Crítico
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
