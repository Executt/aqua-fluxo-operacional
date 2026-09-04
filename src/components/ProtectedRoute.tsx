import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABEL, canAccessRoute, hasRole, type AppRole } from "@/lib/rbac";

interface Props {
  children: ReactNode;
  /** Restringe a papéis específicos. Se vazio, usa o mapa de rotas do RBAC. */
  requireRoles?: AppRole[];
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

  const allowed = requireRoles?.length
    ? hasRole(roles, requireRoles)
    : canAccessRoute(roles, location.pathname);

  if (!allowed) {
    const exigidos = (requireRoles ?? []).map((r) => ROLE_LABEL[r]).join(", ");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Acesso negado</h1>
          <p className="text-sm text-muted-foreground">
            {exigidos
              ? `Esta área exige perfil: ${exigidos}.`
              : "O seu perfil não tem permissão para esta área."}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Perfis atribuídos: {roles.length ? roles.map((r) => ROLE_LABEL[r]).join(", ") : "nenhum"}.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
