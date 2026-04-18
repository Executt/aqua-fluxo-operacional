import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import CortexSan from "./pages/CortexSan.tsx";
import Entidades from "./pages/Entidades.tsx";
import Administracao from "./pages/Administracao.tsx";
import IoTMonitor from "./pages/IoTMonitor.tsx";
import CompliancePage from "./pages/Compliance.tsx";
import Curadoria from "./pages/Curadoria.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/cortex" element={<CortexSan />} />
            <Route path="/entidades" element={<Entidades />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRoles={["admin"]}>
                  <Administracao />
                </ProtectedRoute>
              }
            />
            <Route path="/iot" element={<IoTMonitor />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route
              path="/curadoria"
              element={
                <ProtectedRoute>
                  <Curadoria />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
