import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ClipboardCheck, Download, FileText, FileWarning } from "lucide-react";
import { auditoriaStatusColor, gravidadeColor, infracaoStatusColor, statusColor, statusLabel } from "./shared";

export function InfracaoDialog({ infracao, onClose }: { infracao: any | null; onClose: () => void }) {
  return (
    <Dialog open={!!infracao} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-warning" />
            <span className="font-mono text-primary">{infracao?.codigo}</span>
            <Badge variant="outline" className={`text-[10px] ${gravidadeColor[infracao?.gravidade] || ""}`}>
              {infracao?.gravidade}
            </Badge>
          </DialogTitle>
          <DialogDescription>{(infracao?.entidades as any)?.nome}</DialogDescription>
        </DialogHeader>
        {infracao && (
          <div className="space-y-4 text-body-sm">
            <div>
              <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
              <p className="text-foreground">{infracao.descricao}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Norma</p>
                <p className="font-mono text-foreground">{infracao.norma}</p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                <Badge variant="outline" className={`text-[10px] ${infracaoStatusColor[infracao.status] || ""}`}>
                  {infracao.status === "aberta" ? "Aberta" : infracao.status === "em_analise" ? "Em Análise" : "Resolvida"}
                </Badge>
              </div>
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Data Ocorrência</p>
                <p className="font-mono text-foreground">{infracao.data_ocorrencia || "—"}</p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Prazo Regularização</p>
                <p className="font-mono text-foreground">{infracao.prazo || "—"}</p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          <Button size="sm" className="gap-2"><FileText className="h-3.5 w-3.5" /> Abrir Processo SEI</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AuditoriaDialog({ auditoria, onClose }: { auditoria: any | null; onClose: () => void }) {
  return (
    <Dialog open={!!auditoria} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <span className="font-mono text-primary">{auditoria?.id}</span>
            <Badge variant="outline" className={`text-[10px] ${auditoriaStatusColor[auditoria?.status] || ""}`}>
              {auditoria?.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>{auditoria?.entidade} — {auditoria?.uf}</DialogDescription>
        </DialogHeader>
        {auditoria && (
          <div className="space-y-4 text-body-sm">
            <div>
              <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Escopo</p>
              <p className="text-foreground">{auditoria.escopo}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Tipo</p>
                <p className="text-foreground">{auditoria.tipo}</p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Auditor</p>
                <p className="text-foreground">{auditoria.auditor}</p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Data</p>
                <p className="font-mono text-foreground">{auditoria.data}</p>
              </div>
              <div>
                <p className="text-caption text-muted-foreground uppercase tracking-wider mb-1">Resultado</p>
                {auditoria.resultado ? (
                  <Badge variant="outline" className={`text-[10px] ${statusColor[auditoria.resultado] || ""}`}>
                    {statusLabel[auditoria.resultado]}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Pendente</span>
                )}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          <Button size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Baixar Laudo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
