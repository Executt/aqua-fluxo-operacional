import { DashboardLayout } from "@/components/DashboardLayout";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, Award, BarChart3, CheckCircle2, ClipboardCheck, FileText, Gauge, Target, XCircle,
} from "lucide-react";
import { CHART_COLORS, CHART_GRID } from "@/lib/chart-colors";
import { useComplianceScores, useInfracoes } from "@/hooks/use-sigsan-data";
import {
  dimensoesScore, fadeUp, getUf, stagger, type Concessionaria,
} from "@/components/compliance/shared";
import { ScoresTab } from "@/components/compliance/ScoresTab";
import { RankingTab } from "@/components/compliance/RankingTab";
import { EvolucaoTab } from "@/components/compliance/EvolucaoTab";
import { InfracoesTab } from "@/components/compliance/InfracoesTab";
import { AuditoriasTab } from "@/components/compliance/AuditoriasTab";
import { AuditoriaDialog, InfracaoDialog } from "@/components/compliance/DetailDialogs";
import { ConfoundingBadge } from "@/components/analytics/ConfoundingBadge";
import { useDmiCounts, useDmiPesos, type EstratoDmi } from "@/hooks/use-dmi";

const CompliancePage = () => {
  const { data: scores, isLoading: loadingScores } = useComplianceScores();
  const { data: infracoes, isLoading: loadingInfracoes } = useInfracoes();

  const [filterUf, setFilterUf] = useState("all");
  const [filterEstrato, setFilterEstrato] = useState<"all" | EstratoDmi>("all");
  const [infSearch, setInfSearch] = useState("");
  const [infStatus, setInfStatus] = useState("all");
  const [infGravidade, setInfGravidade] = useState("all");
  const [selectedInfracao, setSelectedInfracao] = useState<any | null>(null);
  const [scoreFocus, setScoreFocus] = useState<string>("SABESP");
  const [audStatus, setAudStatus] = useState("all");
  const [selectedAud, setSelectedAud] = useState<any | null>(null);

  const { data: dmiCounts } = useDmiCounts();
  const { data: dmiPesos } = useDmiPesos();
  const minGroupSize = dmiPesos?.min_group_size ?? 30;
  const selectedN = filterEstrato === "all" ? null : (dmiCounts?.[filterEstrato] ?? 0);

  const concessionarias: Concessionaria[] = (scores || []).map((s: any) => ({
    ...s,
    nome: s.entidades?.nome || "—",
    uf: getUf(s.entidades?.nome || ""),
  }));

  const filtered = filterUf === "all"
    ? concessionarias
    : concessionarias.filter((c) => c.uf === filterUf);

  const avgScore = concessionarias.length
    ? Math.round(concessionarias.reduce((a, c) => a + c.score, 0) / concessionarias.length)
    : 0;
  const conformes = concessionarias.filter((c) => c.status === "conforme").length;
  const naoConformes = concessionarias.filter((c) => c.status === "nao-conforme" || c.status === "nao_conforme").length;
  const totalInfracoes = (infracoes || []).filter((i: any) => i.status !== "resolvida").length;

  const kpis = [
    { title: "Score Médio Nacional", value: `${avgScore}%`, icon: Target, color: "text-primary" },
    { title: "Conformes", value: String(conformes), icon: CheckCircle2, color: "text-success" },
    { title: "Não Conformes", value: String(naoConformes), icon: XCircle, color: "text-destructive" },
    { title: "Infrações Abertas", value: String(totalInfracoes), icon: AlertTriangle, color: "text-warning" },
  ];

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

  const detalheScore = useMemo(() => {
    const base = concessionarias.find((c) => c.nome === scoreFocus);
    const seed = base?.score ?? 75;
    return dimensoesScore.map((d, i) => {
      const delta = [4, -2, 6, -4][i] || 0;
      return { ...d, valor: Math.max(0, Math.min(100, seed + delta)) };
    });
  }, [scoreFocus, concessionarias]);

  const infracoesFiltered = useMemo(() => {
    return (infracoes || []).filter((i: any) => {
      if (infStatus !== "all" && i.status !== infStatus) return false;
      if (infGravidade !== "all" && i.gravidade !== infGravidade) return false;
      if (infSearch) {
        const s = infSearch.toLowerCase();
        const hay = [i.codigo, i.descricao, i.norma, i.entidades?.nome].join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [infracoes, infStatus, infGravidade, infSearch]);

  return (
    <DashboardLayout>
      <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-heading-1 text-foreground">Gestão SARSB — Compliance</h1>
              <ConfoundingBadge
                estrato={filterEstrato === "all" ? null : filterEstrato}
                n={selectedN}
                minGroupSize={minGroupSize}
              />
            </div>
            <p className="text-body-sm text-muted-foreground mt-1">
              Monitorização do cumprimento regulatório das concessionárias de saneamento
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Estrato DMI</Label>
              <Select value={filterEstrato} onValueChange={(v) => setFilterEstrato(v as any)}>
                <SelectTrigger className="h-9 w-[190px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos (não estratificado)</SelectItem>
                  {(["A", "B", "C", "D", "E"] as EstratoDmi[]).map((e) => (
                    <SelectItem key={e} value={e}>
                      DMI-{e} · {dmiCounts?.[e] ?? 0} municípios
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="gap-2 text-[12px]"><FileText className="h-3.5 w-3.5" /> Gerar Relatório</Button>
          </div>
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

            <TabsContent value="scores">
              <ScoresTab
                concessionarias={concessionarias}
                detalheScore={detalheScore}
                distribStatus={distribStatus}
                scoreFocus={scoreFocus}
                setScoreFocus={setScoreFocus}
              />
            </TabsContent>

            <TabsContent value="ranking">
              <RankingTab
                filtered={filtered}
                filterUf={filterUf}
                setFilterUf={setFilterUf}
                loading={loadingScores}
              />
            </TabsContent>

            <TabsContent value="evolucao">
              <EvolucaoTab />
            </TabsContent>

            <TabsContent value="infracoes">
              <InfracoesTab
                loading={loadingInfracoes}
                totalInfracoes={totalInfracoes}
                infSearch={infSearch}
                setInfSearch={setInfSearch}
                infStatus={infStatus}
                setInfStatus={setInfStatus}
                infGravidade={infGravidade}
                setInfGravidade={setInfGravidade}
                infracoesFiltered={infracoesFiltered}
                onSelect={setSelectedInfracao}
              />
            </TabsContent>

            <TabsContent value="auditorias">
              <AuditoriasTab
                audStatus={audStatus}
                setAudStatus={setAudStatus}
                onSelect={setSelectedAud}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      <InfracaoDialog infracao={selectedInfracao} onClose={() => setSelectedInfracao(null)} />
      <AuditoriaDialog auditoria={selectedAud} onClose={() => setSelectedAud(null)} />
    </DashboardLayout>
  );
};

export default CompliancePage;
