import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Check, ChefHat, MessageCircle, Package, Store, X } from "lucide-react";
import { formatEuros, ORDER_STATUS_LABELS, relativeDay, type Order, t, intlLocale } from "@mami/shared";
import { fetchCookOrders, orderAction } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { ChatPanel } from "@/pages/Order";

const GROUPS = {
  todo: { label: t("À accepter"), statuses: ["paid"] },
  active: { label: t("En cours"), statuses: ["accepted", "preparing", "ready", "out_for_delivery"] },
  done: { label: t("Historique"), statuses: ["completed", "cancelled", "refunded"] },
} as const;

type CookOrder = Order & { customer: { display_name: string } | null };

export default function CookOrders() {
  const { cook } = useAuth();
  const [group, setGroup] = useState<keyof typeof GROUPS>("todo");
  const q = useQuery({ queryKey: ["cook-orders", cook!.id, group], queryFn: () => fetchCookOrders(cook!.id, [...GROUPS[group].statuses]) });

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((g) => (
          <button key={g} onClick={() => setGroup(g)} className={cn("rounded-xl px-4 py-2 text-sm font-semibold", group === g ? "gradient-primary text-white" : "bg-muted")}>{GROUPS[g].label}</button>
        ))}
      </div>
      {q.isLoading ? <Spinner /> : !q.data?.length ? (
        <EmptyState icon={group === "todo" ? "🎉" : "📭"} title={group === "todo" ? t("Aucune commande en attente") : t("Rien ici pour l'instant")}>
          {group === "todo" && t("Vous serez notifié dès qu'une nouvelle commande arrive.")}
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{q.data.map((o) => <OrderCard key={o.id} order={o} />)}</div>
      )}
    </div>
  );
}

function OrderCard({ order: o }: { order: CookOrder }) {
  const qc = useQueryClient();
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");
  const act = useMutation({
    mutationFn: (v: { to: string; note?: string; pickup_code?: string }) => orderAction(o.id, v.to, v),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["cook-orders"] });
      qc.invalidateQueries({ queryKey: ["cook-dashboard"] });
      setRefuseOpen(false); setCodeOpen(false);
      toast.success(v.to === "cancelled" ? t("Commande refusée, le client est remboursé") : t("Commande n°{n} : {status}", { n: o.number, status: t(ORDER_STATUS_LABELS[v.to as Order["status"]]).toLowerCase() }));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const next: Record<string, { to: string; label: string; icon: React.ReactNode } | null> = {
    paid: { to: "accepted", label: t("Accepter"), icon: <Check /> },
    accepted: { to: "preparing", label: t("Commencer la préparation"), icon: <ChefHat /> },
    preparing: { to: "ready", label: t("Commande prête"), icon: <Package /> },
    ready: o.fulfillment === "delivery" ? { to: "out_for_delivery", label: t("Partir en livraison"), icon: <Bike /> } : null,
    out_for_delivery: { to: "completed", label: t("Livrée"), icon: <Check /> },
  };
  const n = next[o.status];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold">n°{o.number} · {o.customer?.display_name ?? t("Client")}</p>
          <p className="text-sm text-muted-foreground">{relativeDay(o.scheduled_for)} · {new Date(o.paid_at ?? o.created_at).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone="primary">{o.fulfillment === "pickup" ? <><Store className="h-3 w-3" />{" "}{t("Retrait")}</> : <><Bike className="h-3 w-3" />{" "}{t("Livraison")}</>}</Badge>
          <Badge tone={o.status === "completed" ? "success" : ["cancelled", "refunded"].includes(o.status) ? "danger" : "muted"}>{t(ORDER_STATUS_LABELS[o.status])}</Badge>
        </div>
      </div>
      <ul className="my-4 space-y-1 text-sm">
        {o.order_items?.map((i) => <li key={i.id}><b>{i.quantity}×</b> {i.title}{i.extras.length > 0 && <span className="text-muted-foreground"> (+ {i.extras.map((e) => e.name).join(", ")})</span>}</li>)}
      </ul>
      {o.note && <p className="mb-3 rounded-xl bg-status-warn/10 p-3 text-sm">📝 « {o.note} »</p>}
      {o.delivery_address && <p className="mb-3 rounded-xl bg-muted p-3 text-sm">📍 {o.delivery_address.line1}{o.delivery_address.line2 ? `, ${o.delivery_address.line2}` : ""}, {o.delivery_address.postal_code} {o.delivery_address.city}{o.delivery_address.instructions ? ` — ${o.delivery_address.instructions}` : ""}</p>}
      <p className="mb-4 text-sm">{t("Vous recevrez")}{" "}<b>{formatEuros(o.cook_payout_cents)}</b></p>
      <div className="flex flex-wrap gap-2">
        {n && <Button onClick={() => act.mutate({ to: n.to })} loading={act.isPending}>{n.icon}{n.label}</Button>}
        {o.status === "ready" && o.fulfillment === "pickup" && <Button onClick={() => setCodeOpen(true)}><Check />{" "}{t("Remise au client")}</Button>}
        {["paid", "accepted", "preparing"].includes(o.status) && <Button variant="outline" onClick={() => setRefuseOpen(true)}><X /> {o.status === "paid" ? t("Refuser") : t("Annuler")}</Button>}
        {!["pending_payment", "expired"].includes(o.status) && <Button variant="ghost" onClick={() => setChatOpen(true)}><MessageCircle />{" "}{t("Message")}</Button>}
      </div>

      <Dialog open={refuseOpen} onOpenChange={setRefuseOpen} title={t("Refuser la commande")} description={t("Le client sera remboursé intégralement.")}>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("Motif (ex : plus de stock, imprévu…)")} maxLength={500} />
        <Button variant="destructive" className="mt-4 w-full" loading={act.isPending} onClick={() => act.mutate({ to: "cancelled", note: reason || t("Refusée par la cuisine") })}>{t("Confirmer")}</Button>
      </Dialog>
      <Dialog open={codeOpen} onOpenChange={setCodeOpen} title={t("Code de retrait")} description={t("Demandez au client son code à 4 chiffres (visible dans son appli).")}>
        <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" className="text-center text-3xl tracking-[0.5em]" placeholder="0000" autoFocus />
        <Button className="mt-4 w-full" disabled={code.length !== 4} loading={act.isPending} onClick={() => act.mutate({ to: "completed", pickup_code: code })}>{t("Valider la remise")}</Button>
      </Dialog>
      <Dialog open={chatOpen} onOpenChange={setChatOpen} title={t("Commande n°{n}", { n: o.number })}>
        <ChatPanel orderId={o.id} />
      </Dialog>
    </Card>
  );
}
