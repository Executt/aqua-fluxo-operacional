import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { BrazilMap } from "@/components/dashboard/BrazilMap";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { AlertsTable } from "@/components/dashboard/AlertsTable";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { motion } from "framer-motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
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
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Centro de Operações Federado
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitorização em tempo real — Última atualização: há 2 min
            </p>
          </div>
          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            Gerar Relatório
          </Button>
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

        {/* Alerts Table */}
        <motion.div variants={fadeUp}>
          <AlertsTable />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
