import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from "recharts";
import {
  Radio, Wifi, WifiOff, Activity, Thermometer, Droplets, AlertTriangle,
  CheckCircle2, Clock, RefreshCw, Gauge, Zap,
} from "lucide-react";
import { CHART_COLORS, CHART_GRID, CHART_TICK } from "@/lib/chart-colors";
import { useSensores } from "@/hooks/use-sigsan-data";
import { Skeleton } from "@/components/ui/skeleton";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const sensorTimeSeries = Array.from({ length: 24 }, (_, i) => ({
  hora: `${String(i).padStart(2, "0")}:00`,
  ph: +(6.5 + Math.random() * 2.5).toFixed(1),
  turbidez: +(8 + Math.random() * 35).toFixed(1),
  dbo: +(15 + Math.random() * 50).toFixed(1),
  cloro: +(0.1 + Math.random() * 0.8).toFixed(2),
  temperatura: +(20 + Math.random() * 12).toFixed(1),
}));

const statusColor: Record<string, string> = {
  normal: "bg-success/15 text-success border-success/30",
  critico: "bg-destructive/15 text-destructive border-destructive/30",
  alerta: "bg-warning/15 text-warning border-warning/30",
  offline: "bg-muted text-muted-foreground border-border",
};

const sinalIcon = (s: string) => {
  if (s === "offline") return <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />;
  if (s === "fraco") return <Wifi className="h-3.5 w-3.5 text-destructive" />;
  if (s === "medio") return <Wifi className="h-3.5 w-3.5 text-warning" />;
  return <Wifi className="h-3.5 w-3.5 text-success" />;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 elevation-2">
      <p className="text-body-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-body-sm text-muted-foreground">
          <span style={{ color: p.color }}>●</span> {p.dataKey}: {p.value}
        </p>
      ))}
    </div>
  );
};

const IoTMonitor = () => {
  const { data: sensores, isLoading } = useSensores();
  const [selectedEte, setSelectedEte] = useState("all");
  const [selectedParam, setSelectedParam] = useState("turbidez");

  const sensorList = sensores || [];
  const totalSensores = sensorList.length;
  const online = sensorList.filter((s) => s.status !== "offline").length;
  const criticos = sensorList.filter((s) => s.status === "critico").length;
  const normais = sensorList.filter((s) => s.status === "normal").length;

  const filteredSensores = selectedEte === "all"
    ? sensorList
    : sensorList.filter((s) => (s.etes as any)?.nome === selectedEte);

  const uniqueEtes = [...new Set(sensorList.map((s) => (s.etes as any)?.nome).filter(Boolean))];

  const kpis = [
    { title: "Sensores Online", value: `${online}/${totalSensores}`, icon: Wifi, color: "text-success" },
    { title: "Leituras Críticas", value: String(criticos), icon: AlertTriangle, color: "text-destructive", pulse: true },
    { title: "Status Normal", value: String(normais), icon: CheckCircle2, color: "text-success" },
    { title: "Latência Média", value: "340ms", icon: Zap, color: "text-primary" },
  ];

  const formatUltimaLeitura = (date: string | null) => {
    if (!date) return "—";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Há ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `Há ${hours}h`;
  };

  return (
    <DashboardLayout>
      <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1 text-foreground">Monitorização IoT</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Dados de sensores em tempo real — Atualização a cada 30 segundos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1.5 animate-pulse text-[11px]">
              <Radio className="h-3 w-3" /> TEMPO REAL
            </Badge>
            <Button variant="outline" size="sm" className="gap-2 text-[12px]">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </Button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.06 }}>
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-body-sm text-muted-foreground font-medium">{kpi.title}</span>
                    <kpi.icon className={`h-4 w-4 ${kpi.color} ${kpi.pulse ? "animate-pulse" : ""}`} />
                  </div>
                  <div className={`text-[28px] font-semibold ${kpi.color} font-mono leading-none`}>
                    {isLoading ? <Skeleton className="h-8 w-16" /> : kpi.value}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeUp}>
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="dashboard" className="gap-2 text-[12px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Activity className="h-4 w-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="sensores" className="gap-2 text-[12px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Gauge className="h-4 w-4" /> Sensores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="flex items-center gap-4">
                <Select value={selectedEte} onValueChange={setSelectedEte}>
                  <SelectTrigger className="w-60 bg-card border-border text-[12px]"><SelectValue placeholder="Filtrar por ETE" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ETEs</SelectItem>
                    {uniqueEtes.map((ete) => (
                      <SelectItem key={ete} value={ete}>{ete}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedParam} onValueChange={setSelectedParam}>
                  <SelectTrigger className="w-48 bg-card border-border text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ph">pH</SelectItem>
                    <SelectItem value="turbidez">Turbidez (NTU)</SelectItem>
                    <SelectItem value="dbo">DBO (mg/L)</SelectItem>
                    <SelectItem value="cloro">Cloro Residual (mg/L)</SelectItem>
                    <SelectItem value="temperatura">Temperatura (°C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Série Temporal — {selectedParam.charAt(0).toUpperCase() + selectedParam.slice(1)}
                    </CardTitle>
                    <CardDescription className="text-body-sm">Últimas 24 horas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={sensorTimeSeries}>
                        <defs>
                          <linearGradient id="gradParam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis dataKey="hora" tick={{ fontSize: 10, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey={selectedParam} stroke={CHART_COLORS.primary} fill="url(#gradParam)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-primary" /> Comparativo Multi-Parâmetro
                    </CardTitle>
                    <CardDescription className="text-body-sm">pH, Turbidez e Temperatura (24h)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={sensorTimeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                        <XAxis dataKey="hora" tick={{ fontSize: 10, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="ph" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="turbidez" stroke={CHART_COLORS.warning} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="temperatura" stroke={CHART_COLORS.destructive} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sensores">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" /> Estado dos Sensores
                    <Badge variant="outline" className="ml-2 text-[10px] border-success/30 text-success font-mono">
                      {online} ONLINE
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">ID Sensor</TableHead>
                        <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">ETE</TableHead>
                        <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Parâmetro</TableHead>
                        <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Limite</TableHead>
                        <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Sinal</TableHead>
                        <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Bateria</TableHead>
                        <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Última Leitura</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i} className="border-border">
                            {Array.from({ length: 8 }).map((_, j) => (
                              <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        filteredSensores.map((s) => (
                          <TableRow key={s.id} className="border-border hover:bg-accent/50">
                            <TableCell className="font-mono text-body-sm text-primary">{s.codigo}</TableCell>
                            <TableCell className="text-body-sm">
                              <div>
                                <p className="font-medium text-foreground">{(s.etes as any)?.nome || "—"}</p>
                                <p className="text-muted-foreground text-caption">{(s.etes as any)?.cidade}, {(s.etes as any)?.uf}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-body-sm">{s.tipo}</TableCell>
                            <TableCell className="font-mono text-body-sm text-muted-foreground">{s.limite_legal}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${statusColor[s.status] || ""}`}>
                                {s.status === "normal" ? "Normal" : s.status === "critico" ? "Crítico" : s.status === "alerta" ? "Alerta" : "Offline"}
                              </Badge>
                            </TableCell>
                            <TableCell>{sinalIcon(s.sinal)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-8 rounded-full overflow-hidden bg-muted">
                                  <div
                                    className={`h-full rounded-full ${s.bateria > 50 ? "bg-success" : s.bateria > 20 ? "bg-warning" : "bg-destructive"}`}
                                    style={{ width: `${s.bateria}%` }}
                                  />
                                </div>
                                <span className="text-caption font-mono text-muted-foreground">{s.bateria}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-body-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatUltimaLeitura(s.ultima_leitura)}
                              </div>
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

export default IoTMonitor;
