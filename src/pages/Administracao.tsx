import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Settings,
  Link2,
  Check,
  RefreshCw,
  Bell,
  Database,
  Globe,
  Lock,
  Server,
  FileText,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const Administracao = () => {
  const { toast } = useToast();

  // Keycloak config state
  const [kcEnabled, setKcEnabled] = useState(false);
  const [kcUrl, setKcUrl] = useState("https://auth.sigsan.gov.br");
  const [kcRealm, setKcRealm] = useState("sigsan-fed");
  const [kcClientId, setKcClientId] = useState("sigsan-portal");

  const handleSave = () => {
    toast({ title: "Configurações guardadas", description: "As alterações foram aplicadas com sucesso." });
  };

  const handleTestConnection = () => {
    toast({ title: "Teste de conexão", description: "A verificar endpoints OIDC do Keycloak..." });
  };

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
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Administração</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configurações do sistema, integração Keycloak e parâmetros globais
            </p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1.5">
            <Lock className="h-3 w-3" />
            Admin Only
          </Badge>
        </motion.div>

        {/* Main Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Keycloak Integration */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Integração Keycloak (IdP)
              </CardTitle>
              <CardDescription className="text-xs">
                Configure a integração com o Keycloak para federação de identidade. As bases de utilizadores são geridas centralmente no Keycloak.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Ativar Keycloak SSO</p>
                  <p className="text-xs text-muted-foreground">Autenticação federada via OpenID Connect</p>
                </div>
                <Switch checked={kcEnabled} onCheckedChange={setKcEnabled} />
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">URL do Servidor Keycloak</Label>
                  <Input
                    value={kcUrl}
                    onChange={(e) => setKcUrl(e.target.value)}
                    placeholder="https://auth.example.com"
                    className="bg-background border-border font-mono text-xs"
                    disabled={!kcEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Realm</Label>
                  <Input
                    value={kcRealm}
                    onChange={(e) => setKcRealm(e.target.value)}
                    placeholder="sigsan-fed"
                    className="bg-background border-border font-mono text-xs"
                    disabled={!kcEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Client ID</Label>
                  <Input
                    value={kcClientId}
                    onChange={(e) => setKcClientId(e.target.value)}
                    placeholder="sigsan-portal"
                    className="bg-background border-border font-mono text-xs"
                    disabled={!kcEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Client Secret</Label>
                  <Input
                    type="password"
                    placeholder="••••••••••••••••"
                    className="bg-background border-border font-mono text-xs"
                    disabled={!kcEnabled}
                  />
                </div>
              </div>

              <Button className="w-full gap-2" disabled={!kcEnabled} onClick={handleTestConnection}>
                <Link2 className="h-4 w-4" />
                Testar Conexão
              </Button>

              {kcEnabled && (
                <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-xs font-medium text-success">Endpoints OIDC detectados</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {kcUrl}/realms/{kcRealm}/.well-known/openid-configuration
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* General Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Configurações Gerais
              </CardTitle>
              <CardDescription className="text-xs">
                Parâmetros globais do sistema SIGSAN-FED.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-aprovação de Registo</p>
                  <p className="text-xs text-muted-foreground">Novas entidades ficam ativas imediatamente</p>
                </div>
                <Switch />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Notificações por E-mail</p>
                  <p className="text-xs text-muted-foreground">Alertar administradores sobre novos registos</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Rotação Automática de API Keys</p>
                  <p className="text-xs text-muted-foreground">Renovar tokens a cada 90 dias</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="bg-border" />
              <div className="space-y-2">
                <Label className="text-xs">Tempo de Expiração do Token (dias)</Label>
                <Select defaultValue="90">
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="180">180 dias</SelectItem>
                    <SelectItem value="365">365 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={handleSave}>
                <RefreshCw className="h-4 w-4" />
                Guardar Configurações
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Additional Settings Row */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audit Logs */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Auditoria e Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Logs de Acesso</p>
                  <p className="text-xs text-muted-foreground">Registar logins e operações</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="bg-border" />
              <div className="space-y-2">
                <Label className="text-xs">Retenção de Logs</Label>
                <Select defaultValue="90">
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="180">180 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <FileText className="h-3.5 w-3.5" />
                Exportar Logs
              </Button>
            </CardContent>
          </Card>

          {/* Database & Storage */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Base de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Armazenamento</span>
                  <span className="font-mono text-foreground">1.2 TB / 5 TB</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: "24%" }} />
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Leituras IoT (hoje)</span>
                  <span className="font-mono text-foreground">847.293</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Conexões ativas</span>
                  <span className="font-mono text-success">42</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Database className="h-3.5 w-3.5" />
                Backup Manual
              </Button>
            </CardContent>
          </Card>

          {/* Users & Permissions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Utilizadores e Permissões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Administradores</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">3</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Moderadores</span>
                  <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">8</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Utilizadores</span>
                  <Badge variant="outline" className="text-[10px]">124</Badge>
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">MFA Obrigatório</p>
                  <p className="text-xs text-muted-foreground">Para administradores</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Users className="h-3.5 w-3.5" />
                Gerir Utilizadores
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Administracao;
