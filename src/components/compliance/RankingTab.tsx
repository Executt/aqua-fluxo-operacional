import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { statusColor, statusLabel, type Concessionaria } from "./shared";

interface Props {
  filtered: Concessionaria[];
  filterUf: string;
  setFilterUf: (v: string) => void;
  loading: boolean;
}

export function RankingTab({ filtered, filterUf, setFilterUf, loading }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={filterUf} onValueChange={setFilterUf}>
          <SelectTrigger className="w-48 bg-card border-border text-[12px]"><SelectValue placeholder="Filtrar por UF" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Estados</SelectItem>
            {["SP","MG","RJ","BA","PR","PE","CE","PA"].map((uf) => (
              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border elevation-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] font-medium flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Ranking de Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider w-12">#</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Concessionária</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Score</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Metas</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Tendência</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Infrações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                [...filtered].sort((a, b) => b.score - a.score).map((c, i) => (
                  <TableRow key={c.id} className="border-border hover:bg-accent/50">
                    <TableCell className="font-mono text-body-sm text-muted-foreground font-bold">{i + 1}</TableCell>
                    <TableCell>
                      <p className="text-[13px] font-medium text-foreground">{c.nome}</p>
                      <p className="text-caption text-muted-foreground">{c.uf}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={c.score} className="w-16 h-1.5" />
                        <span className={`font-mono text-body-sm font-bold ${c.score >= 85 ? "text-success" : c.score >= 70 ? "text-warning" : "text-destructive"}`}>{c.score}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-body-sm font-mono text-muted-foreground">{c.metas_cumpridas}/{c.metas_total}</TableCell>
                    <TableCell>
                      {c.tendencia === "up" && <TrendingUp className="h-4 w-4 text-success" />}
                      {c.tendencia === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                      {c.tendencia === "stable" && <span className="text-body-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${statusColor[c.status] || ""}`}>{statusLabel[c.status] || c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.infracoes_abertas > 0 ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-mono text-[10px]">{c.infracoes_abertas}</Badge>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
