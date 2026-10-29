import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ShieldAlert, UserCheck, X } from "lucide-react";
import { cuisineLabel, REPORT_REASONS, t, intlLocale } from "@mami/shared";
import { fetchPendingCooks, fetchReports } from "@/lib/api";
import { requireSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cn, errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/input";
import { Seo } from "@/components/Seo";

export default function Admin() {
  const [tab, setTab] = useState<"cooks" | "reports">("cooks");
  return (
    <div className="container py-8">
      <Seo title={t("Administration — MAMI COOK")} noindex />
      <h1 className="mb-6 text-3xl font-extrabold">{t("Administration")}</h1>
      <div className="mb-6 flex gap-2">
        <button onClick={() => setTab("cooks")} className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold", tab === "cooks" ? "gradient-primary text-white" : "bg-muted")}><UserCheck className="h-4 w-4" />{" "}{t("Candidatures")}</button>
        <button onClick={() => setTab("reports")} className={cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold", tab === "reports" ? "gradient-primary text-white" : "bg-muted")}><ShieldAlert className="h-4 w-4" />{" "}{t("Signalements")}</button>
      </div>
      {tab === "cooks" ? <Applications /> : <Reports />}
    </div>
  );
}

function Applications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-cooks"], queryFn: fetchPendingCooks });
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const decide = useMutation({
    mutationFn: async (v: { id: string; approve: boolean }) => {
      const r = await requireSupabase().rpc("review_cook_application", { _cook_id: v.id, _approve: v.approve, _reason: reasons[v.id] || null });
      if (r.error) throw r.error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["admin-cooks"] }); toast.success(v.approve ? t("Cuisine validée") : t("Candidature refusée")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.isLoading) return <Spinner />;
  if (!q.data?.length) return <EmptyState icon="✅" title={t("Aucune candidature en attente")} />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {q.data.map((c) => {
        const priv = c.cook_private as { siret: string | null; addresses: { line1: string; postal_code: string; city: string } | null } | null;
        return (
          <Card key={c.id} className="p-5">
            <div className="flex justify-between"><p className="text-lg font-bold">{c.kitchen_name}</p><Badge tone="warn">{t("À valider")}</Badge></div>
            <p className="text-sm text-muted-foreground">{c.cuisines.map(cuisineLabel).join(" · ")}</p>
            {c.bio && <p className="mt-2 text-sm">{c.bio}</p>}
            <dl className="mt-3 space-y-1 text-sm">
              <div><dt className="inline font-semibold">{t("Adresse :")}{" "}</dt><dd className="inline">{priv?.addresses ? `${priv.addresses.line1}, ${priv.addresses.postal_code} ${priv.addresses.city}` : "—"}</dd></div>
              <div><dt className="inline font-semibold">{t("SIRET :")}{" "}</dt><dd className="inline">{priv?.siret ?? t("non renseigné")}</dd></div>
              <div><dt className="inline font-semibold">{t("Engagements hygiène et légaux :")}{" "}</dt><dd className="inline">{t("acceptés")}</dd></div>
            </dl>
            <Textarea className="mt-3 min-h-[60px]" placeholder={t("Motif (obligatoire en cas de refus)")} value={reasons[c.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [c.id]: e.target.value })} />
            <div className="mt-3 flex gap-2">
              <Button onClick={() => decide.mutate({ id: c.id, approve: true })} loading={decide.isPending}><Check />{" "}{t("Valider")}</Button>
              <Button variant="outline" disabled={!reasons[c.id]} onClick={() => decide.mutate({ id: c.id, approve: false })}><X />{" "}{t("Refuser")}</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Reports() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const q = useQuery({ queryKey: ["admin-reports"], queryFn: () => fetchReports("open") });
  const handle = useMutation({
    mutationFn: async (v: { id: string; status: "resolved" | "dismissed"; action?: "hide_dish" | "hide_review" | "suspend_cook"; targetId?: string }) => {
      const sb = requireSupabase();
      if (v.action === "hide_dish") { const r = await sb.from("dishes").update({ is_hidden_by_moderation: true }).eq("id", v.targetId!); if (r.error) throw r.error; }
      if (v.action === "hide_review") { const r = await sb.from("reviews").update({ is_hidden: true }).eq("id", v.targetId!); if (r.error) throw r.error; }
      if (v.action === "suspend_cook") { const r = await sb.rpc("suspend_cook", { _cook_id: v.targetId, _reason: "Suite à un signalement" }); if (r.error) throw r.error; }
      const { data: u } = await sb.auth.getUser();
      const r = await sb.from("reports").update({ status: v.status, handled_by: u.user!.id, resolution: v.action ?? null }).eq("id", v.id);
      if (r.error) throw r.error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success(t("Signalement traité")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.isLoading) return <Spinner />;
  if (!q.data?.length) return <EmptyState icon="🛡️" title={t("Aucun signalement ouvert")} />;
  const canModerate = roles.includes("admin") || roles.includes("moderator");
  return (
    <div className="space-y-3">
      {q.data.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={r.reason === "food_safety" || r.reason === "allergen" ? "danger" : "warn"}>{t(REPORT_REASONS.find((x) => x.id === r.reason)?.label ?? r.reason)}</Badge>
            <Badge>{r.target_type}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString(intlLocale())}</span>
          </div>
          {r.details && <p className="mt-2 text-sm">{r.details}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{t("Cible :")}{" "}{r.target_type === "order" ? <Link className="text-primary" to={`/commande/${r.target_id}`}>{r.target_id}</Link> : r.target_id}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canModerate && r.target_type === "dish" && <Button size="sm" variant="destructive" onClick={() => handle.mutate({ id: r.id, status: "resolved", action: "hide_dish", targetId: r.target_id })}>{t("Masquer le plat")}</Button>}
            {canModerate && r.target_type === "review" && <Button size="sm" variant="destructive" onClick={() => handle.mutate({ id: r.id, status: "resolved", action: "hide_review", targetId: r.target_id })}>{t("Masquer l'avis")}</Button>}
            {canModerate && r.target_type === "cook" && <Button size="sm" variant="destructive" onClick={() => handle.mutate({ id: r.id, status: "resolved", action: "suspend_cook", targetId: r.target_id })}>{t("Suspendre la cuisine")}</Button>}
            <Button size="sm" variant="secondary" onClick={() => handle.mutate({ id: r.id, status: "resolved" })}>{t("Marquer résolu")}</Button>
            <Button size="sm" variant="ghost" onClick={() => handle.mutate({ id: r.id, status: "dismissed" })}>{t("Rejeter")}</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
