import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Check, ChefHat, CircleCheck, Clock, Flag, MapPin, MessageCircle, Package, Receipt, Send, Store, X, Zap } from "lucide-react";
import { DELIVERY_STATUS_LABELS, formatDate, formatMoney, ORDER_STATUS_LABELS, relativeDay, type Order, t, intlLocale, VEHICLES } from "@mami/shared";
import { createReview, fetchDeliveryTracking, fetchMessages, fetchMyReviewForOrder, fetchOrder, fetchPickupAddress, orderAction, sendMessage } from "@/lib/api";
import { RouteMap } from "@/components/RouteMap";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { cn, errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Spinner, StarInput } from "@/components/ui/misc";
import { Input, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ReportDialog } from "@/components/ReportDialog";
import { Seo } from "@/components/Seo";

const STEPS: { status: Order["status"][]; label: string; icon: React.ReactNode }[] = [
  { status: ["paid"], label: t("Payée"), icon: <Check /> },
  { status: ["accepted", "preparing"], label: t("En cuisine"), icon: <ChefHat /> },
  { status: ["ready", "out_for_delivery"], label: t("Prête"), icon: <Package /> },
  { status: ["completed"], label: t("Remise"), icon: <CircleCheck /> },
];
const ORDER_FLOW: Order["status"][] = ["pending_payment", "paid", "accepted", "preparing", "ready", "out_for_delivery", "completed"];

export default function OrderPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id!),
    // Juste après le paiement, le webhook Stripe peut prendre quelques secondes.
    refetchInterval: (q) => (q.state.data?.status === "pending_payment" ? 2500 : false),
  });
  useRealtime(`order-${id}`, "orders", `id=eq.${id}`, [["order", id]]);
  const [reportOpen, setReportOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => { if (params.get("paye")) toast.success(t("Paiement reçu, merci ! 🎉")); }, [params]);

  const action = useMutation({
    mutationFn: (v: { to: string; note?: string }) => orderAction(id!, v.to, { note: v.note }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["order", id] }); toast.success(r.refunded ? t("Commande annulée — vous serez remboursé sous 5 à 10 jours") : t("C'est noté !")); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (order.isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  const o = order.data;
  if (!o) return <EmptyState icon="📦" title={t("Commande introuvable")} action={<Button asChild><Link to="/commandes">{t("Mes commandes")}</Link></Button>} />;
  const isCustomer = o.customer_id === user?.id;
  const idx = ORDER_FLOW.indexOf(o.status);
  const finished = ["cancelled", "refunded", "expired"].includes(o.status);
  const formatEuros = (c: number) => formatMoney(c, o.currency ?? "EUR");
  const modeIcon = o.fulfillment === "pickup" ? <Store className="h-3.5 w-3.5" /> : o.fulfillment === "courier" ? <Zap className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />;
  const modeLabel = o.fulfillment === "pickup" ? t("Retrait") : o.fulfillment === "courier" ? t("Livreur MAMI COOK") : t("Livraison");

  return (
    <div className="container max-w-4xl py-8">
      <Seo title={t("Commande n°{n}", { n: o.number }) + " — MAMI COOK"} noindex />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{t("Commande n°")}{o.number} · {formatDate(o.created_at, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
          <h1 className="text-3xl font-extrabold">{t(ORDER_STATUS_LABELS[o.status])}</h1>
          {o.cooks && <Link to={`/cuisine/${o.cooks.slug}`} className="text-sm font-semibold text-primary hover:underline">{o.cooks.kitchen_name}</Link>}
        </div>
        <Badge tone={finished ? "danger" : o.status === "completed" ? "success" : "primary"} className="text-sm">
          {modeIcon}
          {modeLabel} · {relativeDay(o.scheduled_for)}
        </Badge>
      </div>

      {o.status === "pending_payment" && (
        <Card className="mb-6 flex items-center gap-3 p-5"><Spinner className="h-6 w-6" /><p className="text-sm">{t("Confirmation du paiement en cours…")}</p></Card>
      )}

      {!finished && o.status !== "pending_payment" && (
        <Card className="mb-6 p-6">
          <ol className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const done = idx >= ORDER_FLOW.indexOf(s.status[0]);
              return (
                <li key={s.label} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={cn("flex h-10 w-10 items-center justify-center rounded-full [&_svg]:h-5 [&_svg]:w-5", done ? "gradient-primary text-white" : "bg-muted text-muted-foreground")}>{s.icon}</span>
                    <span className={cn("text-xs font-semibold", !done && "text-muted-foreground")}>{t(s.label)}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={cn("mx-2 mb-5 h-1 flex-1 rounded-full", idx >= ORDER_FLOW.indexOf(STEPS[i + 1].status[0]) ? "gradient-primary" : "bg-muted")} />}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {isCustomer && o.fulfillment === "pickup" && ["paid", "accepted", "preparing", "ready"].includes(o.status) && (
        <Card className="mb-6 border-primary/30 bg-primary/5 p-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground">{t("Code de retrait à donner à la cuisinière")}</p>
          <p className="mt-1 text-5xl font-extrabold tracking-[0.3em] tabular-nums">{o.pickup_code}</p>
          <PickupAddress orderId={o.id} status={o.status} />
        </Card>
      )}

      {o.fulfillment === "courier" && !finished && o.status !== "pending_payment" && <CourierTracking order={o} isCustomer={isCustomer} />}

      {o.cancel_reason && <Card className="mb-6 border-destructive/30 bg-destructive/5 p-4 text-sm"><b>{t("Motif :")}</b> {o.cancel_reason}</Card>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-bold">{t("Détail")}</h2>
          <ul className="space-y-2 text-sm">
            {o.order_items?.map((it) => (
              <li key={it.id} className="flex justify-between gap-2">
                <span><b>{it.quantity}×</b> {it.title}{it.extras.length > 0 && <span className="block text-xs text-muted-foreground">+ {it.extras.map((e) => e.name).join(", ")}</span>}</span>
                <span className="tabular-nums">{formatEuros(it.line_total_cents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            {o.discount_cents > 0 && <div className="flex justify-between text-status-hot"><dt>{t("Remise volume")}</dt><dd>−{formatEuros(o.discount_cents)}</dd></div>}
            {o.promo_cents > 0 && <div className="flex justify-between text-status-hot"><dt>{t("Code promo")}</dt><dd>−{formatEuros(o.promo_cents)}</dd></div>}
            {o.delivery_fee_cents > 0 && <div className="flex justify-between"><dt>{t("Livraison")}</dt><dd>{formatEuros(o.delivery_fee_cents)}</dd></div>}
            {(o.tip_cents ?? 0) > 0 && <div className="flex justify-between"><dt>{t("Pourboire livreur")}</dt><dd>{formatEuros(o.tip_cents!)}</dd></div>}
            <div className="flex justify-between text-base font-extrabold"><dt>{t("Total payé")}</dt><dd>{formatEuros(o.total_cents)}</dd></div>
          </dl>
          {o.delivery_address && <p className="mt-4 rounded-xl bg-muted p-3 text-sm"><MapPin className="mr-1 inline h-4 w-4" />{o.delivery_address.line1}, {o.delivery_address.postal_code} {o.delivery_address.city}</p>}
          {o.note && <p className="mt-3 rounded-xl bg-muted p-3 text-sm italic">« {o.note} »</p>}
        </Card>

        <ChatPanel orderId={o.id} disabled={o.status === "pending_payment" || o.status === "expired"} />
      </div>

      {isCustomer && (
        <div className="mt-6 flex flex-wrap gap-3">
          {(o.fulfillment === "courier" ? o.status === "out_for_delivery" : ["ready", "out_for_delivery"].includes(o.status)) && <Button onClick={() => action.mutate({ to: "completed" })} loading={action.isPending}><CircleCheck />{" "}{t("J'ai bien reçu ma commande")}</Button>}
          {["pending_payment", "paid"].includes(o.status) && <Button variant="outline" onClick={() => setCancelOpen(true)}><X />{" "}{t("Annuler la commande")}</Button>}
          {o.paid_at && <Button variant="ghost" asChild><Link to={`/commande/${o.id}/recu`}><Receipt />{t("Reçu")}</Link></Button>}
          <Button variant="ghost" onClick={() => setReportOpen(true)}><Flag />{" "}{t("Signaler un problème")}</Button>
        </div>
      )}
      {isCustomer && o.status === "completed" && <ReviewBox order={o} />}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen} title={t("Annuler la commande ?")} description={o.status === "paid" ? t("Vous serez remboursé intégralement.") : undefined}>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setCancelOpen(false)}>{t("Garder")}</Button>
          <Button variant="destructive" className="flex-1" loading={action.isPending} onClick={() => action.mutate({ to: "cancelled", note: t("Annulée par le client") }, { onSettled: () => setCancelOpen(false) })}>{t("Annuler")}</Button>
        </div>
      </Dialog>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="order" targetId={o.id} />
    </div>
  );
}

export function ChatPanel({ orderId, disabled }: { orderId: string; disabled?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const msgs = useQuery({ queryKey: ["messages", orderId], queryFn: () => fetchMessages(orderId) });
  useRealtime(`msg-${orderId}`, "messages", `order_id=eq.${orderId}`, [["messages", orderId]]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs.data]);
  const send = useMutation({
    mutationFn: () => sendMessage(orderId, user!.id, text.trim()),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["messages", orderId] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card className="flex h-[360px] flex-col p-5">
      <h2 className="mb-3 flex items-center gap-2 font-bold"><MessageCircle className="h-4 w-4" />{" "}{t("Messages")}</h2>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto pr-1">
        {(msgs.data ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("Une question ? Écrivez ici.")}</p>}
        {msgs.data?.map((m) => (
          <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.sender_id === user?.id ? "ml-auto gradient-primary text-white" : "bg-muted")}>
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <p className={cn("mt-0.5 text-[10px]", m.sender_id === user?.id ? "text-white/70" : "text-muted-foreground")}><Clock className="mr-0.5 inline h-2.5 w-2.5" />{new Date(m.created_at).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        ))}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={disabled ? t("Messagerie disponible après paiement") : t("Votre message…")} disabled={disabled} maxLength={2000} aria-label={t("Message")} />
        <Button size="icon" type="submit" disabled={disabled || !text.trim()} loading={send.isPending} aria-label={t("Envoyer")}><Send /></Button>
      </form>
    </Card>
  );
}

function ReviewBox({ order }: { order: Order }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ["review", order.id], queryFn: () => fetchMyReviewForOrder(order.id) });
  const [rating, setRating] = useState(0);
  const [courierRating, setCourierRating] = useState(0);
  const [comment, setComment] = useState("");
  const submit = useMutation({
    mutationFn: () => createReview({
      orderId: order.id, customerId: user!.id, cookId: order.cook_id, rating, comment, courierRating: courierRating || undefined,
      dishRatings: Object.fromEntries((order.order_items ?? []).map((i) => [i.dish_id, rating])),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["review", order.id] }); toast.success(t("Merci pour votre avis ! ⭐")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (existing.isLoading) return null;
  if (existing.data) return <Card className="mt-6 p-5 text-sm">{t("Vous avez noté cette commande")}{" "}{existing.data.rating}/5. Merci !</Card>;
  return (
    <Card className="mt-6 p-6">
      <h2 className="mb-1 text-lg font-bold">{t("Comment était votre repas ?")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("Votre avis aide la communauté et la cuisinière.")}</p>
      <StarInput value={rating} onChange={setRating} />
      {order.fulfillment === "courier" && (
        <div className="mt-4"><p className="mb-1 text-sm font-semibold">{t("Et la livraison ?")}</p><StarInput value={courierRating} onChange={setCourierRating} size={24} /></div>
      )}
      <Textarea className="mt-4" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder={t("Racontez-nous (facultatif)")} />
      <Button className="mt-4" disabled={!rating} loading={submit.isPending} onClick={() => submit.mutate()}>{t("Publier mon avis")}</Button>
    </Card>
  );
}

function PickupAddress({ orderId, status }: { orderId: string; status: Order["status"] }) {
  const accepted = ["accepted", "preparing", "ready"].includes(status);
  const q = useQuery({ queryKey: ["pickup", orderId, status], enabled: accepted, queryFn: () => fetchPickupAddress(orderId) });
  if (!accepted) return <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{" "}{t("L'adresse de retrait s'affiche dès que la cuisinière accepte la commande.")}</p>;
  if (!q.data?.line1) return null;
  const a = q.data;
  return (
    <div className="mt-4 rounded-xl bg-card p-3 text-sm">
      <p className="font-semibold"><MapPin className="mr-1 inline h-4 w-4" />{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.postal_code} {a.city}</p>
      <a className="mt-1 inline-block text-xs font-semibold text-primary" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/directions?to=${a.lat}%2C${a.lng}`}>{t("Itinéraire →")}</a>
    </div>
  );
}

function CourierTracking({ order, isCustomer }: { order: Order; isCustomer: boolean }) {
  const q = useQuery({ queryKey: ["tracking", order.id], queryFn: () => fetchDeliveryTracking(order.id), refetchInterval: 15_000 });
  const tr = q.data;
  if (!tr) return null;
  const c = tr.courier;
  const vehicle = VEHICLES.find((v) => v.id === c?.vehicle);
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Livraison")}</p>
          <p className="text-lg font-extrabold">{t(DELIVERY_STATUS_LABELS[tr.status])}</p>
          {c && <p className="text-sm text-muted-foreground">{vehicle?.emoji} {c.name}{c.rating_count > 0 && ` · ⭐ ${Number(c.rating).toFixed(1)}`}</p>}
        </div>
        {isCustomer && ["assigned", "at_pickup", "picked_up"].includes(tr.status) && (
          <div className="rounded-2xl bg-primary/10 px-4 py-2 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Code à donner au livreur")}</p>
            <p className="text-3xl font-extrabold tracking-[0.25em] tabular-nums">{order.pickup_code}</p>
          </div>
        )}
      </div>
      {c?.lat != null && c.lng != null && <RouteMap className="h-56 w-full z-0" points={[{ lat: c.lat, lng: c.lng, kind: "courier" }]} />}
    </Card>
  );
}
