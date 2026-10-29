import { t } from "@mami/shared";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart3, CalendarDays, CreditCard, MessageSquareQuote, Package, Settings, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { fetchCookOrders } from "@/lib/api";
import { Badge, Card } from "@/components/ui/misc";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "", label: t("Aperçu"), icon: BarChart3, end: true },
  { to: "commandes", label: t("Commandes"), icon: Package },
  { to: "plats", label: t("Mes plats"), icon: UtensilsCrossed },
  { to: "ventes", label: t("Ventes"), icon: CalendarDays },
  { to: "paiements", label: t("Paiements"), icon: CreditCard },
  { to: "avis", label: t("Avis"), icon: MessageSquareQuote },
  { to: "parametres", label: t("Ma cuisine"), icon: Settings },
];

export default function CookLayout() {
  const { cook } = useAuth();
  const pending = useQuery({ queryKey: ["cook-orders", cook!.id, "paid"], queryFn: () => fetchCookOrders(cook!.id, ["paid"]), refetchInterval: 60_000 });
  useRealtime(`cook-orders-${cook!.id}`, "orders", `cook_id=eq.${cook!.id}`, [["cook-orders"], ["cook-dashboard"]]);
  const n = pending.data?.length ?? 0;

  return (
    <div className="container py-6">
      <Seo title={t("Ma cuisine — MAMI COOK")} noindex />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{t("Espace cuisinier")}</p>
          <h1 className="text-2xl font-extrabold">{cook!.kitchen_name}</h1>
        </div>
        <StatusBadge />
      </div>
      <StatusBanner />
      <nav className="scrollbar-hide -mx-1 mb-6 flex gap-1 overflow-x-auto px-1" aria-label={t("Espace cuisinier")}>
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold", isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>
            <Icon className="h-4 w-4" />{label}
            {to === "commandes" && n > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">{n}</span>}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

function StatusBadge() {
  const { cook } = useAuth();
  const map = { draft: ["Brouillon", "muted"], pending_review: [t("En cours de validation"), "warn"], approved: [t("Cuisine ouverte"), "success"], suspended: ["Suspendue", "danger"], rejected: [t("À compléter"), "danger"] } as const;
  const [label, tone] = map[cook!.status];
  return <Badge tone={tone} className="text-sm">{label}</Badge>;
}

function StatusBanner() {
  const { cook } = useAuth();
  if (cook!.status === "approved" && cook!.stripe_charges_enabled) return null;
  let msg: React.ReactNode;
  if (cook!.status === "pending_review") msg = "Votre candidature est en cours de vérification (48 h max). En attendant, préparez vos plats et connectez votre compte bancaire.";
  else if (cook!.status === "rejected") msg = <>{t("Candidature à compléter :")}{" "}{cook!.status_reason ?? t("contactez le support.")}</>;
  else if (cook!.status === "suspended") msg = <>{t("Cuisine suspendue :")}{" "}{cook!.status_reason ?? t("contactez le support.")}</>;
  else if (!cook!.stripe_charges_enabled) msg = <>{t("Dernière étape :")}{" "}<NavLink to="paiements" className="font-bold underline">{t("connectez votre compte bancaire")}</NavLink>{" "}{t("pour recevoir des commandes.")}</>;
  return <Card className="mb-5 flex items-start gap-3 border-status-warn/30 bg-status-warn/5 p-4 text-sm"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-warn" /><p>{msg}</p></Card>;
}
