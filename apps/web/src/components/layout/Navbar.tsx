import { t } from "@mami/shared";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Bell, Bike, ChefHat, Heart, LayoutDashboard, LogOut, MapPin, Package, Search, Shield, ShoppingBag, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useGeo } from "@/hooks/useGeo";
import { fetchNotifications } from "@/lib/api";
import { LocationDialog } from "@/components/LocationDialog";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, displayName, cook, courier, isStaff, signOut } = useAuth();
  const { count } = useCart();
  const geo = useGeo();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [locOpen, setLocOpen] = useState(false);
  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const notifs = useQuery({ queryKey: ["notifications", user?.id], queryFn: fetchNotifications, enabled: !!user, refetchInterval: 60_000 });
  const unread = (notifs.data ?? []).filter((n) => !n.read_at).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/explorer${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link to="/" className="shrink-0" aria-label={t("MAMI COOK — accueil")}>
          <img src={`${import.meta.env.BASE_URL}images/logo.svg`} alt={t("MAMI COOK")} className="h-8 w-auto sm:h-9" />
        </Link>

        <form onSubmit={submit} className="hidden md:flex flex-1 max-w-md mx-4" role="search">
          <label className="relative w-full">
            <span className="sr-only">{t("Chercher un plat")}</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder={t("Chercher un plat, une cuisine…")}
              className="w-full rounded-xl bg-muted py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </label>
        </form>

        <nav className="flex items-center gap-0.5" aria-label={t("Navigation principale")}>
          <button onClick={() => setLocOpen(true)} className="flex max-w-[160px] items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="hidden truncate sm:inline">{geo.label}</span>
          </button>
          <LanguageSwitcher compact className="hidden rounded-xl p-2.5 text-muted-foreground hover:bg-muted sm:inline-flex" />
          {user && (
            <Link to="/notifications" className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-muted" aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}>
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card" />}
            </Link>
          )}
          <Link to="/panier" className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-muted" aria-label={`Panier (${count})`}>
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full gradient-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>
            )}
          </Link>

          {user ? (
            <Dropdown.Root>
              <Dropdown.Trigger className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-muted" aria-label={t("Mon compte")}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
                  {displayName.slice(0, 1).toUpperCase() || "?"}
                </span>
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content align="end" sideOffset={8} className="z-50 min-w-[230px] rounded-2xl border border-border bg-popover p-1.5 shadow-xl">
                  <div className="px-3 py-2 text-sm"><p className="font-bold">{displayName}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
                  <Dropdown.Separator className="my-1 h-px bg-border" />
                  <MenuItem to="/mon-espace" icon={<LayoutDashboard />}>{t("Mon espace")}</MenuItem>
                  <MenuItem to="/commandes" icon={<Package />}>{t("Mes commandes")}</MenuItem>
                  <MenuItem to="/favoris" icon={<Heart />}>{t("Mes cuisines favorites")}</MenuItem>
                  <MenuItem to="/compte" icon={<User />}>{t("Mon compte")}</MenuItem>
                  <Dropdown.Separator className="my-1 h-px bg-border" />
                  {cook ? <MenuItem to="/cuisine/tableau-de-bord" icon={<ChefHat />}>{t("Ma cuisine")}</MenuItem>
                    : <MenuItem to="/devenir-cuisinier" icon={<ChefHat />}>{t("Devenir Mami Cook")}</MenuItem>}
                  {courier && courier.status !== "draft" ? <MenuItem to="/livreur" icon={<Bike />}>{t("Espace livreur")}</MenuItem>
                    : <MenuItem to="/devenir-livreur" icon={<Bike />}>{t("Devenir livreur")}</MenuItem>}
                  {isStaff && <MenuItem to="/admin" icon={<Shield />}>{t("Administration")}</MenuItem>}
                  <Dropdown.Separator className="my-1 h-px bg-border" />
                  <Dropdown.Item onSelect={() => signOut().then(() => navigate("/"))}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-muted [&_svg]:h-4 [&_svg]:w-4">
                    <LogOut />{" "}{t("Se déconnecter")}
                  </Dropdown.Item>
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          ) : (
            <NavLink to="/connexion" className={({ isActive }) => cn("ml-1 rounded-xl px-4 py-2 text-sm font-semibold", isActive ? "bg-muted" : "gradient-primary text-primary-foreground")}>
              {t("Connexion")}
            </NavLink>
          )}
        </nav>
      </div>
      <LocationDialog open={locOpen} onOpenChange={setLocOpen} />
    </header>
  );
}

function MenuItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Dropdown.Item asChild>
      <Link to={to} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground">
        {icon}{children}
      </Link>
    </Dropdown.Item>
  );
}
