// Tableau de bord personnel : chacun voit ses chiffres (client) et accède à ses espaces
// (cuisinière, livreur, équipe) depuis un seul endroit.
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bike, ChefHat, Heart, Package, PiggyBank, Shield, Star, UtensilsCrossed } from "lucide-react";
import { cuisineLabel, formatMoney, t } from "@mami/shared";
import { fetchCustomerDashboard } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge, Card, Spinner } from "@/components/ui/misc";
import { Seo } from "@/components/Seo";

export default function MySpace() {
  const { displayName, cook, courier, isStaff } = useAuth();
  const q = useQuery({ queryKey: ["customer-dashboard"], queryFn: fetchCustomerDashboard });
  const d = q.data;
  const max = Math.max(1, ...(d?.monthly ?? []).map((m) => m.orders));

  return (
    <div className="container max-w-5xl py-8">
      <Seo title={t("Mon espace — MAMI COOK")} noindex />
      <h1 className="text-3xl font-extrabold">{t("Bonjour {name} 👋", { name: displayName })}</h1>
      <p className="text-muted-foreground">{t("Votre tableau de bord personnel")}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Space to="/commandes" icon={<Package />} title={t("Mes commandes")} sub={d?.active ? t("{n} en cours", { n: d.active }) : t("Historique et suivi")} />
        {cook
          ? <Space to="/cuisine/tableau-de-bord" icon={<ChefHat />} title={t("Ma cuisine")} sub={cook.kitchen_name} accent />
          : <Space to="/devenir-cuisinier" icon={<ChefHat />} title={t("Vendre mes plats")} sub={t("Plats, desserts, pâtisseries…")} />}
        {courier && courier.status !== "draft"
          ? <Space to="/livreur" icon={<Bike />} title={t("Espace livreur")} sub={courier.is_online ? t("En ligne") : t("Hors ligne")} accent />
          : <Space to="/devenir-livreur" icon={<Bike />} title={t("Devenir livreur")} sub={t("Gagnez en livrant près de chez vous")} />}
        {isStaff && <Space to="/admin" icon={<Shield />} title={t("Administration")} sub={t("Équipe MAMI COOK")} accent />}
      </div>

      <h2 className="mb-3 mt-10 text-xl font-bold">{t("Mes statistiques")}</h2>
      {q.isLoading ? <Spinner /> : !d ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={<Package />} label={t("Commandes")} value={String(d.orders)} />
            <Kpi icon={<UtensilsCrossed />} label={t("Plats dégustés")} value={String(d.plates)} />
            <Kpi icon={<PiggyBank />} label={t("Économisé")} value={formatMoney(d.saved_cents, d.spent[0]?.currency ?? "EUR")} hint={t("remises et codes promo")} />
            <Kpi icon={<Heart />} label={t("Cuisines favorites")} value={String(d.favorites)} />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 font-bold">{t("Vos goûts")}</h3>
              {d.top_cuisines.length === 0 ? <p className="text-sm text-muted-foreground">{t("Commandez pour découvrir vos préférences !")}</p>
                : <div className="flex flex-wrap gap-2">{d.top_cuisines.map((c) => <Badge key={c.cuisine} tone="primary" className="text-sm">{cuisineLabel(c.cuisine)} · {c.n}</Badge>)}</div>}
              {d.top_cooks.length > 0 && (
                <>
                  <h3 className="mb-2 mt-5 font-bold">{t("Vos cuisines préférées")}</h3>
                  <ul className="space-y-1 text-sm">{d.top_cooks.map((c) => <li key={c.slug}><Link className="font-semibold text-primary" to={`/cuisine/${c.slug}`}>{c.kitchen_name}</Link> · {t("{n} commandes", { n: c.n })}</li>)}</ul>
                </>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-bold">{t("Commandes par mois")}</h3>
              {d.monthly.length === 0 ? <p className="text-sm text-muted-foreground">{t("Pas encore de commande terminée.")}</p> : (
                <div className="flex h-36 items-end gap-2">{d.monthly.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t gradient-primary" style={{ height: `${(m.orders / max) * 100}%` }} title={`${m.month} : ${m.orders}`} />
                    <span className="text-[10px] text-muted-foreground">{m.month.slice(5)}</span>
                  </div>
                ))}</div>
              )}
              <p className="mt-4 text-sm text-muted-foreground"><Star className="mr-1 inline h-4 w-4" />{t("{n} avis publiés", { n: d.reviews })}{d.tips_cents > 0 && <> · 🎁 {t("{tip} de pourboires offerts", { tip: formatMoney(d.tips_cents, d.spent[0]?.currency ?? "EUR") })}</>}</p>
            </Card>
          </div>
        </>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild><Link to="/explorer">{t("Commander")}</Link></Button>
        <Button variant="outline" asChild><Link to="/compte">{t("Paramètres du compte")}</Link></Button>
      </div>
    </div>
  );
}

function Space({ to, icon, title, sub, accent }: { to: string; icon: React.ReactNode; title: string; sub: string; accent?: boolean }) {
  return (
    <Link to={to}>
      <Card className={`flex h-full items-center gap-3 p-4 transition-colors hover:bg-muted/50 ${accent ? "border-primary/40" : ""}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
        <span><span className="block font-bold">{title}</span><span className="block text-xs text-muted-foreground">{sub}</span></span>
      </Card>
    </Link>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 text-primary [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
