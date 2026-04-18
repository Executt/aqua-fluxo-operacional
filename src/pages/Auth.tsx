import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Droplets } from "lucide-react";

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [submitting, setSubmitting] = useState(false);
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({ email: "", password: "", nome: "" });

  if (!loading && user) return <Navigate to={from} replace />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(signInData.email, signInData.password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Não foi possível entrar", description: error, variant: "destructive" });
      return;
    }
    navigate(from, { replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (signUpData.password.length < 8) {
      toast({ title: "Senha curta", description: "Mínimo de 8 caracteres.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.nome);
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro no registo", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: "Conta criada",
      description: "Verifique o seu e-mail para confirmar o registo antes de entrar.",
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-3 elevation-2">
            <Droplets className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">SIGSAN-FED</h1>
          <p className="text-sm text-muted-foreground">Curadoria Nacional de Saneamento</p>
        </div>

        <Card className="elevation-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Acesso ao sistema</CardTitle>
            <CardDescription>Operadores, auditores e gestores</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="si-email">E-mail</Label>
                    <Input id="si-email" type="email" required autoComplete="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="si-pwd">Senha</Label>
                    <Input id="si-pwd" type="password" required autoComplete="current-password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "A entrar..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-nome">Nome completo</Label>
                    <Input id="su-nome" required minLength={3}
                      value={signUpData.nome}
                      onChange={(e) => setSignUpData({ ...signUpData, nome: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-email">E-mail institucional</Label>
                    <Input id="su-email" type="email" required autoComplete="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-pwd">Senha (mín. 8)</Label>
                    <Input id="su-pwd" type="password" required minLength={8} autoComplete="new-password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "A criar..." : "Criar conta"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Confirmação por e-mail obrigatória. Vínculo a operador é feito por administrador.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
