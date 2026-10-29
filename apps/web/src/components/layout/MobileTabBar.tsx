import { t } from "@mami/shared";
import { NavLink } from "react-router-dom";
import { Compass, Home, Package, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: t("Accueil"), icon: Home, end: true },
  { to: "/explorer", label: t("Explorer"), icon: Compass },
  { to: "/panier", label: t("Panier"), icon: ShoppingBag },
  { to: "/commandes", label: t("Commandes"), icon: Package },
  { to: "/compte", label: t("Compte"), icon: User },
];

/** Barre d'onglets en bas d'écran sur mobile (navigation au pouce). */
export function MobileTabBar() {
  const { count } = useCart();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden" aria-label={t("Navigation mobile")}>
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={({ isActive }) => cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" />
              {label}
              {to === "/panier" && count > 0 && (
                <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full gradient-primary px-1 text-[9px] font-bold text-white">{count}</span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
