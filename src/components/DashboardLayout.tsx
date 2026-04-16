import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search, Sun, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* SnowUI Top Bar */}
          <header className="h-12 flex items-center border-b border-border px-4 bg-shell gap-4">
            <SidebarTrigger className="text-shell-foreground hover:text-foreground" />
            
            {/* Breadcrumb area */}
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">Dashboards</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium">Default</span>
            </div>

            {/* Search */}
            <div className="ml-auto flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar..." 
                  className="h-8 w-48 pl-8 bg-secondary border-border text-[12px] rounded-lg"
                />
              </div>
              <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
                <Sun className="h-4 w-4 text-muted-foreground" />
              </button>
              <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors relative">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              </button>
              <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
