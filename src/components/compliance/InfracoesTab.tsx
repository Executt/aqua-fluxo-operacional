import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Calendar, Download, Eye, Filter, Search } from "lucide-react";
import { gravidadeColor, infracaoStatusColor } from "./shared";

interface Props {
  loading: boolean;
  totalInfracoes: number;
  infSearch: string;
  setInfSearch: (v: string) => void;
  infStatus: string;
  setInfStatus: (v: string) => void;
  infGravidade: string;
  setInfGravidade: (v: string) => void;
  infracoesFiltered: any[];
  onSelect: (inf: any) => void;
}

export function InfracoesTab({
  loading, totalInfracoes, infSearch, setInfSearch, infStatus, setInfStatus,
  infGravidade, setInfGravidade, infracoesFiltered, onSelect,
}: Props) {
  return (
    <Card className="bg-card border-border elevation-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-[13px] font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Registro de Infrações
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-mono text-[10px] ml-2">
              {totalInfracoes} abertas
            </Badge>
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-2 text-[12px]">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descrição, norma ou entidade..."
              value={infSearch}
              onChange={(e) => setInfSearch(e.target.value)}
              className="pl-8 h-9 text-[12px] bg-background border-border"
            />
          </div>
          <Select value={infStatus} onValueChange={setInfStatus}>
            <SelectTrigger className="w-40 h-9 bg-background border-border text-[12px]">
              <Filter className="h-3.5 w-3.5 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="resolvida">Resolvida</SelectItem>
            </SelectContent>
          </Select>
          <Select value={infGravidade} onValueChange={setInfGravidade}>
            <SelectTrigger className="w-40 h-9 bg-background border-border text-[12px]">
              <SelectValue placeholder="Gravidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda gravidade</SelectItem>
              <SelectItem value="leve">Leve</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">ID</TableHead>
              <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Concessionária</TableHead>
              <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Descrição</TableHead>
              <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Norma</TableHead>
              <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Gravidade</TableHead>
              <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Prazo</TableHead>
              <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-caption text-muted-foreground uppercase tracking-wider w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : infracoesFiltered.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={8} className="text-center text-body-sm text-muted-foreground py-10">
                  Nenhuma infração encontrada para os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              infracoesFiltered.map((inf: any) => (
                <TableRow key={inf.id} className="border-border hover:bg-accent/50">
                  <TableCell className="font-mono text-body-sm text-primary">{inf.codigo}</TableCell>
                  <TableCell>
                    <p className="text-body-sm font-medium text-foreground">{(inf.entidades as any)?.nome || "—"}</p>
                  </TableCell>
                  <TableCell className="text-body-sm max-w-[280px] truncate">{inf.descricao}</TableCell>
                  <TableCell className="text-caption text-muted-foreground font-mono">{inf.norma}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${gravidadeColor[inf.gravidade] || ""}`}>
                      {inf.gravidade.charAt(0).toUpperCase() + inf.gravidade.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {inf.prazo}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${infracaoStatusColor[inf.status] || ""}`}>
                      {inf.status === "aberta" ? "Aberta" : inf.status === "em_analise" ? "Em Análise" : "Resolvida"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onSelect(inf)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
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
