import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Bike, Check, Clock, Flag, Flame, MapPin, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { ALLERGENS, DIETS, cuisineLabel, customerPrice, formatDistance, formatMoney, formatTime, relativeDay, t } from "@mami/shared";
import { fetchDrop } from "@/lib/api";
import { useCart } from "@/hooks/useCart";
import { useGeo } from "@/hooks/useGeo";
import { photoUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, QuantityStepper, Spinner, Stars } from "@/components/ui/misc";
import { ReportDialog } from "@/components/ReportDialog";
import { Seo } from "@/components/Seo";

export default function DishPage() {
  const { dropId } = useParams();
  const geo = useGeo();
  const navigate = useNavigate();
  const cart = useCart();
  const { data: item, isLoading } = useQuery({ queryKey: ["drop", dropId], queryFn: () => fetchDrop(dropId!, geo) });
  const [qty, setQty] = useState(1);
  const [extras, setExtras] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!item) return <EmptyState icon="🍽️" title={t("Ce plat n'est plus disponible")} action={<Button asChild><Link to="/explorer">{t("Voir les autres plats")}</Link></Button>} />;

  const soldOut = item.quantity_remaining === 0;
  const unitCook = (menu && item.menu_deal ? item.menu_deal.price_cents : item.price_cents)
    + item.extras.filter((e) => extras.includes(e.id)).reduce((s, e) => s + e.price_cents, 0);
  const total = customerPrice(unitCook) * qty;

  const add = () => {
    const { replaced } = cart.add(item, { quantity: qty, extraIds: extras, menuDeal: menu });
    toast.success(t("{qty} × {title} ajouté au panier", { qty, title: item.title }), {
      description: replaced ? t("Votre panier contenait des plats d'une autre cuisine ou d'un autre jour : il a été vidé.") : undefined,
      action: { label: t("Voir le panier"), onClick: () => navigate("/panier") },
    });
  };

  return (
    <div className="container max-w-6xl py-6">
      <Seo title={`${item.title} — ${item.cook_name} | MAMI COOK`} description={item.description ?? undefined} path={`/plat/${item.drop_id}`} image={photoUrl(item.photos[0])}
        jsonLd={{ "@context": "https://schema.org", "@type": "Product", name: item.title, image: photoUrl(item.photos[0]), description: item.description,
          offers: { "@type": "Offer", price: (item.customer_price_cents / 100).toFixed(2), priceCurrency: "EUR", availability: soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock" },
          aggregateRating: item.dish_rating_count ? { "@type": "AggregateRating", ratingValue: item.dish_rating, reviewCount: item.dish_rating_count } : undefined }} />
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{" "}{t("Retour")}</button>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-muted">
            <img src={photoUrl(item.photos[0])} alt={item.title} className={cn("h-full w-full object-cover", soldOut && "grayscale")} />
          </div>
          {item.photos.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {item.photos.slice(1, 5).map((p) => <img key={p} src={photoUrl(p)} alt="" className="aspect-square rounded-xl object-cover" loading="lazy" />)}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge>{cuisineLabel(item.cuisine)}</Badge>
            <Badge tone={item.temperature === "frozen" ? "primary" : "success"}><Flame className="h-3 w-3" />{{ hot: t("Servi chaud"), reheat: t("À réchauffer"), cold: t("Servi froid"), frozen: t("Congelé") }[item.temperature]}</Badge>
            {item.diets.map((d) => { const x = DIETS.find((y) => y.id === d); return x ? <Badge key={d} tone="accent">{x.emoji} {t(x.label)}</Badge> : null; })}
            {item.spice_level > 0 && <Badge tone="danger">{"🌶️".repeat(item.spice_level)}{" "}{t("Épicé")}</Badge>}
          </div>
          <h1 className="text-3xl font-extrabold md:text-4xl">{item.title}</h1>
          <Link to={`/cuisine/${item.cook_slug}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold hover:underline">
            <span className="flex h-7 w-7 items-center justify-center rounded-full gradient-primary text-xs text-white">{item.cook_name.replace(/^Chez /, "").slice(0, 1)}</span>
            {item.cook_name} <Stars value={item.cook_rating} size={12} /> <span className="text-muted-foreground">({item.cook_rating_count})</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground" title={item.is_professional ? t("Vendeur professionnel : vous bénéficiez des droits des consommateurs.") : t("Vendeur particulier : les règles de protection des consommateurs ne s'appliquent pas à la vente, mais le support MAMI COOK vous aide en cas de problème.")}>
              {item.is_professional ? t("Pro") : t("Particulier")}
            </span>
          </Link>
          {item.description && <p className="mt-4 leading-relaxed text-muted-foreground">{item.description}</p>}

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Info icon={<Clock />} label={`${relativeDay(item.available_on)}, ${formatTime(item.ready_from)}–${formatTime(item.ready_until)}`} />
            {item.distance_m != null && <Info icon={<MapPin />} label={`À ${formatDistance(item.distance_m)}`} />}
            {item.offers_pickup && <Info icon={<Store />} label={t("Retrait sur place")} />}
            {item.offers_courier && <Info icon={<Bike />} label={t("Livreur MAMI COOK disponible")} />}
            {item.offers_delivery && <Info icon={<Bike />} label={item.delivery_fee_cents ? t("Livraison {price}", { price: formatMoney(item.delivery_fee_cents, item.currency) }) : t("Livraison offerte")} />}
            {item.portion_grams && <Info icon={<UtensilsCrossed />} label={t("Portion ~{g} g", { g: item.portion_grams })} />}
          </div>

          <div className="mt-5 rounded-2xl border border-status-warn/30 bg-status-warn/5 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold"><AlertTriangle className="h-4 w-4 text-status-warn" />{" "}{t("Allergènes")}</p>
            {item.allergens.length ? (
              <div className="flex flex-wrap gap-1.5">{item.allergens.map((a) => <Badge key={a} tone="warn">{t(ALLERGENS.find((x) => x.id === a)?.label ?? a)}</Badge>)}</div>
            ) : <p className="text-sm text-muted-foreground">{t("Aucun des 14 allergènes réglementaires déclaré.")}</p>}
            <p className="mt-2 text-xs text-muted-foreground">{t("Préparé dans une cuisine familiale : des traces d'autres allergènes sont possibles. En cas d'allergie sévère, contactez la cuisinière avant de commander.")}</p>
          </div>

          {item.menu_deal && (
            <button onClick={() => setMenu(!menu)} className={cn("mt-5 flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-colors", menu ? "border-accent bg-accent/5" : "border-border hover:border-accent/50")}>
              <div>
                <p className="flex items-center gap-1.5 font-bold text-accent"><UtensilsCrossed className="h-4 w-4" />{item.menu_deal.name}</p>
                <p className="text-sm text-muted-foreground">{item.menu_deal.items}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold tabular-nums text-accent">{formatMoney(item.menu_deal.customer_price_cents, item.currency)}</span>
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border-2", menu ? "border-accent bg-accent text-white" : "border-border")}>{menu && <Check className="h-4 w-4" />}</span>
              </div>
            </button>
          )}

          {item.extras.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold">{t("Suppléments")}</p>
              <div className="space-y-2">
                {item.extras.map((e) => {
                  const on = extras.includes(e.id);
                  return (
                    <label key={e.id} className={cn("flex cursor-pointer items-center justify-between rounded-xl border p-3", on ? "border-primary bg-primary/5" : "border-border")}>
                      <span className="flex items-center gap-2 text-sm"><input type="checkbox" checked={on} onChange={() => setExtras(on ? extras.filter((x) => x !== e.id) : [...extras, e.id])} className="h-4 w-4 accent-[hsl(var(--primary))]" />{e.emoji} {e.name}</span>
                      <span className="text-sm font-semibold tabular-nums">+{formatMoney(e.customer_price_cents, item.currency)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="sticky bottom-20 z-20 mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur md:bottom-4">
            <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, Math.min(item.quantity_remaining, 20))} />
            <Button size="lg" className="flex-1" disabled={soldOut} onClick={add}>
              <ShoppingBag /> {soldOut ? t("Épuisé") : t("Ajouter · {price}", { price: formatMoney(total, item.currency) })}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t(item.quantity_remaining > 1 ? "{n} portions restantes sur {total}" : "{n} portion restante sur {total}", { n: item.quantity_remaining, total: item.quantity_total })} {t("· −10 % dès 5 plats")}</p>
          <button onClick={() => setReportOpen(true)} className="mx-auto mt-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Flag className="h-3 w-3" />{" "}{t("Signaler ce plat")}</button>
        </div>
      </div>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="dish" targetId={item.dish_id} />
    </div>
  );
}

function Info({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground">{icon}<span className="font-medium">{label}</span></div>;
}
