import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { fetchNotifications, markNotificationsRead } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { Card, EmptyState, Spinner } from "@/components/ui/misc";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications", user?.id], queryFn: fetchNotifications });
  useRealtime(`notif-${user?.id}`, "notifications", `user_id=eq.${user?.id}`, [["notifications", user?.id]]);
  useEffect(() => {
    if (q.data?.some((n) => !n.read_at)) {
      const t = setTimeout(() => markNotificationsRead(user!.id).then(() => qc.invalidateQueries({ queryKey: ["notifications"] })), 1500);
      return () => clearTimeout(t);
    }
  }, [q.data, user, qc]);

  return (
    <div className="container max-w-2xl py-8">
      <Seo title="Notifications — MAMI COOK" noindex />
      <h1 className="mb-6 text-3xl font-extrabold">Notifications</h1>
      {q.isLoading ? <Spinner /> : !q.data?.length ? <EmptyState icon="🔔" title="Rien de nouveau" /> : (
        <div className="space-y-2">
          {q.data.map((n) => {
            const orderId = typeof n.data.order_id === "string" ? n.data.order_id : null;
            const body = (
              <Card className={cn("flex gap-3 p-4", !n.read_at && "border-primary/40 bg-primary/5")}>
                <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
              </Card>
            );
            const to = orderId ? (n.type === "order_new" ? `/cuisine/tableau-de-bord/commandes` : `/commande/${orderId}`) : n.type === "cook_review" ? "/cuisine/tableau-de-bord" : null;
            return to ? <Link key={n.id} to={to} className="block">{body}</Link> : <div key={n.id}>{body}</div>;
          })}
        </div>
      )}
    </div>
  );
}
