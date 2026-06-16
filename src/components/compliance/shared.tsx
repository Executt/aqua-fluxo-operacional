import { CHART_GRID } from "@/lib/chart-colors";

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export const evolucaoMensal = [
  { mes: "Out", SP: 92, MG: 78, RJ: 65, BA: 58, PR: 88, PE: 55 },
  { mes: "Nov", SP: 93, MG: 80, RJ: 68, BA: 60, PR: 89, PE: 57 },
  { mes: "Dez", SP: 91, MG: 82, RJ: 70, BA: 62, PR: 88, PE: 58 },
  { mes: "Jan", SP: 94, MG: 83, RJ: 72, BA: 64, PR: 90, PE: 59 },
  { mes: "Fev", SP: 95, MG: 85, RJ: 74, BA: 66, PR: 91, PE: 61 },
  { mes: "Mar", SP: 96, MG: 87, RJ: 74, BA: 68, PR: 91, PE: 62 },
];

export const radarData = [
  { criterio: "Qualidade Agua", SABESP: 98, CEDAE: 72, COMPESA: 55 },
  { criterio: "Cobertura Esgoto", SABESP: 95, CEDAE: 68, COMPESA: 48 },
  { criterio: "Perdas Distrib.", SABESP: 92, CEDAE: 60, COMPESA: 52 },
  { criterio: "Atendimento Prazo", SABESP: 96, CEDAE: 80, COMPESA: 70 },
  { criterio: "Invest. Infra", SABESP: 94, CEDAE: 78, COMPESA: 65 },
  { criterio: "Relatorios Entregues", SABESP: 100, CEDAE: 85, COMPESA: 72 },
];

export const dimensoesScore = [
  { dimensao: "Cobertura", peso: 25, descricao: "Atendimento de água/esgoto" },
  { dimensao: "Qualidade", peso: 30, descricao: "Conformidade físico-química" },
  { dimensao: "Atendimento", peso: 20, descricao: "Prazos e SLA ao usuário" },
  { dimensao: "Financeira", peso: 25, descricao: "Sustentabilidade econômica" },
];

export const auditoriasMock = [
  { id: "AUD-2026-014", entidade: "SABESP", uf: "SP", tipo: "Programada", auditor: "ANA — DRU/SP", data: "2026-06-12", status: "agendada", escopo: "Qualidade da água — bacia Alto Tietê" },
  { id: "AUD-2026-013", entidade: "CEDAE", uf: "RJ", tipo: "Especial", auditor: "ANA — DRU/RJ", data: "2026-06-05", status: "em_andamento", escopo: "Investigação infrações INF-RJ-2026-0019" },
  { id: "AUD-2026-012", entidade: "COMPESA", uf: "PE", tipo: "Programada", auditor: "ANA — DRU/NE", data: "2026-05-28", status: "concluida", resultado: "nao_conforme", escopo: "Cobertura de esgoto RM Recife" },
  { id: "AUD-2026-011", entidade: "SANEPAR", uf: "PR", tipo: "Documental", auditor: "ANA — DRU/SUL", data: "2026-05-22", status: "concluida", resultado: "conforme", escopo: "Plano de investimentos 2025" },
  { id: "AUD-2026-010", entidade: "COPASA", uf: "MG", tipo: "In loco", auditor: "ANA — DRU/MG", data: "2026-05-15", status: "concluida", resultado: "parcial", escopo: "ETE Arrudas — eficiência DBO" },
  { id: "AUD-2026-009", entidade: "EMBASA", uf: "BA", tipo: "Programada", auditor: "ANA — DRU/NE", data: "2026-05-08", status: "concluida", resultado: "conforme", escopo: "Indicadores SARSB Q1/2026" },
];

export const statusColor: Record<string, string> = {
  conforme: "bg-success/15 text-success border-success/30",
  parcial: "bg-warning/15 text-warning border-warning/30",
  "nao-conforme": "bg-destructive/15 text-destructive border-destructive/30",
  nao_conforme: "bg-destructive/15 text-destructive border-destructive/30",
};
export const statusLabel: Record<string, string> = {
  conforme: "Conforme", parcial: "Parcial", "nao-conforme": "Não Conforme", nao_conforme: "Não Conforme",
};
export const gravidadeColor: Record<string, string> = {
  leve: "bg-muted text-muted-foreground border-border",
  media: "bg-warning/15 text-warning border-warning/30",
  grave: "bg-destructive/15 text-destructive border-destructive/30",
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  critica: "bg-destructive/20 text-destructive border-destructive/40",
};
export const infracaoStatusColor: Record<string, string> = {
  aberta: "bg-destructive/15 text-destructive border-destructive/30",
  em_analise: "bg-warning/15 text-warning border-warning/30",
  resolvida: "bg-success/15 text-success border-success/30",
};
export const auditoriaStatusColor: Record<string, string> = {
  agendada: "bg-primary/15 text-primary border-primary/30",
  em_andamento: "bg-warning/15 text-warning border-warning/30",
  concluida: "bg-success/15 text-success border-success/30",
};

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 elevation-2" style={{ borderColor: CHART_GRID }}>
      <p className="text-body-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-body-sm text-muted-foreground">
          <span style={{ color: p.color }}>●</span> {p.dataKey}: {p.value}%
        </p>
      ))}
    </div>
  );
};

export const getUf = (nome: string) => {
  const map: Record<string, string> = {
    SABESP: "SP", COPASA: "MG", CEDAE: "RJ", EMBASA: "BA",
    SANEPAR: "PR", COMPESA: "PE", CAGECE: "CE", COSANPA: "PA",
  };
  return map[nome] || "??";
};

export type Concessionaria = {
  id: string;
  nome: string;
  uf: string;
  score: number;
  status: string;
  tendencia: string;
  metas_cumpridas: number;
  metas_total: number;
  infracoes_abertas: number;
  entidades?: unknown;
};
