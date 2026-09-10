import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users as UsersIcon, Plus, KeyRound, Trash2, Search, ShieldCheck } from "lucide-react";
import { ALL_ROLES, ROLE_LABEL, type AppRole } from "@/lib/rbac";

type AdminUser = {
  user_id: string;
  email: string | null;
  nome: string | null;
  ativo: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  email_confirmed: boolean;
  roles: AppRole[];
};

async function callAdmin<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    const msg = (data as any)?.error || error.message;
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export function UsuariosAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [pwdUser, setPwdUser] = useState<AdminUser | null>(null);
  const [pwd, setPwd] = useState("");
  const [form, setForm] = useState<{ nome: string; email: string; password: string; roles: AppRole[] }>({
    nome: "", email: "", password: "", roles: ["operador"],
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => callAdmin<{ users: AdminUser[] }>({ action: "list" }),
  });
  const users = data?.users ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin_users"] });
  const onErr = (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" });

  const create = useMutation({
    mutationFn: () => callAdmin({ action: "create", ...form }),
    onSuccess: () => {
      toast({ title: "Utilizador criado" });
      setNewOpen(false);
      setForm({ nome: "", email: "", password: "", roles: ["operador"] });
      refresh();
    },
    onError: onErr,
  });

  const setRoles = useMutation({
    mutationFn: (v: { user_id: string; roles: AppRole[] }) => callAdmin({ action: "set_roles", ...v }),
    onSuccess: () => { toast({ title: "Perfis atualizados" }); refresh(); },
    onError: onErr,
  });

  const setActive = useMutation({
    mutationFn: (v: { user_id: string; ativo: boolean }) => callAdmin({ action: "set_active", ...v }),
    onSuccess: () => { toast({ title: "Estado atualizado" }); refresh(); },
    onError: onErr,
  });

  const resetPwd = useMutation({
    mutationFn: () => callAdmin({ action: "reset_password", user_id: pwdUser!.user_id, password: pwd }),
    onSuccess: () => { toast({ title: "Palavra-passe redefinida" }); setPwdUser(null); setPwd(""); },
    onError: onErr,
  });

  const remove = useMutation({
    mutationFn: (user_id: string) => callAdmin({ action: "delete", user_id }),
    onSuccess: () => { toast({ title: "Utilizador eliminado" }); refresh(); },
    onError: onErr,
  });

  const q = search.trim().toLowerCase();
  const filtered = users.filter(
    (u) => !q || `${u.nome ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q),
  );

  const toggleRole = (u: AdminUser, role: AppRole) => {
    const next = u.roles.includes(role) ? u.roles.filter((r) => r !== role) : [...u.roles, role];
    if (!next.length) return toast({ title: "Selecione ao menos um perfil", variant: "destructive" });
    setRoles.mutate({ user_id: u.user_id, roles: next });
  };

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-primary" /> Utilizadores da aplicação
          </CardTitle>
          <CardDescription className="text-body-sm">
            Contas reais de acesso — criação, perfis (RBAC), ativação e redefinição de palavra-passe
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filtrar..."
              className="h-8 w-44 pl-8 text-[12px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setNewOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo utilizador
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-body-sm text-destructive py-6 text-center">{(error as Error).message}</p>
        ) : isLoading ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">A carregar...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfis</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="text-[12px] font-medium">{u.nome}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {ALL_ROLES.map((r) => {
                        const on = u.roles.includes(r);
                        return (
                          <button
                            key={r}
                            onClick={() => toggleRole(u, r)}
                            disabled={setRoles.isPending}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                              on
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {ROLE_LABEL[r]}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">{fmt(u.last_sign_in_at)}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={u.ativo}
                      onCheckedChange={(v) => setActive.mutate({ user_id: u.user_id, ativo: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPwdUser(u)}>
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => remove.mutate(u.user_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[12px] text-muted-foreground py-6">
                    Nenhum utilizador encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <p className="text-caption text-muted-foreground mt-3 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" /> Todas as alterações ficam registadas na trilha de auditoria.
        </p>

        {/* Novo utilizador */}
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo utilizador</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Nome</Label>
                <Input className="h-9 text-[12px]" value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">E-mail</Label>
                <Input className="h-9 text-[12px]" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Palavra-passe (mín. 10 caracteres)</Label>
                <Input className="h-9 text-[12px]" type="text" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Perfis</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map((r) => {
                    const on = form.roles.includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() =>
                          setForm({
                            ...form,
                            roles: on ? form.roles.filter((x) => x !== r) : [...form.roles, r],
                          })
                        }
                        className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                          on ? "bg-primary text-primary-foreground border-primary"
                             : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {ROLE_LABEL[r]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending ? "A criar..." : "Criar utilizador"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Redefinir palavra-passe */}
        <Dialog open={!!pwdUser} onOpenChange={(o) => { if (!o) { setPwdUser(null); setPwd(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Redefinir palavra-passe</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Badge variant="outline" className="text-[11px]">{pwdUser?.email}</Badge>
              <Input className="h-9 text-[12px]" placeholder="Nova palavra-passe (mín. 10)"
                value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <DialogFooter>
              <Button onClick={() => resetPwd.mutate()} disabled={resetPwd.isPending || pwd.length < 10}>
                {resetPwd.isPending ? "A gravar..." : "Redefinir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
