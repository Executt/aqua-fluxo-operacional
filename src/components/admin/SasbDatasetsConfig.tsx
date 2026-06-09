import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, Search, CheckCircle2, AlertCircle, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * SARSB — Sistema de Avaliação Regulatória do Saneamento Básico (ANA).
 * Esta tela cataloga datasets oficiais usados para avaliar o compliance
 * dos prestadores nos módulos de Compliance e Curadoria.
 */

type SasbDataset = {
  id: string;
  code: string;
  name: string;
  description: string;
  dimension: "Cobertura" | "Qualidade" | "Atendimento" | "Econômico-Financeiro";
  source_org: "ANA" | "SNIS" | "IBGE" | "MMA";
  endpoint: string;
  last_sync: string;
  status: "conectado" | "desatualizado" | "erro";
  records: number;
  enabled: boolean;
  used_in_score: boolean;
};

const STORAGE_KEY = "sigsan:sasb-datasets:v1";

const SEED: SasbDataset[] = [
  {
    id: "sarsb-cob-001",
    code: "SARSB.COB-01",
    name: "Cobertura de coleta de esgoto por município",
    description: "Indicador IN015/IN056 — SNIS. Base oficial usada na dimensão Cobertura (ANA NR 79/2022).",
    dimension: "Cobertura",
    source_org: "SNIS",
    endpoint: "https://app4.mdr.gov.br/serieHistorica/",
    last_sync: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    status: "conectado",
    records: 5570,
    enabled: true,
    used_in_score: true,
  },
  {
    id: "sarsb-qual-001",
    code: "SARSB.QUAL-01",
    name: "Eficiência de tratamento de efluentes (DBO)",
    description: "Eficiência DBO declarada por ETE conforme NR 79/2022 — faixas baixa/normal/alta.",
    dimension: "Qualidade",
    source_org: "ANA",
    endpoint: "rpc:fato_etes_curadoria",
    last_sync: new Date(Date.now() - 86_400_000).toISOString(),
    status: "conectado",
    records: 3284,
    enabled: true,
    used_in_score: true,
  },
  {
    id: "sarsb-qual-002",
    code: "SARSB.QUAL-02",
    name: "Conformidade de potabilidade (Portaria GM/MS 888/2021)",
    description: "Percentual de amostras conformes (cloro residual, turbidez, coliformes).",
    dimension: "Qualidade",
    source_org: "ANA",
    endpoint: "https://dados.ana.gov.br/dataset/qualidade-agua-distribuida",
    last_sync: new Date(Date.now() - 86_400_000 * 5).toISOString(),
    status: "desatualizado",
    records: 1842,
    enabled: true,
    used_in_score: true,
  },
  {
    id: "sarsb-atd-001",
    code: "SARSB.ATD-01",
    name: "Reclamações ANA/ARSESP — Ouvidoria",
    description: "Volume mensal de reclamações registradas e taxa de resolução em 30 dias.",
    dimension: "Atendimento",
    source_org: "ANA",
    endpoint: "https://dados.ana.gov.br/dataset/ouvidoria",
    last_sync: new Date(Date.now() - 86_400_000 * 7).toISOString(),
    status: "desatualizado",
    records: 12_540,
    enabled: true,
    used_in_score: false,
  },
  {
    id: "sarsb-eco-001",
    code: "SARSB.ECO-01",
    name: "Equilíbrio econômico-financeiro (SNIS-FN)",
    description: "Indicadores IN012/IN029/IN060 — sustentabilidade tarifária e endividamento.",
    dimension: "Econômico-Financeiro",
    source_org: "SNIS",
    endpoint: "https://app4.mdr.gov.br/serieHistorica/",
    last_sync: new Date(Date.now() - 86_400_000 * 3).toISOString(),
    status: "conectado",
    records: 5210,
    enabled: true,
    used_in_score: true,
  },
  {
    id: "sarsb-cob-002",
    code: "SARSB.COB-02",
    name: "População IBGE estimada (denominador)",
    description: "Estimativas populacionais municipais — denominador dos indicadores de cobertura.",
    dimension: "Cobertura",
    source_org: "IBGE",
    endpoint: "https://servicodados.ibge.gov.br/api/v3/agregados",
    last_sync: new Date(Date.now() - 86_400_000 * 14).toISOString(),
    status: "erro",
    records: 0,
    enabled: false,
    used_in_score: false,
  },
];

const load = (): SasbDataset[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    return JSON.parse(raw);
  } catch {
    return SEED;
  }
};
const save = (list: SasbDataset[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

const dimColor: Record<SasbDataset["dimension"], string> = {
  "Cobertura": "bg-blue-50 text-blue-700 border-blue-200",
  "Qualidade": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Atendimento": "bg-amber-50 text-amber-700 border-amber-200",
  "Econômico-Financeiro": "bg-violet-50 text-violet-700 border-violet-200",
};

const statusIcon = (s: SasbDataset["status"]) => {
  if (s === "conectado") return <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
  if (s === "desatualizado") return <RefreshCw className="h-3 w-3 text-amber-600" />;
  return <AlertCircle className="h-3 w-3 text-destructive" />;
};
const statusLabel: Record<SasbDataset["status"], string> = {
  conectado: "Conectado",
  desatualizado: "Desatualizado",
  erro: "Erro",
};

export function SasbDatasetsConfig() {
  const { toast } = useToast();
  const [items, setItems] = useState<SasbDataset[]>([]);
  const [search, setSearch] = useState("");
  const [dim, setDim] = useState<string>("all");

  useEffect(() => { setItems(load()); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (dim !== "all" && d.dimension !== dim) return false;
      if (!q) return true;
      return `${d.code} ${d.name} ${d.description} ${d.source_org}`.toLowerCase().includes(q);
    });
  }, [items, search, dim]);

  const dims = ["Cobertura", "Qualidade", "Atendimento", "Econômico-Financeiro"] as const;
  const dimCounts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((d) => { c[d.dimension] = (c[d.dimension] || 0) + 1; });
    return c;
  }, [items]);

  const enabledCount = items.filter((d) => d.enabled).length;
  const scoreCount = items.filter((d) => d.used_in_score).length;
  const totalRecords = items.reduce((s, d) => s + (d.enabled ? d.records : 0), 0);

  const update = (id: string, patch: Partial<SasbDataset>) => {
    const list = items.map((d) => d.id === id ? { ...d, ...patch } : d);
    setItems(list); save(list);
  };

  const sync = (id: string) => {
    update(id, { status: "conectado", last_sync: new Date().toISOString() });
    toast({ title: "Sincronização concluída", description: "Dataset atualizado." });
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader>
        <CardTitle className="text-heading-2 flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" /> Base SARSB — Avaliação de compliance
        </CardTitle>
        <CardDescription className="text-body-sm">
          Sistema de Avaliação Regulatória do Saneamento Básico (ANA NR 79/2022).
          Datasets oficiais consumidos pelo módulo de Compliance para calcular score por dimensão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Datasets" value={items.length} hint="catalogados" />
          <Kpi label="Ativos" value={enabledCount} hint={`${scoreCount} no score`} tone="primary" />
          <Kpi label="Registros" value={totalRecords.toLocaleString("pt-BR")} hint="linhas integradas" />
          <Kpi
            label="Dimensões"
            value={dims.length}
            hint="SARSB NR 79/2022"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-9 pl-8 text-[12px]" placeholder="Buscar dataset, código ou fonte..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setDim("all")}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${
                dim === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
              }`}>
              Todas ({items.length})
            </button>
            {dims.map((d) => (
              <button key={d} onClick={() => setDim(d)}
                className={`text-[11px] px-2.5 py-1 rounded-full border ${
                  dim === d ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
                }`}>
                {d} ({dimCounts[d] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.map((d) => (
            <div key={d.id} className="rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${dimColor[d.dimension]}`}>
                      {d.dimension}
                    </Badge>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">{d.code}</span>
                    <Badge variant="outline" className="text-[10px]">{d.source_org}</Badge>
                    {d.used_in_score && (
                      <Badge variant="outline" className="text-[10px] bg-primary-soft text-primary border-primary/20">
                        usado no score
                      </Badge>
                    )}
                    <span className="text-[10px] inline-flex items-center gap-1 text-muted-foreground">
                      {statusIcon(d.status)} {statusLabel[d.status]}
                    </span>
                  </div>
                  <h3 className="font-medium text-[13px] leading-snug">{d.name}</h3>
                  <p className="text-caption text-muted-foreground mt-0.5 line-clamp-1">{d.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[260px]">{d.endpoint}</span>
                    </span>
                    <span>{d.records.toLocaleString("pt-BR")} registros</span>
                    <span>Última sinc.: {fmtDate(d.last_sync)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground">Ativo</Label>
                    <Switch
                      checked={d.enabled}
                      onCheckedChange={(v) => update(d.id, { enabled: v })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground">No score</Label>
                    <Switch
                      checked={d.used_in_score}
                      disabled={!d.enabled}
                      onCheckedChange={(v) => update(d.id, { used_in_score: v })}
                      className="scale-75"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={() => sync(d.id)}>
                    <RefreshCw className="h-3 w-3" /> Sincronizar
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-body-sm text-muted-foreground py-6 text-center">Nenhum dataset encontrado.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label, value, hint, tone,
}: { label: string; value: string | number; hint?: string; tone?: "primary" }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "primary" ? "bg-primary-soft border-primary/20" : "border-border bg-card"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${tone === "primary" ? "text-primary" : "text-foreground"}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
