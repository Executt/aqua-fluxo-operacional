import {
  Globe,
  Radio,
  ShieldCheck,
  Building2,
  BrainCircuit,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Visão Global", url: "/", icon: Globe },
  { title: "Monitorização IoT", url: "/iot", icon: Radio, badge: "Tempo Real" },
  { title: "Gestão SARSB", url: "/compliance", icon: ShieldCheck, badge: "Compliance" },
  { title: "Gestão de Entidades", url: "/entidades", icon: Building2 },
  { title: "Cortex-San (IA)", url: "/cortex", icon: BrainCircuit },
  { title: "Administração", url: "/admin", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <span className="text-primary-foreground font-bold text-sm">SF</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-wide">SIGSAN-FED</h2>
              <p className="text-[10px] text-muted-foreground">Águas & Saneamento</p>
            </div>
          </div>
        ) : (
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center glow-primary mx-auto">
            <span className="text-primary-foreground font-bold text-sm">SF</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="text-[10px] text-muted-foreground text-center">
            <p>ANA — Gov.br</p>
            <p className="font-mono">v2.4.1</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
