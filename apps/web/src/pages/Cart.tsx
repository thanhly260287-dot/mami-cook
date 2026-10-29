import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Lock, Plus, Store, Tag, Trash2, Zap } from "lucide-react";
import { formatMoney, MIN_ORDER_CENTS, relativeDay, t, TIP_PRESETS_CENTS } from "@mami/shared";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { checkout, fetchAddresses, fetchDeliveryQuote, type CheckoutResult } from "@/lib/api";
import { DEMO_MODE } from "@/lib/supabase";
import { cn, errorMessage, photoUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, QuantityStepper } from "@/components/ui/misc";
import { Input, Textarea } from "@/components/ui/input";
import { AddressDialog } from "@/components/AddressDialog";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Seo } from "@/components/Seo";

export default function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const first = cart.lines[0];
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery" | "courier">(first?.offersPickup === false ? (first?.offersCourier ? "courier" : "delivery") : "pickup");
  const [tip, setTip] = useState(0);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addrOpen, setAddrOpen] = useState(false);
  const [note, setNote] = useState("");
  const [promo, setPromo] = useState("");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<CheckoutResult | null>(null);

  const addresses = useQuery({ queryKey: ["addresses", user?.id], enabled: !!user && !DEMO_MODE, queryFn: fetchAddresses });
  const selectedAddress = addressId ?? addresses.data?.[0]?.id ?? null;
  const needsAddress = fulfillment !== "pickup";
  // Frais de livraison par livreur : calculés par le serveur selon la distance réelle.
  const quote = useQuery({
    queryKey: ["delivery-quote", first?.cookId, selectedAddress],
    enabled: !!first && !!selectedAddress && !DEMO_MODE && !!user,
    queryFn: () => fetchDeliveryQuote(first!.cookId, selectedAddress!),
  });
  const courierFee = quote.data?.courier?.fee_cents ?? 390;
  const cur = first?.currency ?? quote.data?.currency ?? "EUR";
  const money = (c: number) => formatMoney(c, cur);
  const price = cart.price({
    delivery: fulfillment === "delivery",
    deliveryFeeCents: fulfillment === "courier" ? courierFee : undefined,
    tipCents: fulfillment === "courier" ? tip : 0,
  });
  // Une clé par contenu de panier : un double clic ne crée pas deux commandes.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [cart.lines, fulfillment, selectedAddress, promo, tip]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!first) {
    return <EmptyState icon="🛍️" title={t("Votre panier est vide")} action={<Button asChild><Link to="/explorer">{t("Découvrir les plats")}</Link></Button>}>{t("Les plats faits maison de votre quartier vous attendent.")}</EmptyState>;
  }

  const pay = async () => {
    if (DEMO_MODE) return toast.info(t("Mode démo : le paiement sera actif une fois Supabase et Stripe configurés."));
    if (!user) return navigate("/connexion?redirect=/panier");
    if (needsAddress && !selectedAddress) return setAddrOpen(true);
    if (fulfillment === "courier" && quote.data && !quote.data.courier?.available) return toast.error(t("Adresse trop éloignée pour la livraison par livreur"));
    setLoading(true);
    try {
      const res = await checkout({
        lines: cart.lines.map((l) => ({ drop_id: l.dropId, quantity: l.quantity, extra_ids: l.extras.map((e) => e.id), menu_deal_id: l.menuDeal?.id ?? null })),
        fulfillment, address_id: needsAddress ? selectedAddress : null, tip_cents: fulfillment === "courier" ? tip : 0,
        note: note.trim() || undefined, promo_code: promo.trim() || undefined, idempotency_key: idempotencyKey,
      });
      if (res.client_secret) setPayment(res);
      else navigate(`/commande/${res.order_id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      qc.invalidateQueries({ queryKey: ["feed"] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl py-8">
      <Seo title={t("Mon panier — MAMI COOK")} noindex />
      <h1 className="mb-1 text-3xl font-extrabold">{t("Mon panier")}</h1>
      <p className="mb-6 text-muted-foreground">
        <Link to={`/cuisine/${first.cookSlug}`} className="font-semibold text-foreground hover:underline">{first.cookName}</Link> · {relativeDay(first.availableOn)}
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card className="divide-y divide-border">
            {cart.lines.map((l) => (
              <div key={l.key} className="flex gap-4 p-4">
                <img src={photoUrl(l.photo)} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{l.title}</p>
                  {l.extras.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">+ {l.extras.map((e) => e.name).join(", ")}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <QuantityStepper value={l.quantity} onChange={(q) => cart.setQuantity(l.key, q)} max={l.maxQuantity} />
                    <button onClick={() => cart.remove(l.key)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Retirer ${l.title}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-bold">{t("Mode de remise")}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <ModeButton active={fulfillment === "pickup"} disabled={!first.offersPickup} onClick={() => setFulfillment("pickup")} icon={<Store />} title={t("Retrait")} sub={t("Gratuit · adresse communiquée après paiement")} />
              <ModeButton active={fulfillment === "courier"} disabled={!first.offersCourier} onClick={() => setFulfillment("courier")} icon={<Zap />} title={t("Livreur MAMI COOK")} sub={first.offersCourier ? (quote.data ? money(courierFee) : t("Selon la distance")) + " · " + t("suivi en direct") : t("Non proposée")} />
              <ModeButton active={fulfillment === "delivery"} disabled={!first.offersDelivery} onClick={() => setFulfillment("delivery")} icon={<Bike />} title={t("Livrée par la cuisinière")} sub={first.offersDelivery ? (first.deliveryFeeCents ? money(first.deliveryFeeCents) : t("Offerte")) : t("Non proposée")} />
            </div>
            {fulfillment === "courier" && quote.data && !quote.data.courier?.available && (
              <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{t("Cette adresse est trop éloignée pour un livreur. Choisissez le retrait ou une autre adresse.")}</p>
            )}
            {needsAddress && (
              <div className="mt-4 space-y-2">
                {(addresses.data ?? []).map((a) => (
                  <label key={a.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3", selectedAddress === a.id ? "border-primary bg-primary/5" : "border-border")}>
                    <input type="radio" name="address" checked={selectedAddress === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-[hsl(var(--primary))]" />
                    <span className="text-sm"><span className="font-semibold">{a.label}</span><br />{a.line1}, {a.postal_code} {a.city}</span>
                  </label>
                ))}
                <Button variant="ghost" size="sm" onClick={() => user ? setAddrOpen(true) : navigate("/connexion?redirect=/panier")}><Plus />{" "}{t("Ajouter une adresse")}</Button>
              </div>
            )}
          </Card>

          {fulfillment === "courier" && (
            <Card className="p-5">
              <h2 className="mb-1 font-bold">{t("Pourboire pour le livreur")}</h2>
              <p className="mb-3 text-sm text-muted-foreground">{t("100 % du pourboire est reversé au livreur.")}</p>
              <div className="flex flex-wrap gap-2">
                {TIP_PRESETS_CENTS.map((c) => (
                  <button key={c} type="button" onClick={() => setTip(c)} aria-pressed={tip === c}
                    className={cn("rounded-xl border-2 px-4 py-2 text-sm font-semibold", tip === c ? "border-primary bg-primary/5" : "border-border")}>
                    {c === 0 ? t("Pas cette fois") : money(c)}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <label htmlFor="note" className="mb-2 block font-bold">{t("Un mot pour la cuisinière ?")}</label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t("Ex : sans coriandre svp, je passe vers 19h…")} />
          </Card>
        </div>

        <div>
          <Card className="sticky top-24 p-5">
            <h2 className="mb-4 font-bold">{t("Récapitulatif")}</h2>
            <dl className="space-y-2 text-sm">
              <Row label={t(price.totalPlates > 1 ? "Sous-total ({n} plats)" : "Sous-total ({n} plat)", { n: price.totalPlates })} value={money(price.subtotalCents)} />
              {price.discountCents > 0 && <Row label={t("Remise volume")} value={`−${money(price.discountCents)}`} tone="success" />}
              {fulfillment !== "pickup" && <Row label={t("Livraison")} value={price.deliveryFeeCents ? money(price.deliveryFeeCents) : t("Offerte")} />}
              {price.tipCents > 0 && <Row label={t("Pourboire livreur")} value={money(price.tipCents)} />}
              <div className="flex items-center justify-between border-t border-border pt-3 text-base font-extrabold"><dt>{t("Total")}</dt><dd className="tabular-nums">{money(price.totalCents)}</dd></div>
            </dl>
            {price.totalPlates < 5 && <p className="mt-3 rounded-xl bg-status-hot/10 p-2.5 text-xs font-medium text-status-hot">{t(5 - price.totalPlates > 1 ? "Plus que {n} plats pour profiter de −10 % !" : "Plus que {n} plat pour profiter de −10 % !", { n: 5 - price.totalPlates })}</p>}
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder={t("Code promo")} className="pl-9" maxLength={30} aria-label={t("Code promo")} />
              </div>
            </div>
            {promo && <p className="mt-1 text-xs text-muted-foreground">{t("Le code sera vérifié au paiement.")}</p>}
            <Button size="lg" className="mt-4 w-full" loading={loading} onClick={pay} disabled={price.subtotalCents - price.discountCents < MIN_ORDER_CENTS}>
              <Lock />{" "}{t("Payer")}{" "}{money(price.totalCents)}
            </Button>
            {price.subtotalCents - price.discountCents < MIN_ORDER_CENTS && <p className="mt-2 text-center text-xs text-destructive">{t("Minimum de commande :")}{" "}{money(MIN_ORDER_CENTS)}</p>}
            <p className="mt-3 text-center text-xs text-muted-foreground">{t("Paiement sécurisé par Stripe · Carte, Apple Pay, Google Pay")}</p>
          </Card>
        </div>
      </div>

      {user && <AddressDialog open={addrOpen} onOpenChange={setAddrOpen} onCreated={(a) => { setAddressId(a.id); qc.invalidateQueries({ queryKey: ["addresses"] }); }} />}
      {payment && (
        <PaymentDialog result={payment} onClose={() => setPayment(null)} onPaid={() => { cart.clear(); navigate(`/commande/${payment.order_id}?paye=1`); }} />
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return <div className={cn("flex items-center justify-between", tone === "success" && "text-status-hot font-semibold")}><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>;
}

function ModeButton({ active, disabled, onClick, icon, title, sub }: { active: boolean; disabled: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={active}
      className={cn("rounded-xl border-2 p-3 text-left transition-colors disabled:opacity-40 [&_svg]:mb-1 [&_svg]:h-5 [&_svg]:w-5", active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
      {icon}<p className="font-bold">{title}</p><p className="text-xs text-muted-foreground">{sub}</p>
    </button>
  );
}
