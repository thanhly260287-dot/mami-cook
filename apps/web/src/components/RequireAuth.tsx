import { t } from "@mami/shared";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DEMO_MODE } from "@/lib/supabase";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function RequireAuth({ children, cook, staff }: { children: ReactNode; cook?: boolean; staff?: boolean }) {
  const { user, loading, cook: myCook, isStaff } = useAuth();
  const location = useLocation();

  // Démo : le tableau de bord de l'équipe s'affiche avec des chiffres d'exemple (aucune donnée réelle).
  if (DEMO_MODE && staff) return <>{children}</>;
  if (DEMO_MODE) {
    return <EmptyState icon="🔒" title={t("Fonctionnalité indisponible en mode démo")}>{t("Connectez une base Supabase pour créer des comptes et passer commande.")}</EmptyState>;
  }
  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!user) return <Navigate to={`/connexion?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (cook && !myCook) {
    return <EmptyState icon="👩‍🍳" title={t("Vous n'avez pas encore de cuisine")} action={<Button asChild><Link to="/devenir-cuisinier">{t("Devenir Mami Cook")}</Link></Button>}>{t("Créez votre cuisine pour accéder à cet espace.")}</EmptyState>;
  }
  if (staff && !isStaff) return <EmptyState icon="⛔" title={t("Accès réservé")}>{t("Cette page est réservée à l'équipe MAMI COOK.")}</EmptyState>;
  return <>{children}</>;
}
