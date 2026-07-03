import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play, Send, ShieldAlert, ClipboardCheck, Mail, Webhook, Radio } from "lucide-react";
import {
  useComplianceRegras, usePlanosAcao, useNotificacoesDispatch,
  useAutoDetect, useDispatchNotif, usePlanoTransition,
} from "@/hooks/use-compliance-auto";
import { fadeUp, stagger, gravidadeColor } from "@/components/compliance/shared";

const estadoColor: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  submetido: "bg-primary/15 text-primary border-primary/30",
  em_analise: "bg-warning/15 text-warning border-warning/30",
  aprovado: "bg-success/15 text-success border-success/30",
  rejeitado: "bg-destructive/15 text-destructive border-destructive/30",
  concluido: "bg-success/20 text-success border-success/40",
  atrasado: "bg-destructive/20 text-destructive border-destructive/40",
};

export function AutomacaoTab() {
  const { data: regras, isLoading: lReg } = useComplianceRegras();
  const { data: planos, isLoading: lPlanos } = usePlanosAcao();
  const { data: dispatch, isLoading: lDisp } = useNotificacoesDispatch();
  const detect = useAutoDetect();
  const send = useDispatchNotif();
  const transition = usePlanoTransition();

  const [rejeitar, setRejeitar] = useState<{ id: string; motivo: string } | null>(null);

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border elevation-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <CardTitle className="text-body-sm">Detecção automática</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Aplica todas as regras ativas em <span className="font-medium">compliance_regras</span> sobre scores,
              ETEs e metas. Para cada violação, abre infração, cria plano de ação em rascunho e enfileira
              notificações (in-app + e-mail + webhook).
            </p>
            <Button
              size="sm" onClick={() => detect.mutate()} disabled={detect.isPending}
              className="gap-2 text-[12px]"
            >
              <Play className="h-3.5 w-3.5" />
              {detect.isPending ? "Detectando..." : "Executar detecção agora"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border elevation-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <CardTitle className="text-body-sm">Despacho de notificações</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Envia notificações pendentes por e-mail (Resend) e webhook assinado (HMAC-SHA256).
              Configure <code className="font-mono text-[11px]">RESEND_API_KEY</code> e endpoints em
              <code className="font-mono text-[11px]"> system_settings</code>.
            </p>
            <Button
              size="sm" variant="secondary" onClick={() => send.mutate()} disabled={send.isPending}
              className="gap-2 text-[12px]"
            >
              <Send className="h-3.5 w-3.5" />
              {send.isPending ? "Despachando..." : "Despachar pendentes"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Regras ativas */}
      <motion.div variants={fadeUp}>
        <Card className="bg-card border-border elevation-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-body-sm">Regras ativas</CardTitle>
          </CardHeader>
          <CardContent>
            {lReg ? <Skeleton className="h-24" /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-[11px]">Código</TableHead>
                  <TableHead className="text-[11px]">Nome</TableHead>
                  <TableHead className="text-[11px]">Tipo</TableHead>
                  <TableHead className="text-[11px]">Gravidade</TableHead>
                  <TableHead className="text-[11px] text-right">Prazo</TableHead>
                  <TableHead className="text-[11px] text-right">Ativa</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(regras ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-[12px]">{r.codigo}</TableCell>
                      <TableCell className="text-[12px]">{r.nome}</TableCell>
                      <TableCell className="text-[12px]">{r.tipo}</TableCell>
                      <TableCell><Badge className={`${gravidadeColor[r.gravidade_default] ?? ""} text-[10px]`}>{r.gravidade_default}</Badge></TableCell>
                      <TableCell className="text-[12px] text-right">{r.prazo_dias}d</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={r.ativa ? "default" : "outline"} className="text-[10px]">
                          {r.ativa ? "sim" : "não"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Planos de ação */}
      <motion.div variants={fadeUp}>
        <Card className="bg-card border-border elevation-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-body-sm">Planos de ação — workflow</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {lPlanos ? <Skeleton className="h-32" /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-[11px]">Título</TableHead>
                  <TableHead className="text-[11px]">Entidade</TableHead>
                  <TableHead className="text-[11px]">Estado</TableHead>
                  <TableHead className="text-[11px]">Prazo final</TableHead>
                  <TableHead className="text-[11px] text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(planos ?? []).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-[12px] max-w-[280px] truncate">{p.titulo}</TableCell>
                      <TableCell className="text-[12px]">{p.entidades?.nome ?? "—"}</TableCell>
                      <TableCell><Badge className={`${estadoColor[p.estado]} text-[10px]`}>{p.estado}</Badge></TableCell>
                      <TableCell className="text-[12px] font-mono">{p.prazo_final}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {p.estado === "rascunho" && (
                          <Button size="sm" variant="outline" className="h-7 text-[11px]"
                            onClick={() => transition.mutate({ plano_id: p.id, novo_estado: "submetido" })}>
                            Submeter
                          </Button>
                        )}
                        {p.estado === "submetido" && (
                          <Button size="sm" variant="outline" className="h-7 text-[11px]"
                            onClick={() => transition.mutate({ plano_id: p.id, novo_estado: "em_analise" })}>
                            Analisar
                          </Button>
                        )}
                        {p.estado === "em_analise" && (
                          <>
                            <Button size="sm" className="h-7 text-[11px]"
                              onClick={() => transition.mutate({ plano_id: p.id, novo_estado: "aprovado" })}>
                              Aprovar
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-[11px]"
                              onClick={() => setRejeitar({ id: p.id, motivo: "" })}>
                              Rejeitar
                            </Button>
                          </>
                        )}
                        {p.estado === "aprovado" && (
                          <Button size="sm" variant="outline" className="h-7 text-[11px]"
                            onClick={() => transition.mutate({ plano_id: p.id, novo_estado: "concluido" })}>
                            Concluir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!planos?.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-[12px] text-muted-foreground py-6">
                      Nenhum plano de ação. Execute a detecção automática para gerar.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Notificações despachadas */}
      <motion.div variants={fadeUp}>
        <Card className="bg-card border-border elevation-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <CardTitle className="text-body-sm">Trilha de notificações (e-mail + webhook)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {lDisp ? <Skeleton className="h-32" /> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-[11px]">Canal</TableHead>
                  <TableHead className="text-[11px]">Entidade</TableHead>
                  <TableHead className="text-[11px]">Assunto</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px]">Erro</TableHead>
                  <TableHead className="text-[11px] text-right">Enviado em</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(dispatch ?? []).map((n: any) => (
                    <TableRow key={n.id}>
                      <TableCell className="text-[12px]">
                        {n.canal === "email" ? <Mail className="h-3.5 w-3.5 inline mr-1" /> : <Webhook className="h-3.5 w-3.5 inline mr-1" />}
                        {n.canal}
                      </TableCell>
                      <TableCell className="text-[12px]">{n.entidades?.nome ?? "—"}</TableCell>
                      <TableCell className="text-[12px] max-w-[300px] truncate">{n.assunto}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${
                          n.status === "enviada" ? "bg-success/15 text-success border-success/30" :
                          n.status === "falhou"  ? "bg-destructive/15 text-destructive border-destructive/30" :
                                                   "bg-muted text-muted-foreground border-border"
                        }`}>{n.status}</Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-destructive max-w-[200px] truncate">{n.erro ?? ""}</TableCell>
                      <TableCell className="text-[11px] font-mono text-right">
                        {n.enviado_em ? new Date(n.enviado_em).toLocaleString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!dispatch?.length && (
                    <TableRow><TableCell colSpan={6} className="text-center text-[12px] text-muted-foreground py-6">
                      Sem notificações no canal e-mail/webhook.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Diálogo rejeitar */}
      <Dialog open={!!rejeitar} onOpenChange={(o) => !o && setRejeitar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar plano de ação</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              value={rejeitar?.motivo ?? ""}
              onChange={(e) => setRejeitar((r) => r && { ...r, motivo: e.target.value })}
              placeholder="Descreva o motivo da rejeição..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejeitar(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!rejeitar?.motivo}
              onClick={() => {
                if (!rejeitar) return;
                transition.mutate(
                  { plano_id: rejeitar.id, novo_estado: "rejeitado", motivo_rejeicao: rejeitar.motivo },
                  { onSuccess: () => setRejeitar(null) },
                );
              }}
            >Rejeitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
