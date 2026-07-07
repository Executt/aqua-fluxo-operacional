import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2, Key, Plus, Globe, ShieldAlert, Copy, Trash2, Factory, Webhook, Save, Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEntidades, useEtes } from "@/hooks/use-sigsan-data";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const entidadeSchema = z.object({
  nome: z.string().trim().min(3, "Nome muito curto").max(120),
  cnpj: z.string().trim().transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 14, "CNPJ deve ter 14 dígitos"),
  area: z.string().min(1, "Selecione a área de atuação"),
});

const SCOPE_OPTIONS = [
  { value: "read", label: "Leitura" },
  { value: "write", label: "Escrita" },
  { value: "ingest", label: "Ingestão IoT" },
  { value: "compliance", label: "Compliance" },
];

const TAB_TO_QUERY: Record<string, string | null> = {
  lista: null,
  novo: "novo",
  etes: "etes",
  chaves: "chaves",
  integracao: "integracao",
};

const QUERY_TO_TAB: Record<string, string> = {
  novo: "novo", etes: "etes", chaves: "chaves", integracao: "integracao",
};

const Entidades = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: entidades, isLoading } = useEntidades();
  const { data: etes, isLoading: etesLoading } = useEtes();

  const currentTab = QUERY_TO_TAB[searchParams.get("tab") ?? ""] ?? "lista";
  const setTab = (t: string) => {
    const q = TAB_TO_QUERY[t];
    const next = new URLSearchParams(searchParams);
    if (q) next.set("tab", q); else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  // ---------- Cadastro ----------
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = entidadeSchema.safeParse({ nome, cnpj, area });
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("entidades").insert({
      nome: parsed.data.nome, cnpj: parsed.data.cnpj,
      area_atuacao: parsed.data.area, status: "Pendente",
    });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Concessionária registada", description: parsed.data.nome });
    setNome(""); setCnpj(""); setArea("");
    queryClient.invalidateQueries({ queryKey: ["entidades"] });
    setTab("lista");
  };

  const toggleStatus = async (id: string, statusAtual: string) => {
    const novo = statusAtual === "Ativa" ? "Inativa" : "Ativa";
    const { error } = await supabase.from("entidades").update({ status: novo }).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ["entidades"] });
    toast({ title: `Entidade ${novo.toLowerCase()}` });
  };

  // ---------- API Keys ----------
  const [selectedEntidade, setSelectedEntidade] = useState<string>("");
  useEffect(() => {
    if (!selectedEntidade && entidades?.[0]) setSelectedEntidade(entidades[0].id);
  }, [entidades, selectedEntidade]);

  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ["entidade_api_keys", selectedEntidade],
    enabled: !!selectedEntidade,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entidade_api_keys" as any)
        .select("*")
        .eq("entidade_id", selectedEntidade)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
  const [newKeyExpires, setNewKeyExpires] = useState<string>("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const createKey = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("entidade-api-keys", {
        body: {
          action: "create",
          entidade_id: selectedEntidade,
          nome: newKeyName,
          scopes: newKeyScopes,
          expires_at: newKeyExpires || null,
        },
      });
      if (error) throw error;
      return data as { secret: string };
    },
    onSuccess: (data) => {
      setRevealedKey(data.secret);
      setNewKeyName(""); setNewKeyScopes(["read"]); setNewKeyExpires("");
      queryClient.invalidateQueries({ queryKey: ["entidade_api_keys", selectedEntidade] });
    },
    onError: (e: any) => toast({ title: "Erro ao gerar chave", description: e.message, variant: "destructive" }),
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("entidade-api-keys", {
        body: { action: "revoke", id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entidade_api_keys", selectedEntidade] });
      toast({ title: "Chave revogada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const copyKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    toast({ title: "Copiado para a área de transferência" });
  };

  // ---------- Integração ----------
  const { data: integracao } = useQuery({
    queryKey: ["entidade_integracao_config", selectedEntidade],
    enabled: !!selectedEntidade,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entidade_integracao_config" as any)
        .select("*")
        .eq("entidade_id", selectedEntidade)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecretName, setWebhookSecretName] = useState("");
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);
  const [contatos, setContatos] = useState("");

  useEffect(() => {
    setWebhookUrl(integracao?.webhook_url ?? "");
    setWebhookSecretName(integracao?.webhook_secret_name ?? "");
    setNotificacoesAtivas(integracao?.notificacoes_ativas ?? true);
    setContatos((integracao?.contatos ?? []).map((c: any) => c.email ?? c).join(", "));
  }, [integracao]);

  const saveIntegracao = useMutation({
    mutationFn: async () => {
      const contatosArr = contatos.split(",").map((s) => s.trim()).filter(Boolean).map((email) => ({ email }));
      const payload = {
        entidade_id: selectedEntidade,
        webhook_url: webhookUrl || null,
        webhook_secret_name: webhookSecretName || null,
        notificacoes_ativas: notificacoesAtivas,
        contatos: contatosArr,
        atualizado_por: user?.id ?? null,
      };
      const { error } = await supabase
        .from("entidade_integracao_config" as any)
        .upsert(payload, { onConflict: "entidade_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entidade_integracao_config", selectedEntidade] });
      toast({ title: "Configuração salva" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const etesDaEntidade = useMemo(
    () => (etes ?? []).filter((e: any) => e.entidade_id === selectedEntidade),
    [etes, selectedEntidade],
  );

  return (
    <DashboardLayout>
      <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1 text-foreground">Gestão de Entidades</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Registo de concessionárias, ETEs e configuração de integração
            </p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Tabs value={currentTab} onValueChange={setTab} className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="lista" className="gap-2 text-[12px]"><Building2 className="h-4 w-4" /> Concessionárias</TabsTrigger>
              <TabsTrigger value="novo" className="gap-2 text-[12px]"><Plus className="h-4 w-4" /> Cadastro</TabsTrigger>
              <TabsTrigger value="etes" className="gap-2 text-[12px]"><Factory className="h-4 w-4" /> ETEs</TabsTrigger>
              <TabsTrigger value="chaves" className="gap-2 text-[12px]"><Key className="h-4 w-4" /> Chaves de Integração</TabsTrigger>
              <TabsTrigger value="integracao" className="gap-2 text-[12px]"><Webhook className="h-4 w-4" /> Integração</TabsTrigger>
            </TabsList>

            {/* ============ LISTA ============ */}
            <TabsContent value="lista">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Concessionárias Registadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-caption uppercase">Nome</TableHead>
                        <TableHead className="text-caption uppercase">CNPJ</TableHead>
                        <TableHead className="text-caption uppercase">Área</TableHead>
                        <TableHead className="text-caption uppercase">Status</TableHead>
                        <TableHead className="text-caption uppercase text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                      )) : entidades?.map((e: any) => (
                        <TableRow key={e.id} className="border-border hover:bg-accent/50">
                          <TableCell className="text-[13px] font-medium">{e.nome}</TableCell>
                          <TableCell className="font-mono text-body-sm text-muted-foreground">{e.cnpj}</TableCell>
                          <TableCell className="text-body-sm">{e.area_atuacao}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${
                              e.status === "Ativa" ? "bg-success/15 text-success border-success/30"
                              : e.status === "Inativa" ? "bg-muted text-muted-foreground border-border"
                              : "bg-warning/15 text-warning border-warning/30"}`}>{e.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedEntidade(e.id); setTab("chaves"); }}>
                              <Key className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleStatus(e.id, e.status)}>
                              {e.status === "Ativa" ? "Inativar" : "Ativar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============ CADASTRO ============ */}
            <TabsContent value="novo">
              <Card className="bg-card border-border max-w-2xl">
                <CardHeader>
                  <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" /> Registar Nova Concessionária
                  </CardTitle>
                  <CardDescription className="text-body-sm">Dados básicos da entidade.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-body-sm">Nome da Concessionária</Label>
                      <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: CEDAE" maxLength={120} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-body-sm">CNPJ</Label>
                      <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" maxLength={18} className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-body-sm">Área de Atuação</Label>
                      <Select value={area} onValueChange={setArea}>
                        <SelectTrigger><SelectValue placeholder="Selecione o estado / região" /></SelectTrigger>
                        <SelectContent>
                          {["São Paulo, SP","Rio de Janeiro, RJ","Minas Gerais, MG","Bahia, BA","Paraná, PR","Pernambuco, PE","Ceará, CE","Amazonas, AM"].map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={saving}>
                      <Building2 className="h-4 w-4" /> {saving ? "A registar..." : "Registar Entidade"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============ ETEs ============ */}
            <TabsContent value="etes">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                    <Factory className="h-4 w-4 text-primary" /> Estações de Tratamento de Efluentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-caption uppercase">Código</TableHead>
                        <TableHead className="text-caption uppercase">Nome</TableHead>
                        <TableHead className="text-caption uppercase">Município / UF</TableHead>
                        <TableHead className="text-caption uppercase">Concessionária</TableHead>
                        <TableHead className="text-caption uppercase">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {etesLoading ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                      )) : etes?.length ? etes.map((e: any) => (
                        <TableRow key={e.id} className="border-border hover:bg-accent/50">
                          <TableCell className="font-mono text-body-sm">{e.codigo}</TableCell>
                          <TableCell className="text-[13px] font-medium">{e.nome}</TableCell>
                          <TableCell className="text-body-sm">{e.cidade} / {e.uf}</TableCell>
                          <TableCell className="text-body-sm">{e.entidades?.nome ?? "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{e.status ?? "—"}</Badge></TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-body-sm">Nenhuma ETE registada.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============ CHAVES DE INTEGRAÇÃO ============ */}
            <TabsContent value="chaves" className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
                  <div>
                    <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" /> Chaves de API por Entidade
                    </CardTitle>
                    <CardDescription className="text-body-sm mt-1">
                      Tokens com hash SHA-256, exibição única, escopos e revogação. Admin/gestor apenas.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={selectedEntidade} onValueChange={setSelectedEntidade}>
                      <SelectTrigger className="w-64"><SelectValue placeholder="Selecionar entidade" /></SelectTrigger>
                      <SelectContent>
                        {entidades?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => { setRevealedKey(null); setKeyDialogOpen(true); }} disabled={!selectedEntidade}>
                      <Plus className="h-4 w-4 mr-1" /> Nova chave
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-caption uppercase">Nome</TableHead>
                        <TableHead className="text-caption uppercase">Prefixo</TableHead>
                        <TableHead className="text-caption uppercase">Escopos</TableHead>
                        <TableHead className="text-caption uppercase">Criada</TableHead>
                        <TableHead className="text-caption uppercase">Expira</TableHead>
                        <TableHead className="text-caption uppercase">Status</TableHead>
                        <TableHead className="text-caption uppercase text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keysLoading ? (
                        <TableRow><TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                      ) : apiKeys?.length ? apiKeys.map((k) => {
                        const expirada = k.expires_at && new Date(k.expires_at) < new Date();
                        const status = k.revoked_at ? "Revogada" : expirada ? "Expirada" : "Ativa";
                        return (
                          <TableRow key={k.id} className="border-border hover:bg-accent/50">
                            <TableCell className="text-[13px] font-medium">{k.nome}</TableCell>
                            <TableCell className="font-mono text-body-sm text-muted-foreground">{k.key_prefix}…</TableCell>
                            <TableCell className="text-body-sm">{k.scopes?.join(", ")}</TableCell>
                            <TableCell className="text-body-sm">{new Date(k.created_at).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-body-sm">{k.expires_at ? new Date(k.expires_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${
                                status === "Ativa" ? "bg-success/15 text-success border-success/30" :
                                status === "Expirada" ? "bg-warning/15 text-warning border-warning/30" :
                                "bg-muted text-muted-foreground border-border"}`}>{status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {!k.revoked_at && (
                                <Button size="sm" variant="ghost" onClick={() => revokeKey.mutate(k.id)} disabled={revokeKey.isPending}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-body-sm">Nenhuma chave para esta entidade.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="rounded-md border border-border/60 bg-muted/30 p-3 flex gap-2 text-body-sm text-muted-foreground">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
                <span>As chaves são armazenadas apenas em hash SHA-256 no servidor. O valor completo é exibido uma única vez, no ato da criação.</span>
              </div>
            </TabsContent>

            {/* ============ INTEGRAÇÃO ============ */}
            <TabsContent value="integracao">
              <Card className="bg-card border-border max-w-3xl">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                      <Webhook className="h-4 w-4 text-primary" /> Configuração de Integração
                    </CardTitle>
                    <CardDescription className="text-body-sm mt-1">Webhook e contatos para notificações automáticas por entidade.</CardDescription>
                  </div>
                  <Select value={selectedEntidade} onValueChange={setSelectedEntidade}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Selecionar entidade" /></SelectTrigger>
                    <SelectContent>
                      {entidades?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-body-sm">Webhook URL (HTTPS)</Label>
                    <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://api.concessionaria.br/hooks/sigsan" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-body-sm">Nome do secret HMAC</Label>
                    <Input value={webhookSecretName} onChange={(e) => setWebhookSecretName(e.target.value)} placeholder="WEBHOOK_SECRET_ENTIDADE_X" className="font-mono" />
                    <p className="text-caption text-muted-foreground">O segredo em si é gerido no Vault. Aqui apenas o nome da variável usada para assinar HMAC-SHA256.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-body-sm">Contatos (e-mails separados por vírgula)</Label>
                    <Textarea value={contatos} onChange={(e) => setContatos(e.target.value)} placeholder="ops@exemplo.br, compliance@exemplo.br" rows={2} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="text-[13px] font-medium">Notificações automáticas</p>
                      <p className="text-caption text-muted-foreground">Envia alertas de compliance, infrações e escalonamentos.</p>
                    </div>
                    <Switch checked={notificacoesAtivas} onCheckedChange={setNotificacoesAtivas} />
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-body-sm text-muted-foreground">
                    ETEs vinculadas a esta entidade: <span className="font-medium text-foreground">{etesDaEntidade.length}</span>
                  </div>
                  <Button onClick={() => saveIntegracao.mutate()} disabled={saveIntegracao.isPending || !selectedEntidade} className="gap-2">
                    <Save className="h-4 w-4" /> {saveIntegracao.isPending ? "A guardar..." : "Guardar configuração"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* ==== Dialog: nova chave ==== */}
      <Dialog open={keyDialogOpen} onOpenChange={(o) => { setKeyDialogOpen(o); if (!o) setRevealedKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{revealedKey ? "Chave criada" : "Nova chave de API"}</DialogTitle>
            <DialogDescription>
              {revealedKey ? "Guarde este valor com segurança. Ele não será mostrado novamente." : "Defina nome, escopos e validade da chave."}
            </DialogDescription>
          </DialogHeader>

          {revealedKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md bg-muted p-3 border border-border">
                <code className="text-body-sm font-mono break-all flex-1">{revealedKey}</code>
                <Button size="sm" variant="ghost" onClick={copyKey}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-center gap-2 text-body-sm text-success">
                <Check className="h-4 w-4" /> Registada como hash SHA-256 no servidor.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-body-sm">Nome (identificação)</Label>
                <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Ex: Integração IoT prod" maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label className="text-body-sm">Escopos</Label>
                <div className="flex flex-wrap gap-2">
                  {SCOPE_OPTIONS.map((s) => {
                    const active = newKeyScopes.includes(s.value);
                    return (
                      <button key={s.value} type="button"
                        onClick={() => setNewKeyScopes((prev) => active ? prev.filter((x) => x !== s.value) : [...prev, s.value])}
                        className={`text-[12px] px-3 py-1 rounded-full border transition ${
                          active ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-muted-foreground border-border"
                        }`}>{s.label}</button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-body-sm">Expira em (opcional)</Label>
                <Input type="date" value={newKeyExpires} onChange={(e) => setNewKeyExpires(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter>
            {revealedKey ? (
              <Button onClick={() => { setKeyDialogOpen(false); setRevealedKey(null); }}>Concluído</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setKeyDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => createKey.mutate()} disabled={createKey.isPending || newKeyName.trim().length < 3 || !newKeyScopes.length}>
                  {createKey.isPending ? "A gerar..." : "Gerar chave"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Entidades;
