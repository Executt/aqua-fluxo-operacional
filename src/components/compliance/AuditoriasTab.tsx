import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ClipboardCheck, ClipboardList, Clock, Eye, FileCheck2, FileX2, Filter, User,
} from "lucide-react";
import { auditoriaStatusColor, auditoriasMock, statusColor, statusLabel } from "./shared";

interface Props {
  audStatus: string;
  setAudStatus: (v: string) => void;
  onSelect: (a: any) => void;
}

export function AuditoriasTab({ audStatus, setAudStatus, onSelect }: Props) {
  const audKpis = {
    agendadas: auditoriasMock.filter((a) => a.status === "agendada").length,
    em_andamento: auditoriasMock.filter((a) => a.status === "em_andamento").length,
    concluidas: auditoriasMock.filter((a) => a.status === "concluida").length,
    nao_conformes: auditoriasMock.filter((a) => a.resultado === "nao_conforme").length,
  };
  const auditoriasFiltered = audStatus === "all"
    ? auditoriasMock
    : auditoriasMock.filter((a) => a.status === audStatus);

  const kpiCards = [
    { label: "Agendadas", value: audKpis.agendadas, icon: Clock, color: "text-primary" },
    { label: "Em Andamento", value: audKpis.em_andamento, icon: ClipboardList, color: "text-warning" },
    { label: "Concluídas", value: audKpis.concluidas, icon: FileCheck2, color: "text-success" },
    { label: "Não Conformes", value: audKpis.nao_conformes, icon: FileX2, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <Card key={k.label} className="bg-card border-border elevation-1">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider">{k.label}</p>
                <p className={`text-[22px] font-mono font-semibold ${k.color} leading-tight mt-1`}>{k.value}</p>
              </div>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border elevation-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-[13px] font-medium flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Auditorias Regulatórias
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={audStatus} onValueChange={setAudStatus}>
                <SelectTrigger className="w-44 h-9 bg-background border-border text-[12px]">
                  <Filter className="h-3.5 w-3.5 mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="agendada">Agendadas</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluídas</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-2 text-[12px]">
                <ClipboardList className="h-3.5 w-3.5" /> Nova Auditoria
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">ID</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Concessionária</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Auditor</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Data</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Resultado</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditoriasFiltered.map((a: any) => (
                <TableRow key={a.id} className="border-border hover:bg-accent/50">
                  <TableCell className="font-mono text-body-sm text-primary">{a.id}</TableCell>
                  <TableCell>
                    <p className="text-body-sm font-medium text-foreground">{a.entidade}</p>
                    <p className="text-caption text-muted-foreground">{a.uf}</p>
                  </TableCell>
                  <TableCell className="text-body-sm">{a.tipo}</TableCell>
                  <TableCell className="text-body-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> {a.auditor}
                  </TableCell>
                  <TableCell className="text-body-sm font-mono text-muted-foreground">{a.data}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${auditoriaStatusColor[a.status] || ""}`}>
                      {a.status === "agendada" ? "Agendada" : a.status === "em_andamento" ? "Em Andamento" : "Concluída"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.resultado ? (
                      <Badge variant="outline" className={`text-[10px] ${statusColor[a.resultado] || ""}`}>
                        {statusLabel[a.resultado] || a.resultado}
                      </Badge>
                    ) : (
                      <span className="text-caption text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onSelect(a)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
