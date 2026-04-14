import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Radio } from "lucide-react";
import { useSensores } from "@/hooks/use-sigsan-data";
import { Skeleton } from "@/components/ui/skeleton";

export function AlertsTable() {
  const { data: sensores, isLoading } = useSensores();

  // Show only critical/alerta sensors as alerts
  const alerts = (sensores || []).map((s) => ({
    id: (s.etes as any)?.nome ? `${(s.etes as any).nome.replace("ETE ", "ETE-")}` : s.codigo,
    eteCode: s.codigo.split("-").slice(0, 2).join("-"),
    loc: `${(s.etes as any)?.cidade || "—"}, ${(s.etes as any)?.uf || ""}`,
    param: s.tipo,
    limite: s.limite_legal,
    status: s.status === "critico" ? "Crítico" : s.status === "alerta" ? "Alerta" : "Normal",
    codigo: s.codigo,
  }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          Últimos Alertas de Sensores
          <Badge variant="outline" className="ml-2 text-[10px] border-success/30 text-success font-mono">
            TEMPO REAL
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">ID Sensor</TableHead>
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Localização</TableHead>
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Parâmetro</TableHead>
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Limite Legal</TableHead>
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              alerts.map((a) => (
                <TableRow key={a.codigo} className="border-border">
                  <TableCell className="font-mono text-xs text-primary">{a.codigo}</TableCell>
                  <TableCell className="text-xs">{a.loc}</TableCell>
                  <TableCell className="text-xs">{a.param}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{a.limite}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        a.status === "Crítico"
                          ? "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
                          : "bg-success/15 text-success border-success/30 hover:bg-success/20"
                      }
                      variant="outline"
                    >
                      {a.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
