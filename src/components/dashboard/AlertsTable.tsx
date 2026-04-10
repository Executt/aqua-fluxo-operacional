import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Radio } from "lucide-react";

const alerts = [
  { id: "ETE-0482", loc: "São Paulo, SP", param: "pH", valor: "9.8", limite: "6.0 - 9.0", status: "Crítico" },
  { id: "ETE-1204", loc: "Belo Horizonte, MG", param: "Turbidez", valor: "42 NTU", limite: "≤ 40 NTU", status: "Crítico" },
  { id: "ETE-0891", loc: "Curitiba, PR", param: "DBO", valor: "28 mg/L", limite: "≤ 60 mg/L", status: "Normal" },
  { id: "ETE-0327", loc: "Salvador, BA", param: "Cloro Residual", valor: "0.1 mg/L", limite: "≥ 0.2 mg/L", status: "Crítico" },
  { id: "ETE-1530", loc: "Manaus, AM", param: "pH", valor: "7.2", limite: "6.0 - 9.0", status: "Normal" },
  { id: "ETE-0715", loc: "Recife, PE", param: "Temperatura", valor: "32°C", limite: "≤ 40°C", status: "Normal" },
  { id: "ETE-0963", loc: "Rio de Janeiro, RJ", param: "Coliformes", valor: "1200 UFC", limite: "≤ 1000 UFC", status: "Crítico" },
  { id: "ETE-1102", loc: "Fortaleza, CE", param: "Turbidez", valor: "55 NTU", limite: "≤ 40 NTU", status: "Crítico" },
];

export function AlertsTable() {
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
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">ID da ETE</TableHead>
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Localização</TableHead>
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Parâmetro</TableHead>
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Valor Atual</TableHead>
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Limite Legal</TableHead>
              <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((a) => (
              <TableRow key={a.id + a.param} className="border-border">
                <TableCell className="font-mono text-xs text-primary">{a.id}</TableCell>
                <TableCell className="text-xs">{a.loc}</TableCell>
                <TableCell className="text-xs">{a.param}</TableCell>
                <TableCell className="font-mono text-xs">{a.valor}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
