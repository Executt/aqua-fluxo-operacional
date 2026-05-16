import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shield, Settings as SettingsIcon, Server, Mail, FileSignature, KeyRound,
  Users as UsersIcon, History, Plus, RefreshCw, Check, Search, Brain, Plug, BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LLMConfig } from "@/components/admin/LLMConfig";
import { MCPConfig } from "@/components/admin/MCPConfig";
import { KnowledgeBaseConfig } from "@/components/admin/KnowledgeBaseConfig";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

type TabKey = "usuarios" | "smtp" | "sei" | "sso" | "parametros" | "auditoria" | "llm" | "mcp" | "kb";

const TAB_META: Record<TabKey, { label: string; icon: typeof UsersIcon; desc: string }> = {
  usuarios: { label: "Usuários & LDAP", icon: UsersIcon, desc: "Cadastro local e diretório LDAP/AD" },
  llm: { label: "Modelos de LLM", icon: Brain, desc: "Catálogo de modelos de IA disponíveis" },
  mcp: { label: "Servidores MCP", icon: Plug, desc: "Conectores Model Context Protocol" },
  kb: { label: "Base de conhecimento", icon: BookOpen, desc: "Artigos e contexto para os agentes" },
  smtp: { label: "SMTP / E-mail", icon: Mail, desc: "Servidor de envio de notificações" },
  sei: { label: "Integração SEI", icon: FileSignature, desc: "Sistema Eletrônico de Informações" },
  sso: { label: "SSO / Keycloak", icon: KeyRound, desc: "Autenticação federada OIDC" },
  parametros: { label: "Parâmetros gerais", icon: SettingsIcon, desc: "Identidade, fuso e branding" },
  auditoria: { label: "Auditoria", icon: History, desc: "Trilha de eventos administrativos" },
};

const Administracao = () => {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabKey) || "usuarios";
  const setTab = (t: TabKey) => setParams({ tab: t });

  const meta = TAB_META[tab];

  const handleSave = (label: string) =>
    toast({ title: `${label} guardado`, description: "Alterações aplicadas (modo demonstração)." });
  const handleTest = (label: string) =>
    toast({ title: `Testando ${label}`, description: "Verificando conectividade..." });

  return (
    <DashboardLayout>
      <motion.div
        className="p-6 space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
              <meta.icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-heading-1 text-foreground">{meta.label}</h1>
              <p className="text-body-sm text-muted-foreground mt-0.5">{meta.desc}</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary-soft text-primary border-primary/20 gap-1.5 text-[11px]">
            <Shield className="h-3 w-3" /> Acesso restrito
          </Badge>
        </div>

        {/* Quick tab pills (mobile / fallback) */}
        <div className="flex flex-wrap gap-1.5 lg:hidden">
          {(Object.keys(TAB_META) as TabKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`text-[12px] h-8 px-3 rounded-md border transition-colors ${
                tab === k ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"
              }`}
            >
              {TAB_META[k].label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-3">
          {tab === "usuarios" && <UsuariosLDAP onSave={handleSave} onTest={handleTest} />}
          {tab === "llm" && <LLMConfig />}
          {tab === "mcp" && <MCPConfig />}
          {tab === "kb" && <KnowledgeBaseConfig />}
          {tab === "smtp" && <SMTPConfig onSave={handleSave} onTest={handleTest} />}
          {tab === "sei" && <SEIConfig onSave={handleSave} onTest={handleTest} />}
          {tab === "sso" && <SSOConfig onSave={handleSave} onTest={handleTest} />}
          {tab === "parametros" && <ParametrosGerais onSave={handleSave} />}
          {tab === "auditoria" && <Auditoria />}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

/* ─────────── Usuários & LDAP ─────────── */
function UsuariosLDAP({ onSave, onTest }: { onSave: (l: string) => void; onTest: (l: string) => void }) {
  const [ldapEnabled, setLdapEnabled] = useState(true);
  const users = [
    { nome: "Ana Souza", email: "ana.souza@ana.gov.br", role: "Administrador", origem: "LDAP", status: "Ativo" },
    { nome: "Carlos Ferraz", email: "carlos.ferraz@ana.gov.br", role: "Auditor", origem: "LDAP", status: "Ativo" },
    { nome: "Mariana Lopes", email: "mariana.lopes@sigsan.gov.br", role: "Operador", origem: "Local", status: "Ativo" },
    { nome: "Bruno Tavares", email: "bruno.tavares@sigsan.gov.br", role: "Visualizador", origem: "Local", status: "Inativo" },
  ];
  return (
    <>
      <Card className="lg:col-span-2 surface-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-heading-2">Usuários da aplicação</CardTitle>
            <CardDescription className="text-body-sm">Lista combinada (locais + LDAP sincronizados)</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Filtrar..." className="h-8 w-44 pl-8 text-[12px]" />
            </div>
            <Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" /> Novo usuário</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.email}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    <span className={`text-[11px] px-2 py-0.5 rounded ${u.origem === "LDAP" ? "pill-informative" : "pill-muted"}`}>
                      {u.origem}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={u.status === "Ativo" ? "pill-success text-[11px] px-2 py-0.5 rounded" : "pill-muted text-[11px] px-2 py-0.5 rounded"}>
                      {u.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-heading-2 flex items-center gap-2"><Server className="h-4 w-4 text-primary" /> Servidor LDAP / AD</CardTitle>
            <Switch checked={ldapEnabled} onCheckedChange={setLdapEnabled} />
          </div>
          <CardDescription className="text-body-sm">Cadastro automático de usuários a partir do diretório corporativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Host" placeholder="ldap.ana.gov.br" disabled={!ldapEnabled} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Porta" placeholder="636" disabled={!ldapEnabled} />
            <div className="space-y-1.5">
              <Label className="text-[11px]">Segurança</Label>
              <Select disabled={!ldapEnabled}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="LDAPS" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ldaps">LDAPS</SelectItem>
                  <SelectItem value="starttls">STARTTLS</SelectItem>
                  <SelectItem value="none">Nenhuma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Field label="Base DN" placeholder="dc=ana,dc=gov,dc=br" disabled={!ldapEnabled} />
          <Field label="Bind DN" placeholder="cn=svc-sigsan,ou=services,..." disabled={!ldapEnabled} />
          <Field label="Bind password" type="password" placeholder="••••••••" disabled={!ldapEnabled} />
          <Field label="Filtro de busca" placeholder="(&(objectClass=person)(mail=*))" disabled={!ldapEnabled} />
          <Field label="Atributo de e-mail" placeholder="mail" disabled={!ldapEnabled} />
          <Separator />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" disabled={!ldapEnabled} onClick={() => onTest("LDAP")}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Testar
            </Button>
            <Button size="sm" className="flex-1" disabled={!ldapEnabled} onClick={() => onSave("LDAP")}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/* ─────────── SMTP ─────────── */
function SMTPConfig({ onSave, onTest }: { onSave: (l: string) => void; onTest: (l: string) => void }) {
  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader>
        <CardTitle className="text-heading-2 flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Servidor SMTP</CardTitle>
        <CardDescription className="text-body-sm">Configuração de envio de e-mails transacionais e alertas</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Host SMTP" placeholder="smtp.ana.gov.br" />
        <Field label="Porta" placeholder="587" />
        <div className="space-y-1.5">
          <Label className="text-[11px]">Criptografia</Label>
          <Select>
            <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="STARTTLS" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="starttls">STARTTLS</SelectItem>
              <SelectItem value="ssl">SSL/TLS</SelectItem>
              <SelectItem value="none">Nenhuma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="Usuário" placeholder="no-reply@ana.gov.br" />
        <Field label="Senha" type="password" placeholder="••••••••" />
        <Field label="Remetente padrão (From)" placeholder="SIGSAN-FED <no-reply@ana.gov.br>" />
        <Field label="Reply-to" placeholder="suporte.sigsan@ana.gov.br" />
        <Field label="Limite por hora" placeholder="500" />
        <div className="md:col-span-2">
          <Label className="text-[11px]">Assinatura padrão</Label>
          <Textarea className="mt-1.5 text-[12px]" rows={3} placeholder="Atenciosamente,&#10;Equipe SIGSAN-FED — Agência Nacional de Águas" />
        </div>
        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onTest("SMTP")}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Enviar e-mail de teste
          </Button>
          <Button size="sm" onClick={() => onSave("SMTP")}>
            <Check className="h-3.5 w-3.5 mr-1.5" /> Salvar configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────── SEI ─────────── */
function SEIConfig({ onSave, onTest }: { onSave: (l: string) => void; onTest: (l: string) => void }) {
  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader>
        <CardTitle className="text-heading-2 flex items-center gap-2"><FileSignature className="h-4 w-4 text-primary" /> Integração SEI</CardTitle>
        <CardDescription className="text-body-sm">Sistema Eletrônico de Informações — protocolo automático de infrações e auditorias</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Endpoint SOAP/REST" placeholder="https://sei.ana.gov.br/sei/ws/v3" />
        <Field label="Versão da API" placeholder="3.1.5" />
        <Field label="Chave de acesso (token)" type="password" placeholder="••••••••" />
        <Field label="Identificação do sistema" placeholder="SIGSAN-FED" />
        <Field label="Unidade padrão" placeholder="ANA-SAS" />
        <Field label="Usuário de serviço" placeholder="svc.sigsan@ana.gov.br" />
        <div className="space-y-1.5">
          <Label className="text-[11px]">Tipo de processo padrão</Label>
          <Select>
            <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Fiscalização — Saneamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fisc">Fiscalização — Saneamento</SelectItem>
              <SelectItem value="auto">Auto de Infração</SelectItem>
              <SelectItem value="aud">Auditoria Técnica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px]">Nível de sigilo padrão</Label>
          <Select>
            <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Público" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="publico">Público</SelectItem>
              <SelectItem value="restrito">Restrito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onTest("SEI")}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Testar conexão
          </Button>
          <Button size="sm" onClick={() => onSave("SEI")}>
            <Check className="h-3.5 w-3.5 mr-1.5" /> Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────── SSO / Keycloak ─────────── */
function SSOConfig({ onSave, onTest }: { onSave: (l: string) => void; onTest: (l: string) => void }) {
  const [enabled, setEnabled] = useState(false);
  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-heading-2 flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> SSO / Keycloak (OIDC)</CardTitle>
            <CardDescription className="text-body-sm">Autenticação federada via Gov.br ou IdP corporativo</CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Issuer URL" placeholder="https://auth.sigsan.gov.br/realms/sigsan-fed" disabled={!enabled} />
        <Field label="Realm" placeholder="sigsan-fed" disabled={!enabled} />
        <Field label="Client ID" placeholder="sigsan-portal" disabled={!enabled} />
        <Field label="Client Secret" type="password" placeholder="••••••••" disabled={!enabled} />
        <Field label="Redirect URI" placeholder="https://sigsan.gov.br/callback" disabled={!enabled} />
        <Field label="Scopes" placeholder="openid profile email" disabled={!enabled} />
        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" disabled={!enabled} onClick={() => onTest("SSO")}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Testar OIDC
          </Button>
          <Button size="sm" disabled={!enabled} onClick={() => onSave("SSO")}>
            <Check className="h-3.5 w-3.5 mr-1.5" /> Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────── Parâmetros gerais ─────────── */
function ParametrosGerais({ onSave }: { onSave: (l: string) => void }) {
  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader>
        <CardTitle className="text-heading-2 flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-primary" /> Parâmetros gerais</CardTitle>
        <CardDescription className="text-body-sm">Identidade do sistema, fuso horário e branding</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Nome do órgão" placeholder="Agência Nacional de Águas e Saneamento Básico" />
        <Field label="Sigla" placeholder="ANA" />
        <Field label="URL pública" placeholder="https://sigsan.gov.br" />
        <Field label="E-mail de contato" placeholder="contato.sigsan@ana.gov.br" />
        <div className="space-y-1.5">
          <Label className="text-[11px]">Fuso horário</Label>
          <Select defaultValue="brt">
            <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="brt">America/Sao_Paulo (BRT)</SelectItem>
              <SelectItem value="utc">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px]">Idioma padrão</Label>
          <Select defaultValue="pt-br">
            <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-br">Português (Brasil)</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="Retenção de logs (dias)" placeholder="365" />
        <Field label="Sessão (minutos)" placeholder="60" />
        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-border">
          <Button size="sm" onClick={() => onSave("Parâmetros")}>
            <Check className="h-3.5 w-3.5 mr-1.5" /> Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────── Auditoria ─────────── */
function Auditoria() {
  const events = [
    { ts: "2026-04-17 09:42", user: "ana.souza", action: "LDAP_TEST", target: "ldap.ana.gov.br", result: "OK" },
    { ts: "2026-04-17 09:31", user: "carlos.ferraz", action: "USER_CREATE", target: "mariana.lopes", result: "OK" },
    { ts: "2026-04-16 18:05", user: "ana.souza", action: "SMTP_UPDATE", target: "smtp.ana.gov.br:587", result: "OK" },
    { ts: "2026-04-16 11:17", user: "system", action: "SEI_SYNC", target: "Auto #2026-1187", result: "FALHA" },
    { ts: "2026-04-15 22:00", user: "system", action: "BACKUP", target: "db_full", result: "OK" },
  ];
  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Trilha de auditoria</CardTitle>
          <CardDescription className="text-body-sm">Eventos administrativos das últimas 24 horas</CardDescription>
        </div>
        <Button variant="outline" size="sm">Exportar CSV</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-[11px]">{e.ts}</TableCell>
                <TableCell className="font-medium">{e.user}</TableCell>
                <TableCell><span className="font-mono text-[11px]">{e.action}</span></TableCell>
                <TableCell className="text-muted-foreground">{e.target}</TableCell>
                <TableCell>
                  <span className={`text-[11px] px-2 py-0.5 rounded ${e.result === "OK" ? "pill-success" : "pill-destructive"}`}>
                    {e.result}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ─────────── Field helper ─────────── */
function Field({ label, type = "text", placeholder, disabled }: { label: string; type?: string; placeholder?: string; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">{label}</Label>
      <Input type={type} placeholder={placeholder} disabled={disabled} className="h-9 text-[12px]" />
    </div>
  );
}

export default Administracao;
