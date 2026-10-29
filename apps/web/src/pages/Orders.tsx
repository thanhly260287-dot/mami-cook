import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { formatDate, formatEuros, ORDER_STATUS_LABELS, t } from "@mami/shared";
import { fetchMyOrders } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";

const ACTIVE = ["pending_payment", "paid", "accepted", "preparing", "ready", "out_for_delivery"];

export default function Orders() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["my-orders", user?.id], queryFn: fetchMyOrders });
  if (q.isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  const orders = q.data ?? [];
  return (
    <div className="container max-w-3xl py-8">
      <Seo title={t("Mes commandes — MAMI COOK")} noindex />
      <h1 className="mb-6 text-3xl font-extrabold">{t("Mes commandes")}</h1>
      {orders.length === 0 ? (
        <EmptyState icon="📦" title={t("Aucune commande pour l'instant")} action={<Button asChild><Link to="/explorer">{t("Commander mon premier plat")}</Link></Button>} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} to={`/commande/${o.id}`}>
              <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{o.cooks?.kitchen_name}</p>
                    <Badge tone={ACTIVE.includes(o.status) ? "primary" : o.status === "completed" ? "success" : "danger"}>{t(ORDER_STATUS_LABELS[o.status])}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{o.order_items?.map((i) => `${i.quantity}× ${i.title}`).join(", ")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">n°{o.number} · {formatDate(o.created_at, { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2"><span className="font-bold tabular-nums">{formatEuros(o.total_cents)}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
