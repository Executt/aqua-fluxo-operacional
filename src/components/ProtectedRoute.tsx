import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: ReactNode;
  /** Restringe a roles específicas. Se vazio, basta estar autenticado. */
  requireRoles?: ("admin" | "gestor" | "auditor" | "operador")[];
}

export function ProtectedRoute({ children, requireRoles }: Props) {
  const { user, loading, roles } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">A carregar sessão...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireRoles && requireRoles.length > 0) {
    const hasRole = roles.some((r) => requireRoles.includes(r));
    if (!hasRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-semibold mb-2">Acesso negado</h1>
            <p className="text-sm text-muted-foreground">
              Esta área exige perfil: {requireRoles.join(", ")}.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
