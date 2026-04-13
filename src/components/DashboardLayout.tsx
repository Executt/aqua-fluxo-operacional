import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* SAP Shell Bar (stays dark per Fiori spec) */}
          <header className="h-11 flex items-center border-b border-border px-4 bg-shell">
            <SidebarTrigger className="text-shell-foreground hover:text-foreground" />
            <div className="ml-auto flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-[11px] text-shell-foreground font-medium tracking-wide">SISTEMA OPERACIONAL</span>
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
