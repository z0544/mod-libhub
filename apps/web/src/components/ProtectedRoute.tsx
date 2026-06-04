import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { useI18n } from "@/context/i18n";

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, isAdmin, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (loading) {
    return <div className="container py-16 text-center text-muted-foreground">{t("action.loading")}</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
