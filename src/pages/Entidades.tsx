import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Building2, Key, Plus, Globe, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEntidades } from "@/hooks/use-sigsan-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

// Validação: CNPJ formato livre 14 dígitos (com ou sem máscara), nome 3-120 chars
const entidadeSchema = z.object({
  nome: z.string().trim().min(3, "Nome muito curto").max(120, "Nome muito longo"),
  cnpj: z.string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 14, "CNPJ deve ter 14 dígitos"),
  area: z.string().min(1, "Selecione a área de atuação"),
});

const Entidades = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: entidades, isLoading } = useEntidades();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = entidadeSchema.safeParse({ nome, cnpj, area });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast({ title: "Dados inválidos", description: first.message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("entidades").insert({
      nome: parsed.data.nome,
      cnpj: parsed.data.cnpj,
      area_atuacao: parsed.data.area,
      status: "Pendente",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao registar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Concessionária registada", description: `${parsed.data.nome} foi adicionada com sucesso.` });
    setNome(""); setCnpj(""); setArea("");
    queryClient.invalidateQueries({ queryKey: ["entidades"] });
  };

  return (
    <DashboardLayout>
      <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1 text-foreground">Gestão de Entidades</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Registo de concessionárias e configuração de integração
            </p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Tabs defaultValue="entidades" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="entidades" className="gap-2 text-[12px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Building2 className="h-4 w-4" /> Concessionárias
              </TabsTrigger>
              <TabsTrigger value="apikeys" className="gap-2 text-[12px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Key className="h-4 w-4" /> Chaves de Integração
              </TabsTrigger>
            </TabsList>

            <TabsContent value="entidades" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-2 bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" /> Registar Nova Concessionária
                    </CardTitle>
                    <CardDescription className="text-body-sm">
                      Preencha os dados da entidade para registo no sistema federal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome" className="text-body-sm">Nome da Concessionária</Label>
                        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: CEDAE" maxLength={120} className="bg-secondary border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnpj" className="text-body-sm">CNPJ</Label>
                        <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" maxLength={18} className="bg-secondary border-border font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="area" className="text-body-sm">Área de Atuação</Label>
                        <Select value={area} onValueChange={setArea}>
                          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione o estado / região" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="São Paulo, SP">São Paulo, SP</SelectItem>
                            <SelectItem value="Rio de Janeiro, RJ">Rio de Janeiro, RJ</SelectItem>
                            <SelectItem value="Minas Gerais, MG">Minas Gerais, MG</SelectItem>
                            <SelectItem value="Bahia, BA">Bahia, BA</SelectItem>
                            <SelectItem value="Paraná, PR">Paraná, PR</SelectItem>
                            <SelectItem value="Pernambuco, PE">Pernambuco, PE</SelectItem>
                            <SelectItem value="Ceará, CE">Ceará, CE</SelectItem>
                            <SelectItem value="Amazonas, AM">Amazonas, AM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full gap-2" disabled={saving}>
                        <Building2 className="h-4 w-4" /> {saving ? "A registar..." : "Registar Entidade"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3 bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" /> Concessionárias Registadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Nome</TableHead>
                          <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">CNPJ</TableHead>
                          <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Área</TableHead>
                          <TableHead className="text-caption text-muted-foreground uppercase tracking-wider">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i} className="border-border">
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          entidades?.map((e) => (
                            <TableRow key={e.id} className="border-border hover:bg-accent/50">
                              <TableCell className="text-[13px] font-medium text-foreground">{e.nome}</TableCell>
                              <TableCell className="font-mono text-body-sm text-muted-foreground">{e.cnpj}</TableCell>
                              <TableCell className="text-body-sm">{e.area_atuacao}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${e.status === "Ativa" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"}`}>
                                  {e.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="apikeys" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" /> Chaves de Integração (API Keys)
                  </CardTitle>
                  <CardDescription className="text-body-sm mt-1">
                    Gestão de tokens de acesso à API do SIGSAN-FED.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-warning/30 bg-warning/10 p-4 flex gap-3">
                    <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="text-[13px] space-y-1">
                      <p className="font-medium text-foreground">Módulo em preparação</p>
                      <p className="text-muted-foreground">
                        A emissão e revogação de chaves de API exige backend dedicado com hashing
                        (SHA-256), exibição única no momento da criação, rotação programada e trilha
                        de auditoria. Esta funcionalidade será disponibilizada após a aprovação do
                        modelo de segurança pela equipa de governança.
                      </p>
                      <p className="text-muted-foreground">
                        Até lá, integrações devem usar as credenciais de serviço fornecidas pela
                        equipa de plataforma.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Entidades;
