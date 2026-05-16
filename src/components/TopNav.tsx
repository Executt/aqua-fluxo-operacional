import { NavLink as RRNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Globe, Radio, ShieldCheck, Building2, BrainCircuit, Settings, Droplets,
  Search, Bell, Sun, HelpCircle, ChevronDown, LogOut, LogIn,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const modules = [
  { title: "Visão Global", url: "/", icon: Globe },
  { title: "IoT", url: "/iot", icon: Radio },
  { title: "Compliance", url: "/compliance", icon: ShieldCheck },
  { title: "Curadoria", url: "/curadoria", icon: Droplets },
  { title: "Entidades", url: "/entidades", icon: Building2 },
  { title: "Cortex-San", url: "/cortex", icon: BrainCircuit },
  { title: "Administração", url: "/admin", icon: Settings },
];

const subNav: Record<string, { title: string; url: string }[]> = {
  "/": [
    { title: "Resumo", url: "/" },
    { title: "Mapa Brasil", url: "/?tab=mapa" },
    { title: "Alertas", url: "/?tab=alertas" },
  ],
  "/iot": [
    { title: "Sensores", url: "/iot" },
    { title: "Leituras", url: "/iot?tab=leituras" },
    { title: "Bateria & Sinal", url: "/iot?tab=saude" },
  ],
  "/compliance": [
    { title: "Scores", url: "/compliance" },
    { title: "Infrações", url: "/compliance?tab=infracoes" },
    { title: "Auditorias", url: "/compliance?tab=auditorias" },
  ],
  "/entidades": [
    { title: "Lista", url: "/entidades" },
    { title: "Cadastro", url: "/entidades?tab=novo" },
    { title: "ETEs", url: "/entidades?tab=etes" },
  ],
  "/cortex": [
    { title: "Chat IA", url: "/cortex" },
  ],
  "/curadoria": [
    { title: "Submissões", url: "/curadoria" },
    { title: "Validações", url: "/curadoria?tab=validacoes" },
    { title: "Importar lote", url: "/curadoria?tab=bulk" },
  ],
  "/admin": [
    { title: "Usuários & LDAP", url: "/admin?tab=usuarios" },
    { title: "Modelos de LLM", url: "/admin?tab=llm" },
    { title: "Servidores MCP", url: "/admin?tab=mcp" },
    { title: "Base de conhecimento", url: "/admin?tab=kb" },
    { title: "SMTP", url: "/admin?tab=smtp" },
    { title: "SEI", url: "/admin?tab=sei" },
    { title: "SSO / Keycloak", url: "/admin?tab=sso" },
    { title: "Parâmetros", url: "/admin?tab=parametros" },
    { title: "Auditoria", url: "/admin?tab=auditoria" },
  ],
};

function rootPath(pathname: string): string {
  if (pathname === "/") return "/";
  const seg = "/" + pathname.split("/").filter(Boolean)[0];
  return seg in subNav ? seg : "/";
}

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roles, signOut } = useAuth();
  const root = rootPath(location.pathname);
  const subs = subNav[root] ?? [];
  const search = new URLSearchParams(location.search);
  const activeTab = search.get("tab");

  const meta = (user?.user_metadata ?? {}) as { nome?: string };
  const displayName = meta.nome || user?.email?.split("@")[0] || "Convidado";
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleLabel = roles[0]
    ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1)
    : user ? "Sem perfil" : "Não autenticado";

  return (
    <header className="sticky top-0 z-30 bg-shell border-b border-shell-border">
      {/* Primary bar */}
      <div className="h-14 flex items-center px-6 gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-[13px] tracking-tight">
            SF
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-semibold text-foreground tracking-tight">SIGSAN-FED</span>
            <span className="text-[10px] text-muted-foreground font-medium">ANA · Gov.br</span>
          </div>
        </div>

        {/* Module nav */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-2">
          {modules.map((m) => {
            const isActive = root === m.url || (m.url !== "/" && location.pathname.startsWith(m.url));
            return (
              <RRNavLink
                key={m.url}
                to={m.url}
                end={m.url === "/"}
                className={cn(
                  "flex items-center gap-2 h-9 px-3 rounded-md text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-shell-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <m.icon className="h-4 w-4" />
                <span>{m.title}</span>
              </RRNavLink>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar entidades, ETEs, sensores..."
              className="h-9 w-64 pl-8 bg-secondary border-transparent focus-visible:bg-card text-[12px] rounded-md"
            />
          </div>
          <button className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-secondary text-muted-foreground transition-colors">
            <HelpCircle className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-secondary text-muted-foreground transition-colors">
            <Sun className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-secondary text-muted-foreground transition-colors relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>
          <div className="h-6 w-px bg-border mx-1" />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-md hover:bg-secondary transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col leading-none text-left">
                    <span className="text-[12px] font-medium text-foreground">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Terminar sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-3.5 w-3.5" /> Entrar
            </button>
          )}
        </div>
      </div>

      {/* Sub-nav contextual */}
      {subs.length > 0 && (
        <div className="h-10 bg-subnav border-t border-border flex items-center px-6 gap-1 overflow-x-auto">
          {subs.map((s, idx) => {
            const url = new URL(s.url, "http://x");
            const tab = url.searchParams.get("tab");
            const isActive = tab ? activeTab === tab : !activeTab && location.pathname === url.pathname;
            return (
              <RRNavLink
                key={s.url + idx}
                to={s.url}
                className={cn(
                  "h-8 px-3 flex items-center text-[12px] font-medium rounded-md transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-card text-primary border border-border elevation-1"
                    : "text-subnav-foreground hover:text-foreground hover:bg-card/60"
                )}
              >
                {s.title}
              </RRNavLink>
            );
          })}
        </div>
      )}
    </header>
  );
}
