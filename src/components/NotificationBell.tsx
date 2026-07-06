import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMinhasNotificacoes, useMarkNotifRead } from "@/hooks/use-compliance-auto";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationBell() {
  const nav = useNavigate();
  const { data: notifs = [] } = useMinhasNotificacoes();
  const markRead = useMarkNotifRead();
  const naoLidas = notifs.filter((n: any) => n.status !== "lida");
  const count = naoLidas.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-secondary text-muted-foreground transition-colors relative"
          aria-label={`Notificações${count ? ` (${count} não lidas)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span className="text-[12px] font-semibold">Notificações</span>
          {count > 0 && (
            <Button
              variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
              onClick={(e) => {
                e.preventDefault();
                naoLidas.forEach((n: any) => markRead.mutate(n.id));
              }}
            >
              <CheckCheck className="h-3 w-3 mr-1" /> Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[420px] overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="p-8 flex flex-col items-center gap-2 text-muted-foreground">
              <Inbox className="h-6 w-6" />
              <p className="text-[11px]">Nenhuma notificação</p>
            </div>
          ) : (
            notifs.map((n: any) => {
              const unread = n.status !== "lida";
              const tipo = n.payload_json?.tipo;
              const nivel = n.payload_json?.nivel;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (unread) markRead.mutate(n.id);
                    if (n.infracao_id) nav(`/compliance?tab=infracoes`);
                    else if (n.plano_acao_id) nav(`/compliance?tab=automacao`);
                  }}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/60 hover:bg-secondary/60 transition-colors ${unread ? "bg-primary-soft/30" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {unread && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[12px] font-medium text-foreground truncate">{n.assunto}</p>
                        {tipo === "escalonamento" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded pill-destructive">esc. {nivel}</span>
                        )}
                        {tipo === "plano_vencido" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded pill-warning">vencido</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{n.mensagem}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
