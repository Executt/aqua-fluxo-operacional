import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { BrazilMap } from "@/components/dashboard/BrazilMap";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { AlertsTable } from "@/components/dashboard/AlertsTable";
import { MetabaseRefreshPanel } from "@/components/dashboard/MetabaseRefreshPanel";
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const Index = () => {
  return (
    <DashboardLayout>
      <motion.div
        className="p-6 space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1 text-foreground">
              Centro de Operações Federado
            </h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Monitorização em tempo real — Última atualização: há 2 min
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-[12px] border-border">
              Hoje <ChevronDown className="h-3 w-3" />
            </Button>
            <Button size="sm" className="gap-2 text-[12px]">
              <FileText className="h-3.5 w-3.5" />
              Gerar Relatório
            </Button>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div variants={fadeUp}>
          <KpiCards />
        </motion.div>

        {/* Map + Chart */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <BrazilMap />
          </div>
          <div className="lg:col-span-2">
            <ComplianceChart />
          </div>
        </motion.div>

        {/* Metabase refresh status */}
        <motion.div variants={fadeUp}>
          <MetabaseRefreshPanel />
        </motion.div>

        {/* Alerts Table */}
        <motion.div variants={fadeUp}>
          <AlertsTable />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
