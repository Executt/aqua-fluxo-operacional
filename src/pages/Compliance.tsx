import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line,
} from "recharts";
import {
  ShieldCheck, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  FileText, Building2, Calendar, Award, XCircle, BarChart3, Target,
} from "lucide-react";
import { CHART_COLORS, CHART_GRID, CHART_TICK } from "@/lib/chart-colors";
import { useComplianceScores, useInfracoes } from "@/hooks/use-sigsan-data";
import { Skeleton } from "@/components/ui/skeleton";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

// Static chart data (would come from historical compliance_scores in production)
const evolucaoMensal = [
  { mes: "Out", SP: 92, MG: 78, RJ: 65, BA: 58, PR: 88, PE: 55 },
  { mes: "Nov", SP: 93, MG: 80, RJ: 68, BA: 60, PR: 89, PE: 57 },
  { mes: "Dez", SP: 91, MG: 82, RJ: 70, BA: 62, PR: 88, PE: 58 },
  { mes: "Jan", SP: 94, MG: 83, RJ: 72, BA: 64, PR: 90, PE: 59 },
  { mes: "Fev", SP: 95, MG: 85, RJ: 74, BA: 66, PR: 91, PE: 61 },
  { mes: "Mar", SP: 96, MG: 87, RJ: 74, BA: 68, PR: 91, PE: 62 },
];

const radarData = [
  { criterio: "Qualidade\nÁgua", SABESP: 98, CEDAE: 72, COMPESA: 55 },
  { criterio: "Cobertura\nEsgoto", SABESP: 95, CEDAE: 68, COMPESA: 48 },
  { criterio: "Perdas\nDistrib.", SABESP: 92, CEDAE: 60, COMPESA: 52 },
  { criterio: "Atendimento\nPrazo", SABESP: 96, CEDAE: 80, COMPESA: 70 },
  { criterio: "Invest.\nInfra", SABESP: 94, CEDAE: 78, COMPESA: 65 },
  { criterio: "Relatórios\nEntregues", SABESP: 100, CEDAE: 85, COMPESA: 72 },
];

const statusColor: Record<string, string> = {
  conforme: "bg-success/15 text-success border-success/30",
  parcial: "bg-warning/15 text-warning border-warning/30",
  "nao-conforme": "bg-destructive/15 text-destructive border-destructive/30",
};
const statusLabel: Record<string, string> = {
  conforme: "Conforme", parcial: "Parcial", "nao-conforme": "Não Conforme",
};
const gravidadeColor: Record<string, string> = {
  leve: "bg-muted text-muted-foreground border-border",
  media: "bg-warning/15 text-warning border-warning/30",
  grave: "bg-destructive/15 text-destructive border-destructive/30",
  critica: "bg-destructive/20 text-destructive border-destructive/40",
};
const infracaoStatusColor: Record<string, string> = {
  aberta: "bg-destructive/15 text-destructive border-destructive/30",
  em_analise: "bg-warning/15 text-warning border-warning/30",
  resolvida: "bg-success/15 text-success border-success/30",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs text-muted-foreground">
          <span style={{ color: p.color }}>●</span> {p.dataKey}: {p.value}%
        </p>
      ))}
    </div>
  );
};

const CompliancePage = () => {
  const { data: scores, isLoading: loadingScores } = useComplianceScores();
  const { data: infracoes, isLoading: loadingInfracoes } = useInfracoes();
  const [filterUf, setFilterUf] = useState("all");

  // Map UF from entidade area_atuacao
  const getUf = (entidadeNome: string) => {
    const ufMap: Record<string, string> = {
      SABESP: "SP", COPASA: "MG", CEDAE: "RJ", EMBASA: "BA",
      SANEPAR: "PR", COMPESA: "PE", CAGECE: "CE", COSANPA: "PA",
    };
    return ufMap[entidadeNome] || "??";
  };

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
  const naoConformes = concessionarias.filter((c) => c.status === "nao-conforme").length;
  const totalInfracoes = (infracoes || []).filter((i) => i.status !== "resolvida").length;

  const kpis = [
    { title: "Score Médio Nacional", value: `${avgScore}%`, icon: Target, color: "text-primary" },
    { title: "Conformes", value: String(conformes), icon: CheckCircle2, color: "text-success" },
    { title: "Não Conformes", value: String(naoConformes), icon: XCircle, color: "text-destructive" },
    { title: "Infrações Abertas", value: String(totalInfracoes), icon: AlertTriangle, color: "text-warning" },
  ];

  return (
    <DashboardLayout>
      <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestão SARSB — Compliance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitorização do cumprimento regulatório das concessionárias de saneamento
            </p>
          </div>
          <Button className="gap-2"><FileText className="h-4 w-4" /> Gerar Relatório</Button>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.title} initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}>
              <Card className="border-border elevation-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{kpi.title}</span>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div className={`text-3xl font-bold ${kpi.color} font-mono`}>
                    {loadingScores ? <Skeleton className="h-8 w-16" /> : kpi.value}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeUp}>
          <Tabs defaultValue="ranking" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="ranking" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Award className="h-4 w-4" /> Ranking
              </TabsTrigger>
              <TabsTrigger value="evolucao" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <BarChart3 className="h-4 w-4" /> Evolução
              </TabsTrigger>
              <TabsTrigger value="infracoes" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <AlertTriangle className="h-4 w-4" /> Infrações
              </TabsTrigger>
            </TabsList>

            {/* Ranking */}
            <TabsContent value="ranking" className="space-y-6">
              <div className="flex items-center gap-4">
                <Select value={filterUf} onValueChange={setFilterUf}>
                  <SelectTrigger className="w-48 bg-card border-border"><SelectValue placeholder="Filtrar por UF" /></SelectTrigger>
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-border elevation-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" /> Ranking de Compliance por Concessionária
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider w-12">#</TableHead>
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Concessionária</TableHead>
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Score</TableHead>
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Metas</TableHead>
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Tendência</TableHead>
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Infrações</TableHead>
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
                            <TableRow key={c.id} className="border-border">
                              <TableCell className="font-mono text-xs text-muted-foreground font-bold">{i + 1}</TableCell>
                              <TableCell>
                                <div><p className="text-sm font-medium">{c.nome}</p><p className="text-[10px] text-muted-foreground">{c.uf}</p></div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={c.score} className="w-16 h-1.5" />
                                  <span className={`font-mono text-xs font-bold ${c.score >= 85 ? "text-success" : c.score >= 70 ? "text-warning" : "text-destructive"}`}>{c.score}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">{c.metas_cumpridas}/{c.metas_total}</TableCell>
                              <TableCell>
                                {c.tendencia === "up" && <TrendingUp className="h-4 w-4 text-success" />}
                                {c.tendencia === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                                {c.tendencia === "stable" && <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={statusColor[c.status] || ""}>{statusLabel[c.status] || c.status}</Badge>
                              </TableCell>
                              <TableCell>
                                {c.infracoes_abertas > 0 ? (
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-mono">{c.infracoes_abertas}</Badge>
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

                <Card className="border-border elevation-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> Análise Multidimensional
                    </CardTitle>
                    <CardDescription className="text-xs">SABESP vs CEDAE vs COMPESA</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke={CHART_GRID} />
                        <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 9, fill: CHART_TICK }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: CHART_TICK }} />
                        <Radar name="SABESP" dataKey="SABESP" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.15} strokeWidth={2} />
                        <Radar name="CEDAE" dataKey="CEDAE" stroke={CHART_COLORS.warning} fill={CHART_COLORS.warning} fillOpacity={0.1} strokeWidth={2} />
                        <Radar name="COMPESA" dataKey="COMPESA" stroke={CHART_COLORS.destructive} fill={CHART_COLORS.destructive} fillOpacity={0.1} strokeWidth={2} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Evolução */}
            <TabsContent value="evolucao" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border elevation-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" /> Evolução de Compliance por Estado
                    </CardTitle>
                    <CardDescription className="text-xs">Últimos 6 meses (% compliance)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={evolucaoMensal} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} domain={[40, 100]} unit="%" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="SP" fill={CHART_COLORS.primary} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="MG" fill={CHART_COLORS.success} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="RJ" fill={CHART_COLORS.warning} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="BA" fill={CHART_COLORS.purple} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-border elevation-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Tendência de Compliance
                    </CardTitle>
                    <CardDescription className="text-xs">Linha de tendência por estado</CardDescription>
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

            {/* Infrações */}
            <TabsContent value="infracoes">
              <Card className="border-border elevation-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" /> Registro de Infrações
                    </CardTitle>
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-mono">
                      {totalInfracoes} abertas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">ID</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Concessionária</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Descrição</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Norma</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Gravidade</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Prazo</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingInfracoes ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i} className="border-border">
                            {Array.from({ length: 7 }).map((_, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        (infracoes || []).map((inf) => (
                          <TableRow key={inf.id} className="border-border">
                            <TableCell className="font-mono text-xs text-primary">{inf.codigo}</TableCell>
                            <TableCell>
                              <p className="text-xs font-medium">{(inf.entidades as any)?.nome || "—"}</p>
                            </TableCell>
                            <TableCell className="text-xs max-w-[280px] truncate">{inf.descricao}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground font-mono">{inf.norma}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={gravidadeColor[inf.gravidade] || ""}>
                                {inf.gravidade.charAt(0).toUpperCase() + inf.gravidade.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" /> {inf.prazo}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={infracaoStatusColor[inf.status] || ""}>
                                {inf.status === "aberta" ? "Aberta" : inf.status === "em_analise" ? "Em Análise" : "Resolvida"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default CompliancePage;
