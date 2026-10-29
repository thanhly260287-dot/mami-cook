import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, Bike, Check, Download, FileCheck, FileText, Globe, Package, ShieldAlert, Tag, UserCheck, Users, Wallet, X } from "lucide-react";
import { BUSINESS_STATUSES, countryFlag, countryName, cuisineLabel, formatDate, formatMoney, ORDER_STATUS_LABELS, REPORT_REASONS, t, intlLocale, VEHICLES, type Country, type OrderStatus } from "@mami/shared";
import {
  adminPayouts, adminSearchOrders, fetchCountries, fetchDac7, fetchPendingCooks, fetchPendingCouriers, fetchPlatformStats, fetchPromoCodes,
  fetchComplianceQueue, fetchReports, orderAction, reviewCourier, savePromo, searchUsers, updateCountry,
} from "@/lib/api";
import { ComplianceChecklist } from "@/components/Compliance";
import { requireSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cn, errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Seo } from "@/components/Seo";

const TABS = [
  { id: "stats", label: "Tableau de bord", icon: BarChart3 },
  { id: "cooks", label: "Candidatures", icon: UserCheck },
  { id: "couriers", label: "Livreurs", icon: Bike },
  { id: "docs", label: "Justificatifs", icon: FileCheck },
  { id: "orders", label: "Commandes", icon: Package },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "reports", label: "Signalements", icon: ShieldAlert },
  { id: "promos", label: "Codes promo", icon: Tag },
  { id: "payouts", label: "Versements", icon: Wallet },
  { id: "countries", label: "Pays et taux", icon: Globe },
  { id: "dac7", label: "Déclaration DAC7", icon: FileText },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function Admin() {
  const [tab, setTab] = useState<Tab>("stats");
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const visible = TABS.filter((tb) => isAdmin || !["countries", "dac7", "promos", "payouts"].includes(tb.id));
  return (
    <div className="container py-8">
      <Seo title={t("Administration — MAMI COOK")} noindex />
      <h1 className="mb-6 text-3xl font-extrabold">{t("Administration")}</h1>
      <div className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto pb-1">
        {visible.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold", tab === id ? "gradient-primary text-white" : "bg-muted")}>
            <Icon className="h-4 w-4" />{t(label)}
          </button>
        ))}
      </div>
      {tab === "stats" && <Stats />}
      {tab === "cooks" && <Applications />}
      {tab === "couriers" && <CourierApplications />}
      {tab === "orders" && <OrdersAdmin />}
      {tab === "users" && <UsersAdmin />}
      {tab === "reports" && <Reports />}
      {tab === "promos" && <Promos />}
      {tab === "payouts" && <PayoutsAdmin />}
      {tab === "countries" && <Countries />}
      {tab === "docs" && <ComplianceQueue />}
      {tab === "dac7" && <Dac7 />}
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
            <h3 className="mb-2 mt-4 text-sm font-bold">{countryFlag(c.country ?? "FR")} {t("Justificatifs")}</h3>
            <ComplianceChecklist userId={c.id} role="cook" mode="review" />
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

// ------------------------------------------------------------------ tableau de bord
function Stats() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["platform-stats", days], queryFn: () => fetchPlatformStats(days), refetchInterval: 60_000 });
  if (q.isLoading) return <Spinner />;
  const s = q.data;
  if (!s) return null;
  const max = Math.max(1, ...s.daily.map((d) => d.orders));
  return (
    <div className="space-y-6">
      <div className="flex gap-2">{[1, 7, 30, 90, 365].map((n) => <button key={n} onClick={() => setDays(n)} className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold", days === n ? "gradient-primary text-white" : "bg-muted")}>{t("{n} j", { n })}</button>)}</div>
      {s.by_currency.length === 0 && <p className="text-sm text-muted-foreground">{t("Aucune commande sur la période.")}</p>}
      {s.by_currency.map((c) => (
        <div key={c.currency} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label={t("Volume d'affaires ({c})", { c: c.currency })} value={formatMoney(c.gmv_cents ?? 0, c.currency)} />
          <Kpi label={t("Revenus MAMI COOK")} value={formatMoney(c.revenue_cents ?? 0, c.currency)} accent />
          <Kpi label={t("Versé aux cuisinières")} value={formatMoney(c.cooks_cents ?? 0, c.currency)} />
          <Kpi label={t("Versé aux livreurs")} value={formatMoney(c.couriers_cents ?? 0, c.currency)} />
          <Kpi label={t("Commandes terminées / annulées")} value={`${c.completed} / ${c.cancelled}`} />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("Commandes en cours")} value={String(s.orders_active)} />
        <Kpi label={t("Courses sans livreur")} value={String(s.deliveries_searching)} warn={s.deliveries_searching > 0} />
        <Kpi label={t("Livreurs en ligne")} value={String(s.couriers_online)} />
        <Kpi label={t("Signalements ouverts")} value={String(s.reports_open)} warn={s.reports_open > 0} />
        <Kpi label={t("Cuisines actives")} value={`${s.cooks_approved} (+${s.cooks_pending} ${t("à valider")})`} />
        <Kpi label={t("Livreurs validés")} value={`${s.couriers_approved} (+${s.couriers_pending} ${t("à valider")})`} />
        <Kpi label={t("Nouveaux comptes")} value={String(s.new_users)} />
        <Kpi label={t("Clients actifs")} value={String(s.customers_active)} />
      </div>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">{t("Commandes par jour")}</h2>
        <div className="flex h-40 items-end gap-1">{s.daily.map((d) => <div key={d.day} title={`${d.day} : ${d.orders}`} className="flex-1 rounded-t gradient-primary" style={{ height: `${(d.orders / max) * 100}%` }} />)}</div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return <Card className={cn("p-4", accent && "border-primary/40 bg-primary/5", warn && "border-status-warn/50 bg-status-warn/10")}><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p></Card>;
}

// ------------------------------------------------------------------ livreurs à valider
function CourierApplications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-couriers"], queryFn: fetchPendingCouriers });
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const decide = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => reviewCourier(v.id, v.approve, reasons[v.id]),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["admin-couriers"] }); toast.success(v.approve ? t("Livreur validé") : t("Candidature refusée")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.isLoading) return <Spinner />;
  if (!q.data?.length) return <EmptyState icon="✅" title={t("Aucune candidature en attente")} />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">{q.data.map((c) => {
      const p = c.courier_private;
      return (
        <Card key={c.id} className="p-5">
          <div className="flex justify-between"><p className="text-lg font-bold">{c.profiles?.display_name}</p><Badge tone="warn">{t("À valider")}</Badge></div>
          <p className="text-sm text-muted-foreground">{countryFlag(c.country)} {c.city} · {VEHICLES.find((v) => v.id === c.vehicle)?.emoji} {t(VEHICLES.find((v) => v.id === c.vehicle)?.label ?? "")}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <Row k={t("Nom légal :")} v={p?.legal_name} />
            <Row k={t("Naissance :")} v={p?.birth_date} />
            <Row k={t("Numéro fiscal :")} v={p?.tax_id} />
            <Row k={t("Statut :")} v={t(BUSINESS_STATUSES.find((b) => b.id === p?.business_status)?.label ?? "")} />
            <Row k={t("N° d'entreprise :")} v={p?.registration_number} />
            <Row k={t("Adresse :")} v={p?.address} />
            <Row k={t("Assurance déclarée :")} v={p?.insurance_declared_at ? "✅" : "❌"} />
          </dl>
          <h3 className="mb-2 mt-4 text-sm font-bold">{t("Justificatifs")}</h3>
          <ComplianceChecklist userId={c.id} role="courier" mode="review" />
          <Textarea className="mt-3 min-h-[60px]" placeholder={t("Motif (obligatoire en cas de refus)")} value={reasons[c.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [c.id]: e.target.value })} />
          <div className="mt-3 flex gap-2">
            <Button onClick={() => decide.mutate({ id: c.id, approve: true })} loading={decide.isPending}><Check />{t("Valider")}</Button>
            <Button variant="outline" disabled={!reasons[c.id]} onClick={() => decide.mutate({ id: c.id, approve: false })}><X />{t("Refuser")}</Button>
          </div>
        </Card>
      );
    })}</div>
  );
}

// Justificatifs déposés en attente (nouveaux comptes, renouvellements, comptes suspendus).
function ComplianceQueue() {
  const q = useQuery({ queryKey: ["compliance-queue"], queryFn: fetchComplianceQueue });
  if (q.isLoading) return <Spinner />;
  if (!q.data?.length) return <EmptyState icon="✅" title={t("Aucun justificatif à vérifier")} />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">{q.data.map((u) => (
      <Card key={`${u.user_id}:${u.role}`} className="p-5">
        <div className="mb-3 flex justify-between"><p className="text-lg font-bold">{u.name}</p><Badge tone="muted">{u.role === "cook" ? t("Cuisine") : t("Livreur")}</Badge></div>
        <ComplianceChecklist userId={u.user_id} role={u.role} mode="review" />
      </Card>
    ))}</div>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return <div><dt className="inline font-semibold">{k} </dt><dd className="inline">{v || "—"}</dd></div>;
}

// ------------------------------------------------------------------ commandes
function OrdersAdmin() {
  const [num, setNum] = useState("");
  const [status, setStatus] = useState("");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-orders", num, status], queryFn: () => adminSearchOrders({ number: num ? Number(num) : undefined, status: status || undefined }) });
  const act = useMutation({
    mutationFn: (v: { id: string; to: string }) => orderAction(v.id, v.to, { note: t("Action de l'équipe MAMI COOK") }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success(r.refunded ? t("Commande annulée et remboursée") : t("C'est noté !")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="w-40" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ""))} placeholder={t("N° de commande")} inputMode="numeric" />
        <Select className="w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("Tous les statuts")}</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
        </Select>
      </div>
      {q.isLoading ? <Spinner /> : (
        <Card className="divide-y divide-border">{(q.data ?? []).map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <Link to={`/commande/${o.id}`} className="min-w-0">
              <b>n°{o.number}</b> · {o.cooks?.kitchen_name} → {o.customer?.display_name} · {formatDate(o.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </Link>
            <span className="flex items-center gap-2">
              <b>{formatMoney(o.total_cents, o.currency)}</b>
              <Badge tone={o.status === "completed" ? "success" : ["cancelled", "refunded"].includes(o.status) ? "danger" : "primary"}>{t(ORDER_STATUS_LABELS[o.status as OrderStatus])}</Badge>
              {!["completed", "cancelled", "refunded", "expired", "pending_payment"].includes(o.status) && (
                <Button size="sm" variant="outline" loading={act.isPending} onClick={() => { if (confirm(t("Annuler et rembourser la commande n°{n} ?", { n: o.number }))) act.mutate({ id: o.id, to: "cancelled" }); }}>{t("Annuler et rembourser")}</Button>
              )}
            </span>
          </div>
        ))}{q.data?.length === 0 && <p className="p-5 text-sm text-muted-foreground">{t("Aucune commande.")}</p>}</Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ utilisateurs
function UsersAdmin() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const q = useQuery({ queryKey: ["admin-users", submitted], queryFn: () => searchUsers(submitted) });
  return (
    <div>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setSubmitted(query); }}>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("E-mail, nom ou identifiant")} className="max-w-sm" />
        <Button type="submit">{t("Rechercher")}</Button>
      </form>
      {q.isLoading ? <Spinner /> : (
        <Card className="divide-y divide-border">{(q.data ?? []).map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <span><b>{u.display_name}</b> · {u.email}</span>
            <span className="flex flex-wrap gap-1">
              {u.is_cook && <Badge tone="primary">👩‍🍳 {t("Cuisine")}</Badge>}
              {u.is_courier && <Badge tone="accent">🛵 {t("Livreur")}</Badge>}
              {u.roles.map((r) => <Badge key={r} tone="danger">{r}</Badge>)}
              <Badge>{t("{n} commandes", { n: u.orders_count })}</Badge>
              <Badge>{formatDate(u.created_at, { day: "numeric", month: "short", year: "numeric" })}</Badge>
            </span>
          </div>
        ))}</Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ codes promo
function Promos() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-promos"], queryFn: fetchPromoCodes });
  const [f, setF] = useState({ code: "", kind: "percent", value: "", min: "", max: "", first: false, ends: "" });
  const save = useMutation({
    mutationFn: (v: Parameters<typeof savePromo>[0]) => savePromo(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promos"] }); toast.success(t("Code promo enregistré")); setF({ ...f, code: "", value: "" }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cents = (s: string) => (s ? Math.round(parseFloat(s.replace(",", ".")) * 100) : 0);
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="space-y-3 p-5">
        <h2 className="font-bold">{t("Nouveau code")}</h2>
        <Field label={t("Code")} htmlFor="pc"><Input id="pc" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} maxLength={30} placeholder="BIENVENUE" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} aria-label={t("Type de remise")}><option value="percent">%</option><option value="amount">{t("Montant")}</option></Select>
          <Input value={f.value} onChange={(e) => setF({ ...f, value: e.target.value.replace(/[^0-9.,]/g, "") })} placeholder={f.kind === "percent" ? "15" : "5,00"} aria-label={t("Valeur")} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("Commande min.")} htmlFor="pmin"><Input id="pmin" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} placeholder="15,00" /></Field>
          <Field label={t("Utilisations max.")} htmlFor="pmax"><Input id="pmax" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value.replace(/\D/g, "") })} placeholder="1000" /></Field>
        </div>
        <Field label={t("Fin de validité")} htmlFor="pend"><Input id="pend" type="date" value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} /></Field>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={f.first} onChange={(e) => setF({ ...f, first: e.target.checked })} />{t("Première commande uniquement")}</label>
        <Button className="w-full" disabled={f.code.length < 3 || !f.value} loading={save.isPending} onClick={() => save.mutate({
          code: f.code, percent_off: f.kind === "percent" ? Number(f.value) : null, amount_off_cents: f.kind === "amount" ? cents(f.value) : null,
          min_order_cents: cents(f.min), max_redemptions: f.max ? Number(f.max) : null, first_order_only: f.first, ends_at: f.ends ? new Date(f.ends).toISOString() : null,
        })}>{t("Créer le code")}</Button>
        <p className="text-xs text-muted-foreground">{t("Les remises des codes promo sont prises en charge par MAMI COOK : la cuisinière touche toujours son prix.")}</p>
      </Card>
      <Card className="divide-y divide-border">{(q.data ?? []).map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <span><b className="font-mono">{p.code}</b> · {p.percent_off ? `−${p.percent_off} %` : `−${formatMoney(p.amount_off_cents ?? 0)}`}{p.first_order_only && ` · ${t("1re commande")}`}</span>
          <span className="flex items-center gap-2">
            <Badge>{t("{n} utilisations", { n: p.redemptions })}{p.max_redemptions ? ` / ${p.max_redemptions}` : ""}</Badge>
            {p.ends_at && <Badge>{t("jusqu'au {d}", { d: formatDate(p.ends_at, { day: "numeric", month: "short" }) })}</Badge>}
            <Button size="sm" variant="ghost" onClick={() => save.mutate({ code: p.code, percent_off: p.percent_off, amount_off_cents: p.amount_off_cents, min_order_cents: p.min_order_cents, max_redemptions: p.max_redemptions, first_order_only: p.first_order_only, ends_at: p.ends_at, is_active: !p.is_active })}>
              {p.is_active ? t("Désactiver") : t("Activer")}
            </Button>
          </span>
        </div>
      ))}{q.data?.length === 0 && <p className="p-5 text-sm text-muted-foreground">{t("Aucun code promo.")}</p>}</Card>
    </div>
  );
}

// ------------------------------------------------------------------ versements
function PayoutsAdmin() {
  const [status, setStatus] = useState("pending");
  const q = useQuery({ queryKey: ["admin-payouts", status], queryFn: () => adminPayouts(status) });
  return (
    <div>
      <div className="mb-4 flex gap-2">{["pending", "transferred", "failed"].map((st) => (
        <button key={st} onClick={() => setStatus(st)} className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold", status === st ? "gradient-primary text-white" : "bg-muted")}>
          {st === "pending" ? t("En attente") : st === "transferred" ? t("Versés") : t("En échec")}
        </button>
      ))}</div>
      {status === "failed" && <p className="mb-3 text-sm text-muted-foreground">{t("Un versement échoue quand le compte Stripe du bénéficiaire n'est pas finalisé. Il sera retenté après correction.")}</p>}
      {q.isLoading ? <Spinner /> : (
        <Card className="divide-y divide-border">{(q.data ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <span>{p.cook_id ? "👩‍🍳" : "🛵"} {t("Commande n°")}{p.orders?.number} · {t("disponible le {d}", { d: formatDate(p.available_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}</span>
            <b>{formatMoney(p.amount_cents, p.orders?.currency ?? "EUR")}</b>
          </div>
        ))}{q.data?.length === 0 && <p className="p-5 text-sm text-muted-foreground">{t("Aucun versement.")}</p>}</Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ pays et taux
function Countries() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["countries"], queryFn: fetchCountries });
  const save = useMutation({
    mutationFn: (v: { code: string; patch: Partial<Country> }) => updateCountry(v.code, v.patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["countries"] }); toast.success(t("Pays mis à jour")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("Les taux s'appliquent aux nouvelles commandes. Informez les cuisinières et les livreurs 15 jours avant toute baisse de leur rémunération (règlement P2B).")}</p>
      {(q.data ?? []).map((c) => <CountryRow key={c.code} c={c} onSave={(patch) => save.mutate({ code: c.code, patch })} saving={save.isPending} />)}
    </div>
  );
}

function CountryRow({ c, onSave, saving }: { c: Country; onSave: (p: Partial<Country>) => void; saving: boolean }) {
  const pct = (n: number) => String(Math.round(Number(n) * 1000) / 10);
  const [f, setF] = useState({
    enabled: c.enabled, service: pct(c.service_rate), cook: pct(c.cook_commission_rate), courier: pct(c.courier_commission_rate),
    base: String(c.delivery_base_cents / 100), km: String(c.delivery_per_km_cents / 100), min: String(c.min_order_cents / 100), mode: c.courier_mode,
  });
  const num = (s: string) => Number(s.replace(",", "."));
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold">{countryFlag(c.code)} {countryName(c.code)} <span className="text-sm font-normal text-muted-foreground">· {c.currency}</span></p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />{t("Ouvert")}</label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
        <Mini label={t("Majoration client %")} v={f.service} on={(v) => setF({ ...f, service: v })} />
        <Mini label={t("Commission cuisinière %")} v={f.cook} on={(v) => setF({ ...f, cook: v })} />
        <Mini label={t("Commission livraison %")} v={f.courier} on={(v) => setF({ ...f, courier: v })} />
        <Mini label={t("Livraison : base")} v={f.base} on={(v) => setF({ ...f, base: v })} />
        <Mini label={t("Livraison : par km")} v={f.km} on={(v) => setF({ ...f, km: v })} />
        <Mini label={t("Commande min.")} v={f.min} on={(v) => setF({ ...f, min: v })} />
        <div><p className="mb-1 text-[11px] font-semibold text-muted-foreground">{t("Livreurs")}</p>
          <Select className="h-9" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value as Country["courier_mode"] })}>
            <option value="independent">{t("Indépendants")}</option><option value="partner_agency">{t("Agence partenaire")}</option><option value="disabled">{t("Désactivés")}</option>
          </Select></div>
        <div className="flex items-end"><Button size="sm" className="w-full" loading={saving} onClick={() => onSave({
          enabled: f.enabled, service_rate: num(f.service) / 100, cook_commission_rate: num(f.cook) / 100, courier_commission_rate: num(f.courier) / 100,
          delivery_base_cents: Math.round(num(f.base) * 100), delivery_per_km_cents: Math.round(num(f.km) * 100), min_order_cents: Math.round(num(f.min) * 100), courier_mode: f.mode,
        })}>{t("Enregistrer")}</Button></div>
      </div>
    </Card>
  );
}

function Mini({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return <div><p className="mb-1 text-[11px] font-semibold text-muted-foreground">{label}</p><Input className="h-9" value={v} onChange={(e) => on(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" /></div>;
}

// ------------------------------------------------------------------ DAC7
function Dac7() {
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const q = useQuery({ queryKey: ["dac7", year], queryFn: () => fetchDac7(year) });
  const rows = q.data ?? [];
  const download = () => {
    const head = ["type", "id", "nom_legal", "nom_affiche", "naissance", "nif", "tva", "statut", "immatriculation", "pays", "adresse", "devise", "transactions", "montant", "frais", "t1", "t2", "t3", "t4", "a_declarer"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const cents = (v: number | null) => ((v ?? 0) / 100).toFixed(2);
    const csv = [head.join(";"), ...rows.map((r) => [r.seller_type, r.seller_id, r.legal_name, r.display_name, r.birth_date, r.tax_id, r.vat_number, r.business_status, r.registration_number, r.country, r.address, r.currency, r.transactions, cents(r.consideration_cents), cents(r.fees_cents), cents(r.q1_cents), cents(r.q2_cents), cents(r.q3_cents), cents(r.q4_cents), r.reportable ? "oui" : "non"].map(esc).join(";"))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `dac7-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      <Card className="p-5 text-sm">
        <p>{t("La directive DAC7 oblige MAMI COOK à déclarer chaque année, avant le 31 janvier, les revenus des vendeurs et prestataires à l'administration fiscale, et à leur en envoyer une copie.")}</p>
        <p className="mt-1 text-muted-foreground">{t("Vendeurs de plats exclus s'ils ont moins de 30 ventes et au plus 2 000 € dans l'année. Livreurs : toujours déclarés.")}</p>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-32" value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
          {[0, 1, 2, 3].map((i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
        </Select>
        <Button variant="outline" onClick={download} disabled={!rows.length}><Download />{t("Exporter en CSV")}</Button>
        <span className="text-sm text-muted-foreground">{t("{n} à déclarer sur {total}", { n: rows.filter((r) => r.reportable).length, total: rows.length })}</span>
      </div>
      {q.isLoading ? <Spinner /> : (
        <Card className="divide-y divide-border">{rows.map((r) => (
          <div key={`${r.seller_type}-${r.seller_id}-${r.currency}`} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <span>{r.seller_type === "cook" ? "👩‍🍳" : "🛵"} <b>{r.legal_name ?? r.display_name}</b> · {countryFlag(r.country)} {r.tax_id ? `NIF ${r.tax_id}` : <span className="text-destructive">{t("NIF manquant")}</span>}</span>
            <span className="flex items-center gap-2">{t("{n} transactions", { n: r.transactions })} · <b>{formatMoney(r.consideration_cents, r.currency)}</b><Badge tone={r.reportable ? "warn" : "muted"}>{r.reportable ? t("À déclarer") : t("Sous le seuil")}</Badge></span>
          </div>
        ))}{rows.length === 0 && <p className="p-5 text-sm text-muted-foreground">{t("Aucune activité sur cette année.")}</p>}</Card>
      )}
    </div>
  );
}
