import { DashboardLayout } from "@/components/DashboardLayout";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  FileText, Calendar, Award, XCircle, BarChart3, Target,
  Search, Filter, Download, Eye, Gauge, ClipboardCheck, ClipboardList,
  Clock, User, FileCheck2, FileX2, FileWarning,
} from "lucide-react";
import { CHART_COLORS, CHART_GRID, CHART_TICK } from "@/lib/chart-colors";
import { useComplianceScores, useInfracoes } from "@/hooks/use-sigsan-data";
import { Skeleton } from "@/components/ui/skeleton";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const evolucaoMensal = [
  { mes: "Out", SP: 92, MG: 78, RJ: 65, BA: 58, PR: 88, PE: 55 },
  { mes: "Nov", SP: 93, MG: 80, RJ: 68, BA: 60, PR: 89, PE: 57 },
  { mes: "Dez", SP: 91, MG: 82, RJ: 70, BA: 62, PR: 88, PE: 58 },
  { mes: "Jan", SP: 94, MG: 83, RJ: 72, BA: 64, PR: 90, PE: 59 },
  { mes: "Fev", SP: 95, MG: 85, RJ: 74, BA: 66, PR: 91, PE: 61 },
  { mes: "Mar", SP: 96, MG: 87, RJ: 74, BA: 68, PR: 91, PE: 62 },
];

const radarData = [
  { criterio: "Qualidade Agua", SABESP: 98, CEDAE: 72, COMPESA: 55 },
  { criterio: "Cobertura Esgoto", SABESP: 95, CEDAE: 68, COMPESA: 48 },
  { criterio: "Perdas Distrib.", SABESP: 92, CEDAE: 60, COMPESA: 52 },
  { criterio: "Atendimento Prazo", SABESP: 96, CEDAE: 80, COMPESA: 70 },
  { criterio: "Invest. Infra", SABESP: 94, CEDAE: 78, COMPESA: 65 },
  { criterio: "Relatorios Entregues", SABESP: 100, CEDAE: 85, COMPESA: 72 },
];

// Mock — dimensões SARSB por concessionária (ANA 79/2022)
const dimensoesScore = [
  { dimensao: "Cobertura", peso: 25, descricao: "Atendimento de água/esgoto" },
  { dimensao: "Qualidade", peso: 30, descricao: "Conformidade físico-química" },
  { dimensao: "Atendimento", peso: 20, descricao: "Prazos e SLA ao usuário" },
  { dimensao: "Financeira", peso: 25, descricao: "Sustentabilidade econômica" },
];

// Mock — auditorias agendadas / realizadas
const auditoriasMock = [
  { id: "AUD-2026-014", entidade: "SABESP", uf: "SP", tipo: "Programada", auditor: "ANA — DRU/SP", data: "2026-06-12", status: "agendada", escopo: "Qualidade da água — bacia Alto Tietê" },
  { id: "AUD-2026-013", entidade: "CEDAE", uf: "RJ", tipo: "Especial", auditor: "ANA — DRU/RJ", data: "2026-06-05", status: "em_andamento", escopo: "Investigação infrações INF-RJ-2026-0019" },
  { id: "AUD-2026-012", entidade: "COMPESA", uf: "PE", tipo: "Programada", auditor: "ANA — DRU/NE", data: "2026-05-28", status: "concluida", resultado: "nao_conforme", escopo: "Cobertura de esgoto RM Recife" },
  { id: "AUD-2026-011", entidade: "SANEPAR", uf: "PR", tipo: "Documental", auditor: "ANA — DRU/SUL", data: "2026-05-22", status: "concluida", resultado: "conforme", escopo: "Plano de investimentos 2025" },
  { id: "AUD-2026-010", entidade: "COPASA", uf: "MG", tipo: "In loco", auditor: "ANA — DRU/MG", data: "2026-05-15", status: "concluida", resultado: "parcial", escopo: "ETE Arrudas — eficiência DBO" },
  { id: "AUD-2026-009", entidade: "EMBASA", uf: "BA", tipo: "Programada", auditor: "ANA — DRU/NE", data: "2026-05-08", status: "concluida", resultado: "conforme", escopo: "Indicadores SARSB Q1/2026" },
];

const statusColor: Record<string, string> = {
  conforme: "bg-success/15 text-success border-success/30",
  parcial: "bg-warning/15 text-warning border-warning/30",
  "nao-conforme": "bg-destructive/15 text-destructive border-destructive/30",
  nao_conforme: "bg-destructive/15 text-destructive border-destructive/30",
};
const statusLabel: Record<string, string> = {
  conforme: "Conforme", parcial: "Parcial", "nao-conforme": "Não Conforme", nao_conforme: "Não Conforme",
};
const gravidadeColor: Record<string, string> = {
  leve: "bg-muted text-muted-foreground border-border",
  media: "bg-warning/15 text-warning border-warning/30",
  grave: "bg-destructive/15 text-destructive border-destructive/30",
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  critica: "bg-destructive/20 text-destructive border-destructive/40",
};
const infracaoStatusColor: Record<string, string> = {
  aberta: "bg-destructive/15 text-destructive border-destructive/30",
  em_analise: "bg-warning/15 text-warning border-warning/30",
  resolvida: "bg-success/15 text-success border-success/30",
};
const auditoriaStatusColor: Record<string, string> = {
  agendada: "bg-primary/15 text-primary border-primary/30",
  em_andamento: "bg-warning/15 text-warning border-warning/30",
  concluida: "bg-success/15 text-success border-success/30",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 elevation-2">
      <p className="text-body-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-body-sm text-muted-foreground">
          <span style={{ color: p.color }}>●</span> {p.dataKey}: {p.value}%
        </p>
      ))}
    </div>
  );
};

const getUf = (nome: string) => {
  const map: Record<string, string> = {
    SABESP: "SP", COPASA: "MG", CEDAE: "RJ", EMBASA: "BA",
    SANEPAR: "PR", COMPESA: "PE", CAGECE: "CE", COSANPA: "PA",
  };
  return map[nome] || "??";
};

const CompliancePage = () => {
  const { data: scores, isLoading: loadingScores } = useComplianceScores();
  const { data: infracoes, isLoading: loadingInfracoes } = useInfracoes();
  const [filterUf, setFilterUf] = useState("all");

  // Infrações filters / details
  const [infSearch, setInfSearch] = useState("");
  const [infStatus, setInfStatus] = useState("all");
  const [infGravidade, setInfGravidade] = useState("all");
  const [selectedInfracao, setSelectedInfracao] = useState<any | null>(null);

  // Scores detail
  const [scoreFocus, setScoreFocus] = useState<string>("SABESP");

  // Auditorias filter
  const [audStatus, setAudStatus] = useState("all");
  const [selectedAud, setSelectedAud] = useState<any | null>(null);

  const concessionarias = (scores || []).map((s) => ({
    ...s,
    nome: (s.entidades as any)?.nome || "—",
    uf: getUf((s.entidades as any)?.nome || ""),
  }));

  const filtered = filterUf === "all"
    ? concessionarias
    : concessionarias.filter((c) => c.uf === filterUf);

  const avgScore = concessionarias.length
    ? Math.round(concessionarias.reduce((a, c) => a + c.score, 0) / concessionarias.length)
    : 0;
  const conformes = concessionarias.filter((c) => c.status === "conforme").length;
  const naoConformes = concessionarias.filter((c) => c.status === "nao-conforme" || c.status === "nao_conforme").length;
  const totalInfracoes = (infracoes || []).filter((i) => i.status !== "resolvida").length;

  const kpis = [
    { title: "Score Médio Nacional", value: `${avgScore}%`, icon: Target, color: "text-primary" },
    { title: "Conformes", value: String(conformes), icon: CheckCircle2, color: "text-success" },
    { title: "Não Conformes", value: String(naoConformes), icon: XCircle, color: "text-destructive" },
    { title: "Infrações Abertas", value: String(totalInfracoes), icon: AlertTriangle, color: "text-warning" },
  ];

  // Distribuição por status (pie)
  const distribStatus = useMemo(() => {
    const c = concessionarias.length || 1;
    const parcial = concessionarias.filter((x) => x.status === "parcial").length;
    return [
      { name: "Conforme", value: conformes, color: CHART_COLORS.success },
      { name: "Parcial", value: parcial, color: CHART_COLORS.warning },
      { name: "Não Conforme", value: naoConformes, color: CHART_COLORS.destructive },
      { name: "—", value: Math.max(0, c - conformes - parcial - naoConformes), color: CHART_GRID },
    ].filter((d) => d.value > 0);
  }, [concessionarias.length, conformes, naoConformes]);

  // Score detalhado (mock por dimensão para a concessionária em foco)
  const detalheScore = useMemo(() => {
    const base = concessionarias.find((c) => c.nome === scoreFocus);
    const seed = base?.score ?? 75;
    return dimensoesScore.map((d, i) => {
      const delta = [4, -2, 6, -4][i] || 0;
      const val = Math.max(0, Math.min(100, seed + delta));
      return { ...d, valor: val };
    });
  }, [scoreFocus, concessionarias]);

  const infracoesFiltered = useMemo(() => {
    return (infracoes || []).filter((i: any) => {
      if (infStatus !== "all" && i.status !== infStatus) return false;
      if (infGravidade !== "all" && i.gravidade !== infGravidade) return false;
      if (infSearch) {
        const s = infSearch.toLowerCase();
        const hay = [i.codigo, i.descricao, i.norma, (i.entidades as any)?.nome].join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [infracoes, infStatus, infGravidade, infSearch]);

  const auditoriasFiltered = useMemo(() => {
    return audStatus === "all" ? auditoriasMock : auditoriasMock.filter((a) => a.status === audStatus);
  }, [audStatus]);

  const audKpis = {
    agendadas: auditoriasMock.filter((a) => a.status === "agendada").length,
    em_andamento: auditoriasMock.filter((a) => a.status === "em_andamento").length,
    concluidas: auditoriasMock.filter((a) => a.status === "concluida").length,
    nao_conformes: auditoriasMock.filter((a) => a.resultado === "nao_conforme").length,
  };

  return (
    <DashboardLayout>
      <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1 text-foreground">Gestão SARSB — Compliance</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Monitorização do cumprimento regulatório das concessionárias de saneamento
            </p>
          </div>
          <Button size="sm" className="gap-2 text-[12px]"><FileText className="h-3.5 w-3.5" /> Gerar Relatório</Button>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.06 }}>
              <Card className="bg-card border-border elevation-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-body-sm text-muted-foreground font-medium">{kpi.title}</span>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div className={`text-[28px] font-semibold ${kpi.color} font-mono leading-none`}>
                    {loadingScores ? <Skeleton className="h-8 w-16" /> : kpi.value}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeUp}>
          <Tabs defaultValue="scores" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="scores" className="gap-2 text-[12px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Gauge className="h-4 w-4" /> Scores
              </TabsTrigger>
              <TabsTrigger value="ranking" className="gap-2 text-[12px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Award className="h-4 w-4" /> Ranking
              </TabsTrigger>
              <TabsTrigger value="evolucao" className="gap-2 text-[12px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <BarChart3 className="h-4 w-4" /> Evolução
              </TabsTrigger>
              <TabsTrigger value="infracoes" className="gap-2 text-[12px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <AlertTriangle className="h-4 w-4" /> Infrações
              </TabsTrigger>
              <TabsTrigger value="auditorias" className="gap-2 text-[12px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <ClipboardCheck className="h-4 w-4" /> Auditorias
              </TabsTrigger>
            </TabsList>

            {/* ============ SCORES ============ */}
            <TabsContent value="scores" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-card border-border elevation-1 lg:col-span-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                          <Gauge className="h-4 w-4 text-primary" /> Score Detalhado por Dimensão (SARSB / ANA 79-2022)
                        </CardTitle>
                        <CardDescription className="text-body-sm mt-1">Decomposição do score nas 4 dimensões regulatórias</CardDescription>
                      </div>
                      <Select value={scoreFocus} onValueChange={setScoreFocus}>
                        <SelectTrigger className="w-44 bg-card border-border text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {concessionarias.map((c) => (
                            <SelectItem key={c.id} value={c.nome}>{c.nome} ({c.uf})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {detalheScore.map((d) => (
                      <div key={d.dimensao} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-foreground">{d.dimensao}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">peso {d.peso}%</Badge>
                          </div>
                          <span className={`font-mono text-body-sm font-bold ${d.valor >= 85 ? "text-success" : d.valor >= 70 ? "text-warning" : "text-destructive"}`}>
                            {d.valor}%
                          </span>
                        </div>
                        <Progress value={d.valor} className="h-2" />
                        <p className="text-caption text-muted-foreground">{d.descricao}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border elevation-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> Distribuição de Status
                    </CardTitle>
                    <CardDescription className="text-body-sm">Concessionárias por nível de conformidade</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={distribStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                          {distribStatus.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border elevation-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Comparativo Multidimensional
                  </CardTitle>
                  <CardDescription className="text-body-sm">SABESP vs CEDAE vs COMPESA — 6 critérios SARSB</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={340}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={CHART_GRID} />
                      <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 10, fill: CHART_TICK }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: CHART_TICK }} />
                      <Radar name="SABESP" dataKey="SABESP" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.15} strokeWidth={2} />
                      <Radar name="CEDAE" dataKey="CEDAE" stroke={CHART_COLORS.warning} fill={CHART_COLORS.warning} fillOpacity={0.1} strokeWidth={2} />
                      <Radar name="COMPESA" dataKey="COMPESA" stroke={CHART_COLORS.destructive} fill={CHART_COLORS.destructive} fillOpacity={0.1} strokeWidth={2} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============ RANKING ============ */}
            <TabsContent value="ranking" className="space-y-6">
              <div className="flex items-center gap-4">
                <Select value={filterUf} onValueChange={setFilterUf}>
                  <SelectTrigger className="w-48 bg-card border-border text-[12px]"><SelectValue placeholder="Filtrar por UF" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estados</SelectItem>
                    <SelectItem value="SP">São Paulo</SelectItem>
                    <SelectItem value="MG">Minas Gerais</SelectItem>
                    <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                    <SelectItem value="BA">Bahia</SelectItem>
                    <SelectItem value="PR">Paraná</SelectItem>
                    <SelectItem value="PE">Pernambuco</SelectItem>
                    <SelectItem value="CE">Ceará</SelectItem>
                    <SelectItem value="PA">Pará</SelectItem>
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
                      {loadingScores ? (
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
                              <div><p className="text-[13px] font-medium text-foreground">{c.nome}</p><p className="text-caption text-muted-foreground">{c.uf}</p></div>
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
            </TabsContent>

            {/* ============ EVOLUÇÃO ============ */}
            <TabsContent value="evolucao" className="space-y-6">
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
            </TabsContent>

            {/* ============ INFRAÇÕES ============ */}
            <TabsContent value="infracoes" className="space-y-4">
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
                      {loadingInfracoes ? (
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
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedInfracao(inf)}>
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
            </TabsContent>

            {/* ============ AUDITORIAS ============ */}
            <TabsContent value="auditorias" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Agendadas", value: audKpis.agendadas, icon: Clock, color: "text-primary" },
                  { label: "Em Andamento", value: audKpis.em_andamento, icon: ClipboardList, color: "text-warning" },
                  { label: "Concluídas", value: audKpis.concluidas, icon: FileCheck2, color: "text-success" },
                  { label: "Não Conformes", value: audKpis.nao_conformes, icon: FileX2, color: "text-destructive" },
                ].map((k) => (
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
                      {auditoriasFiltered.map((a) => (
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
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedAud(a)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* ============ DIALOG: Infração ============ */}
      <Dialog open={!!selectedInfracao} onOpenChange={(o) => !o && setSelectedInfracao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-warning" />
              <span className="font-mono text-primary">{selectedInfracao?.codigo}</span>
              <Badge variant="outline" className={`text-[10px] ${gravidadeColor[selectedInfracao?.gravidade] || ""}`}>
                {selectedInfracao?.gravidade}
              </Badge>
            </DialogTitle>
            <DialogDescription>{(selectedInfracao?.entidades as any)?.nome}</DialogDescription>
          </DialogHeader>
          {selectedInfracao && (
            <div className="space-y-4 text-body-sm">
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                <p className="text-foreground">{selectedInfracao.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Norma</p>
                  <p className="font-mono text-foreground">{selectedInfracao.norma}</p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                  <Badge variant="outline" className={`text-[10px] ${infracaoStatusColor[selectedInfracao.status] || ""}`}>
                    {selectedInfracao.status === "aberta" ? "Aberta" : selectedInfracao.status === "em_analise" ? "Em Análise" : "Resolvida"}
                  </Badge>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Data Ocorrência</p>
                  <p className="font-mono text-foreground">{selectedInfracao.data_ocorrencia || "—"}</p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Prazo Regularização</p>
                  <p className="font-mono text-foreground">{selectedInfracao.prazo || "—"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedInfracao(null)}>Fechar</Button>
            <Button size="sm" className="gap-2"><FileText className="h-3.5 w-3.5" /> Abrir Processo SEI</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: Auditoria ============ */}
      <Dialog open={!!selectedAud} onOpenChange={(o) => !o && setSelectedAud(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <span className="font-mono text-primary">{selectedAud?.id}</span>
              <Badge variant="outline" className={`text-[10px] ${auditoriaStatusColor[selectedAud?.status] || ""}`}>
                {selectedAud?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>{selectedAud?.entidade} — {selectedAud?.uf}</DialogDescription>
          </DialogHeader>
          {selectedAud && (
            <div className="space-y-4 text-body-sm">
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Escopo</p>
                <p className="text-foreground">{selectedAud.escopo}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Tipo</p>
                  <p className="text-foreground">{selectedAud.tipo}</p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Auditor</p>
                  <p className="text-foreground">{selectedAud.auditor}</p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Data</p>
                  <p className="font-mono text-foreground">{selectedAud.data}</p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Resultado</p>
                  {selectedAud.resultado ? (
                    <Badge variant="outline" className={`text-[10px] ${statusColor[selectedAud.resultado] || ""}`}>
                      {statusLabel[selectedAud.resultado]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Pendente</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedAud(null)}>Fechar</Button>
            <Button size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Baixar Laudo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CompliancePage;
