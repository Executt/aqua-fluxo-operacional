import {
  Globe,
  Radio,
  ShieldCheck,
  Building2,
  BrainCircuit,
  Settings,
  Star,
  Clock,
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

const favorites = [
  { title: "Visão Global", url: "/", icon: Globe },
  { title: "Monitorização IoT", url: "/iot", icon: Radio },
];

const dashboards = [
  { title: "Visão Global", url: "/", icon: Globe },
  { title: "Monitorização IoT", url: "/iot", icon: Radio },
  { title: "Compliance", url: "/compliance", icon: ShieldCheck },
];

const pages = [
  { title: "Gestão de Entidades", url: "/entidades", icon: Building2 },
  { title: "Cortex-San (IA)", url: "/cortex", icon: BrainCircuit },
  { title: "Administração", url: "/admin", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const renderItem = (item: typeof favorites[0]) => {
    const active = location.pathname === item.url;
    return (
      <SidebarMenuItem key={item.title + item.url}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-200 ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
            activeClassName=""
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-4 py-5">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">SF</span>
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-foreground tracking-wide">SIGSAN-FED</h2>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center mx-auto">
            <span className="text-primary font-bold text-xs">SF</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Favorites */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-caption uppercase tracking-widest text-muted-foreground font-medium px-3 mb-1">
            <Star className="h-3 w-3" />
            {!collapsed && "Favoritos"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {favorites.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboards */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-caption uppercase tracking-widest text-muted-foreground font-medium px-3 mb-1">
            {!collapsed && "Dashboards"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboards.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pages */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-caption uppercase tracking-widest text-muted-foreground font-medium px-3 mb-1">
            {!collapsed && "Páginas"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pages.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        {!collapsed && (
          <div className="text-caption text-muted-foreground text-center space-y-0.5">
            <p className="font-medium">ANA — Gov.br</p>
            <p className="font-mono text-[10px]">v2.4.1</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
