import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plug, Plus, Trash2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type MCPServer = {
  id: string;
  name: string;
  description: string | null;
  url: string;
  transport: string;
  auth_type: string;
  active: boolean;
};

export function MCPConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<MCPServer>>({
    transport: "http", auth_type: "none", active: true,
  });

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ["mcp_servers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mcp_servers").select("*").order("name");
      if (error) throw error;
      return data as MCPServer[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("mcp_servers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp_servers"] });
      toast({ title: "Servidor atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeServer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mcp_servers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp_servers"] });
      toast({ title: "Servidor removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createServer = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.url) throw new Error("Preencha nome e URL.");
      const { error } = await supabase.from("mcp_servers").insert({
        name: form.name!,
        description: form.description ?? null,
        url: form.url!,
        transport: form.transport || "http",
        auth_type: form.auth_type || "none",
        active: form.active ?? true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp_servers"] });
      toast({ title: "Servidor MCP cadastrado" });
      setOpen(false);
      setForm({ transport: "http", auth_type: "none", active: true });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-heading-2 flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" /> Servidores MCP
          </CardTitle>
          <CardDescription className="text-body-sm">
            Conectores Model Context Protocol — expõem ferramentas externas aos agentes
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Novo servidor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar servidor MCP</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Nome</Label>
                <Input className="h-9 text-[12px]"
                  placeholder="Notion (oficial)"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">URL do servidor</Label>
                <Input className="h-9 text-[12px] font-mono"
                  placeholder="https://mcp.example.com/mcp"
                  value={form.url || ""}
                  onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Transporte</Label>
                  <Select value={form.transport} onValueChange={(v) => setForm({ ...form, transport: v })}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP (Streamable)</SelectItem>
                      <SelectItem value="sse">SSE</SelectItem>
                      <SelectItem value="stdio">stdio (local)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Autenticação</Label>
                  <Select value={form.auth_type} onValueChange={(v) => setForm({ ...form, auth_type: v })}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="oauth">OAuth 2.0</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Descrição</Label>
                <Textarea rows={2} className="text-[12px]"
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createServer.mutate()} disabled={createServer.isPending}>
                {createServer.isPending ? "Gravando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-body-sm text-muted-foreground">A carregar...</p>
        ) : servers.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">Nenhum servidor MCP cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Transporte</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium text-[13px] flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-muted-foreground" />{s.name}
                    </div>
                    {s.description && (
                      <div className="text-caption text-muted-foreground line-clamp-1">{s.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground max-w-[280px] truncate">{s.url}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] uppercase">{s.transport}</Badge></TableCell>
                  <TableCell className="text-[12px]">{s.auth_type}</TableCell>
                  <TableCell>
                    <Switch checked={s.active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: s.id, active: v })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => removeServer.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
