import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { motion } from "framer-motion";
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
import { Building2, Key, Plus, Copy, Globe, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEntidades } from "@/hooks/use-sigsan-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiKey {
  id: string; name: string; key: string; created: string; lastUsed: string; status: "active" | "revoked";
}

const mockApiKeys: ApiKey[] = [
  { id: "1", name: "Produção — CEDAE", key: "sk_live_4f8a2c9d7e1b3f6a8c0d2e4f6a8b0c2d", created: "2026-01-15", lastUsed: "Há 2 horas", status: "active" },
  { id: "2", name: "Staging — CEDAE", key: "sk_test_9b7c5d3e1f0a8b6c4d2e0f8a6b4c2d0e", created: "2026-02-20", lastUsed: "Há 5 dias", status: "active" },
  { id: "3", name: "Integração Legacy", key: "sk_live_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d", created: "2025-11-03", lastUsed: "Há 30 dias", status: "revoked" },
];

const maskKey = (key: string) => key.slice(0, 8) + "••••••••••••••••" + key.slice(-4);

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const Entidades = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: entidades, isLoading } = useEntidades();
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Chave copiada", description: "A API key foi copiada para a área de transferência." });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cnpj || !area) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("entidades").insert({ nome, cnpj, area_atuacao: area, status: "Pendente" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao registar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Concessionária registada", description: `${nome} foi adicionada com sucesso.` });
    setNome(""); setCnpj(""); setArea("");
    queryClient.invalidateQueries({ queryKey: ["entidades"] });
  };

  return (
    <DashboardLayout>
      <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestão de Entidades</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registo de concessionárias, gestão de API keys e configuração de integração
            </p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Tabs defaultValue="entidades" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="entidades" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Building2 className="h-4 w-4" /> Concessionárias
              </TabsTrigger>
              <TabsTrigger value="apikeys" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Key className="h-4 w-4" /> Chaves de Integração
              </TabsTrigger>
            </TabsList>

            <TabsContent value="entidades" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-2 bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" /> Registar Nova Concessionária
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Preencha os dados da entidade para registo no sistema federal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome" className="text-xs">Nome da Concessionária</Label>
                        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: CEDAE" className="bg-background border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnpj" className="text-xs">CNPJ</Label>
                        <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="bg-background border-border font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="area" className="text-xs">Área de Atuação</Label>
                        <Select value={area} onValueChange={setArea}>
                          <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Selecione o estado / região" /></SelectTrigger>
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
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" /> Concessionárias Registadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Nome</TableHead>
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">CNPJ</TableHead>
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Área</TableHead>
                          <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</TableHead>
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
                            <TableRow key={e.id} className="border-border">
                              <TableCell className="text-sm font-medium">{e.nome}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{e.cnpj}</TableCell>
                              <TableCell className="text-xs">{e.area_atuacao}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={e.status === "Ativa" ? "bg-success/15 text-success border-success/30" : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"}>
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
              <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" /> Chaves de Integração (API Keys)
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Gerencie os tokens de acesso à API do SIGSAN-FED.
                      </CardDescription>
                    </div>
                    <Button className="gap-2"><Plus className="h-4 w-4" /> Gerar Novo Token</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Nome</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Chave</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Criada em</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Último Uso</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockApiKeys.map((apiKey) => (
                        <TableRow key={apiKey.id} className="border-border">
                          <TableCell className="text-sm font-medium">{apiKey.name}</TableCell>
                          <TableCell>
                            <code className="text-xs font-mono bg-background/50 px-2 py-1 rounded border border-border">
                              {revealedKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                            </code>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{apiKey.created}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{apiKey.lastUsed}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={apiKey.status === "active" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
                              {apiKey.status === "active" ? "Ativa" : "Revogada"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleReveal(apiKey.id)}>
                                {revealedKeys.has(apiKey.id) ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyKey(apiKey.key)}>
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              {apiKey.status === "active" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive/70" /></Button>
                              )}
                            </div>
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
    </DashboardLayout>
  );
};

export default Entidades;
