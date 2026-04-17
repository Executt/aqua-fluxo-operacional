import { TopNav } from "@/components/TopNav";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
