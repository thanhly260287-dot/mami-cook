// Espace livreur : inscription, mise en ligne, courses, course en cours, gains, profil.
// Les livreurs sont indépendants : ils voient le gain avant d'accepter et refusent librement.
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Check, CircleDollarSign, ExternalLink, History, MapPin, Navigation, Package, Power, ShieldCheck, User, X } from "lucide-react";
import {
  BUSINESS_STATUSES, COUNTRY_OPTIONS, countryFlag, countryName, DELIVERY_STATUS_LABELS, formatDate, formatMoney, getCountryGuide,
  intlLocale, t, VEHICLES, type AvailableDelivery, type DeliveryDetails,
} from "@mami/shared";
import {
  acceptDelivery, applyAsCourier, courierCancel, declineDelivery, deliveryStep, fetchAvailableDeliveries, fetchCourierDashboard,
  fetchCourierHistory, fetchCourierPayouts, fetchDeliveryDetails, fetchMyCourierPrivate, setCourierOnline, stripeConnect, updateCourierProfile,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { DEMO_MODE } from "@/lib/supabase";
import { cn, errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui/misc";
import { Field, Input, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { directionsUrl, RouteMap } from "@/components/RouteMap";
import { Seo } from "@/components/Seo";

const km = (m: number) => `${(m / 1000).toLocaleString(intlLocale(), { maximumFractionDigits: 1 })} km`;

// ------------------------------------------------------------------ page d'accueil livreur / inscription
export function BecomeCourier() {
  const { user, courier, refreshCourier } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({
    country: "FR", city: "", vehicle: "bike", legal_name: "", birth_date: "", tax_id: "", business_status: "sole_trader",
    registration_number: "", address: "", insurance: false, rights: false,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });
  const submit = useMutation({
    mutationFn: () => applyAsCourier(user!.id, f),
    onSuccess: () => { refreshCourier(); toast.success(t("Candidature envoyée ! Réponse sous 48 h.")); navigate("/livreur"); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (courier && courier.status !== "draft" && courier.status !== "rejected") return <Navigate to="/livreur" replace />;
  const guide = getCountryGuide(f.country);
  const valid = f.city.trim().length > 1 && f.legal_name.trim().length > 2 && f.birth_date && f.tax_id.trim().length > 3 && f.address.trim().length > 5 && f.insurance && f.rights;

  return (
    <div className="container max-w-5xl py-10">
      <Seo title={t("Devenir livreur — MAMI COOK")} description={t("Livrez des plats faits maison près de chez vous. Vous choisissez vos horaires et vos courses.")} />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <Badge tone="accent" className="mb-3">🛵 {t("Livreurs indépendants")}</Badge>
          <h1 className="text-4xl font-extrabold leading-tight">{t("Livrez quand vous voulez, gagnez à chaque course")}</h1>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              [t("Vous voyez le gain et la distance avant d'accepter"), "💶"],
              [t("Refuser une course n'a aucune conséquence"), "🙅"],
              [t("100 % des pourboires vous reviennent"), "🎁"],
              [t("Paiement automatique sur votre compte bancaire, 24 h après la livraison"), "🏦"],
              [t("Vous vous connectez quand vous voulez, sans horaires imposés"), "🕒"],
            ].map(([txt, e]) => <li key={txt} className="flex gap-3"><span className="text-xl" aria-hidden>{e}</span><span>{txt}</span></li>)}
          </ul>
          <Card className="mt-8 p-5">
            <h2 className="mb-1 font-bold">{countryFlag(f.country)} {t("Ce qu'il faut pour livrer en {country}", { country: countryName(f.country) })}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {guide.courier.map((s) => (
                <li key={s.title}><p className="font-semibold">{s.required ? "✅" : "💡"} {s.title}</p><p className="text-muted-foreground">{s.detail}</p>
                  {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary">{t("En savoir plus")} <ExternalLink className="inline h-3 w-3" /></a>}</li>
              ))}
            </ul>
            <Link to="/guide-legal" className="mt-3 inline-block text-sm font-semibold text-primary">{t("Guide complet par pays →")}</Link>
          </Card>
        </div>

        <Card className="p-6">
          {DEMO_MODE || !user ? (
            <EmptyState icon="🛵" title={t("Créez d'abord votre compte")} action={<Button asChild><Link to="/inscription?redirect=/devenir-livreur">{t("Créer mon compte")}</Link></Button>}>
              {t("Un compte gratuit suffit pour postuler.")}
            </EmptyState>
          ) : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) submit.mutate(); }}>
              <h2 className="text-xl font-bold">{t("Ma candidature")}</h2>
              {courier?.status === "rejected" && courier.status_reason && <p className="rounded-xl bg-destructive/10 p-3 text-sm">{t("Motif :")} {courier.status_reason}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Pays")} htmlFor="c-country">
                  <Select id="c-country" value={f.country} onChange={set("country")}>
                    {COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.flag} {countryName(c.code)}</option>)}
                  </Select>
                </Field>
                <Field label={t("Ville")} htmlFor="c-city"><Input id="c-city" value={f.city} onChange={set("city")} maxLength={100} required /></Field>
              </div>
              <Field label={t("Véhicule")} htmlFor="c-vehicle">
                <Select id="c-vehicle" value={f.vehicle} onChange={set("vehicle")}>
                  {VEHICLES.map((v) => <option key={v.id} value={v.id}>{v.emoji} {t(v.label)}</option>)}
                </Select>
              </Field>
              <p className="pt-2 text-sm font-semibold">{t("Informations légales")} <span className="font-normal text-muted-foreground">{t("(confidentielles, exigées par la loi)")}</span></p>
              <Field label={t("Nom et prénom (comme sur la pièce d'identité)")} htmlFor="c-name"><Input id="c-name" value={f.legal_name} onChange={set("legal_name")} maxLength={120} autoComplete="name" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Date de naissance")} htmlFor="c-birth"><Input id="c-birth" type="date" value={f.birth_date} onChange={set("birth_date")} /></Field>
                <Field label={t("Numéro fiscal")} htmlFor="c-tax" hint={t("France : numéro fiscal de référence (13 chiffres)")}><Input id="c-tax" value={f.tax_id} onChange={set("tax_id")} maxLength={40} /></Field>
              </div>
              <Field label={t("Statut")} htmlFor="c-status">
                <Select id="c-status" value={f.business_status} onChange={set("business_status")}>
                  {BUSINESS_STATUSES.map((b) => <option key={b.id} value={b.id}>{t(b.label)}</option>)}
                </Select>
              </Field>
              <Field label={t("Numéro d'entreprise (SIRET, BCE…)")} htmlFor="c-reg"><Input id="c-reg" value={f.registration_number} onChange={set("registration_number")} maxLength={60} /></Field>
              <Field label={t("Adresse postale")} htmlFor="c-addr"><Input id="c-addr" value={f.address} onChange={set("address")} maxLength={300} autoComplete="street-address" /></Field>
              <label className="flex gap-3 text-sm"><input type="checkbox" checked={f.insurance} onChange={set("insurance")} className="mt-1" />{t("Je déclare être assuré(e) (responsabilité civile, et véhicule si motorisé).")}</label>
              <label className="flex gap-3 text-sm"><input type="checkbox" checked={f.rights} onChange={set("rights")} className="mt-1" />
                <span>{t("J'accepte les")} <Link to="/legal/livreurs" className="font-semibold text-primary" target="_blank">{t("conditions des livreurs")}</Link>{" "}{t("et je confirme exercer en indépendant.")}</span></label>
              <Button type="submit" size="lg" className="w-full" disabled={!valid} loading={submit.isPending}>{t("Envoyer ma candidature")}</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ mise en page de l'espace livreur
export function CourierLayout() {
  const { courier } = useAuth();
  if (!courier || courier.status === "draft" || courier.status === "rejected") return <Navigate to="/devenir-livreur" replace />;
  if (courier.status === "pending_review") {
    return <EmptyState icon="⏳" title={t("Candidature en cours d'examen")}>{t("Notre équipe vérifie vos informations (48 h maximum). Vous recevrez une notification.")}</EmptyState>;
  }
  if (courier.status === "suspended") {
    return <EmptyState icon="⛔" title={t("Compte suspendu")}>{courier.status_reason ?? t("Contactez le support pour en savoir plus.")}</EmptyState>;
  }
  const tabs = [
    { to: "/livreur", label: t("Courses"), icon: <Package />, end: true },
    { to: "/livreur/gains", label: t("Gains"), icon: <CircleDollarSign /> },
    { to: "/livreur/historique", label: t("Historique"), icon: <History /> },
    { to: "/livreur/profil", label: t("Profil"), icon: <User /> },
  ];
  return (
    <div className="container max-w-5xl py-6">
      <Seo title={t("Espace livreur — MAMI COOK")} noindex />
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tb) => (
          <NavLink key={tb.to} to={tb.to} end={tb.end} className={({ isActive }) => cn("flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold [&_svg]:h-4 [&_svg]:w-4", isActive ? "gradient-primary text-white" : "bg-muted")}>
            {tb.icon}{tb.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

// ------------------------------------------------------------------ courses : en ligne / hors ligne + liste
export function CourierMissions() {
  const { courier, user, refreshCourier } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const online = !!courier?.is_online;
  const watchRef = useRef<number | null>(null);
  const lastSent = useRef(0);

  const dash = useQuery({ queryKey: ["courier-dash", 1], queryFn: () => fetchCourierDashboard(1) });
  const list = useQuery({ queryKey: ["available-deliveries"], queryFn: fetchAvailableDeliveries, enabled: online, refetchInterval: online ? 15_000 : false });
  useRealtime(`courier-notif-${user?.id}`, "notifications", `user_id=eq.${user?.id}`, [["available-deliveries"]], online);

  // Pendant qu'il est en ligne, la position du livreur est envoyée au plus toutes les 20 s.
  useEffect(() => {
    if (!online || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition((p) => {
      if (Date.now() - lastSent.current < 20_000) return;
      lastSent.current = Date.now();
      setCourierOnline(true, p.coords.latitude, p.coords.longitude).catch(() => undefined);
    }, undefined, { enableHighAccuracy: true, maximumAge: 15_000 });
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [online]);

  const toggle = useMutation({
    mutationFn: async (on: boolean) => {
      if (!on) return setCourierOnline(false);
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15_000 }));
      return setCourierOnline(true, pos.coords.latitude, pos.coords.longitude);
    },
    onSuccess: (_d, on) => { refreshCourier(); qc.invalidateQueries({ queryKey: ["available-deliveries"] }); toast.success(on ? t("Vous êtes en ligne 🟢") : t("Vous êtes hors ligne")); },
    onError: (e) => toast.error(e instanceof GeolocationPositionError ? t("Autorisez la localisation pour recevoir des courses.") : errorMessage(e)),
  });
  const accept = useMutation({
    mutationFn: acceptDelivery,
    onSuccess: (d) => { toast.success(t("Course acceptée !")); navigate(`/livreur/course/${d.delivery_id}`); },
    onError: (e) => { toast.error(errorMessage(e)); qc.invalidateQueries({ queryKey: ["available-deliveries"] }); },
  });
  const decline = useMutation({
    mutationFn: declineDelivery,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["available-deliveries"] }),
  });

  const active = dash.data?.active ?? [];
  const cur = dash.data?.currency ?? "EUR";
  return (
    <div className="space-y-6">
      {!courier?.stripe_payouts_enabled && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-status-warn/40 bg-status-warn/10 p-4 text-sm">
          <span>💳 {t("Connectez votre compte bancaire pour recevoir vos gains.")}</span>
          <Button size="sm" asChild><Link to="/livreur/gains">{t("Configurer")}</Link></Button>
        </Card>
      )}
      <Card className={cn("flex items-center justify-between gap-4 p-5", online && "border-status-hot/50 bg-status-hot/5")}>
        <div>
          <p className="text-lg font-extrabold">{online ? t("En ligne") : t("Hors ligne")}</p>
          <p className="text-sm text-muted-foreground">{online ? t("Les courses proches s'affichent ci-dessous.") : t("Passez en ligne pour recevoir des courses.")}</p>
        </div>
        <Button size="lg" variant={online ? "outline" : "primary"} loading={toggle.isPending} onClick={() => toggle.mutate(!online)}>
          <Power />{online ? t("Se déconnecter") : t("Passer en ligne")}
        </Button>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t("Aujourd'hui")} value={formatMoney(dash.data?.earnings_cents ?? 0, cur)} />
        <Stat label={t("Courses")} value={String(dash.data?.deliveries_count ?? 0)} />
        <Stat label={t("Note")} value={courier?.rating_count ? `⭐ ${Number(courier.rating_avg).toFixed(1)}` : "—"} />
      </div>

      {active.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold">{t("Course en cours")}</h2>
          {active.map((id) => <ActiveDeliveryLink key={id} id={id} />)}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-bold">{t("Courses disponibles")}</h2>
        {!online ? <EmptyState icon="😴" title={t("Vous êtes hors ligne")} />
          : list.isLoading ? <Spinner />
          : !list.data?.length ? <EmptyState icon="📡" title={t("Aucune course pour l'instant")}>{t("Restez en ligne : vous serez notifié dès qu'une commande est prête près de vous.")}</EmptyState>
          : <div className="grid gap-3 md:grid-cols-2">{list.data.map((d) => (
              <OfferCard key={d.delivery_id} d={d} busy={accept.isPending || decline.isPending}
                onAccept={() => accept.mutate(d.delivery_id)} onDecline={() => decline.mutate(d.delivery_id)} />
            ))}</div>}
      </div>
    </div>
  );
}

function OfferCard({ d, onAccept, onDecline, busy }: { d: AvailableDelivery; onAccept: () => void; onDecline: () => void; busy: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold text-status-hot">{formatMoney(d.payout_cents, d.currency)}</p>
          {d.tip_cents > 0 && <p className="text-xs font-semibold text-status-hot">{t("dont {tip} de pourboire", { tip: formatMoney(d.tip_cents, d.currency) })}</p>}
        </div>
        <Badge tone={d.order_status === "ready" ? "success" : "muted"}>{d.order_status === "ready" ? t("Prête") : t("En préparation")}</Badge>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li>👩‍🍳 <b>{d.kitchen_name}</b> · {t("à {d} de vous", { d: km(d.pickup_distance_m) })}</li>
        <li>🏠 {d.dropoff_postal_code} {d.dropoff_city} · {t("trajet {d}", { d: km(d.distance_m) })}</li>
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{t("L'adresse exacte s'affiche après acceptation.")}</p>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={onAccept} disabled={busy}><Check />{t("Accepter")}</Button>
        <Button variant="outline" onClick={onDecline} disabled={busy}><X />{t("Refuser")}</Button>
      </div>
    </Card>
  );
}

function ActiveDeliveryLink({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["delivery", id], queryFn: () => fetchDeliveryDetails(id) });
  if (!q.data) return null;
  return (
    <Link to={`/livreur/course/${id}`}>
      <Card className="mb-3 flex items-center justify-between gap-3 border-primary/40 p-4 hover:bg-muted/50">
        <div><p className="font-bold">n°{q.data.order_number} · {q.data.kitchen_name}</p><p className="text-sm text-muted-foreground">{t(DELIVERY_STATUS_LABELS[q.data.status])}</p></div>
        <Navigation className="h-5 w-5 text-primary" />
      </Card>
    </Link>
  );
}

// ------------------------------------------------------------------ course en cours
export function CourierDelivery() {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [codeOpen, setCodeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [code, setCode] = useState("");
  const q = useQuery({ queryKey: ["delivery", id], queryFn: () => fetchDeliveryDetails(id!), refetchInterval: 20_000 });
  useRealtime(`delivery-${id}`, "deliveries", `id=eq.${id}`, [["delivery", id]]);
  const step = useMutation({
    mutationFn: (v: { step: "at_pickup" | "picked_up" | "delivered"; code?: string }) => deliveryStep(id!, v.step, v.code),
    onSuccess: (d, v) => {
      qc.setQueryData(["delivery", id], d);
      setCodeOpen(false);
      if (v.step === "delivered") { toast.success(t("Livraison terminée, merci ! 🎉")); qc.invalidateQueries({ queryKey: ["courier-dash"] }); navigate("/livreur"); }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: () => courierCancel(id!),
    onSuccess: () => { toast.info(t("Course libérée, elle est proposée à un autre livreur.")); navigate("/livreur"); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading) return <Spinner />;
  const d = q.data;
  if (!d) return <EmptyState icon="🔍" title={t("Course introuvable")} action={<Button asChild><Link to="/livreur">{t("Retour")}</Link></Button>} />;
  const done = d.status === "delivered" || d.status === "cancelled";
  const goingToDropoff = d.status === "picked_up";
  const target = goingToDropoff ? d.dropoff : d.pickup;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-sm text-muted-foreground">{t("Commande n°")}{d.order_number}</p><h1 className="text-2xl font-extrabold">{t(DELIVERY_STATUS_LABELS[d.status])}</h1></div>
        <p className="text-2xl font-extrabold text-status-hot">{formatMoney(d.payout_cents, d.currency)}</p>
      </div>
      {d.pickup && d.dropoff && (
        <RouteMap className="h-72 w-full rounded-2xl z-0" points={[{ ...d.pickup, kind: "pickup" }, { ...d.dropoff, kind: "dropoff" }]} />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <AddressCard title={t("Retrait")} icon="👩‍🍳" name={d.kitchen_name} p={d.pickup} highlight={!goingToDropoff && !done} />
        <AddressCard title={t("Livraison")} icon="🏠" name={d.dropoff?.customer_name} p={d.dropoff} highlight={goingToDropoff} />
      </div>
      <Card className="p-5">
        <h2 className="mb-2 font-bold">{t("Contenu")}</h2>
        <ul className="text-sm">{d.items.map((i) => <li key={i.title}><b>{i.quantity}×</b> {i.title}</li>)}</ul>
        {d.order_status !== "ready" && !goingToDropoff && !done && <p className="mt-3 rounded-xl bg-status-warn/10 p-3 text-sm">⏳ {t("La commande est encore en préparation. Attendez qu'elle soit prête pour la récupérer.")}</p>}
      </Card>

      {!done && (
        <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-2xl bg-background/90 p-2 backdrop-blur md:bottom-4">
          {target && <Button variant="outline" asChild><a href={directionsUrl(target.lat, target.lng)} target="_blank" rel="noopener noreferrer"><Navigation />{t("Itinéraire")}</a></Button>}
          {d.status === "assigned" && <Button className="flex-1" loading={step.isPending} onClick={() => step.mutate({ step: "at_pickup" })}><MapPin />{t("Je suis arrivé à la cuisine")}</Button>}
          {(d.status === "assigned" || d.status === "at_pickup") && <Button className="flex-1" disabled={d.order_status !== "ready"} loading={step.isPending} onClick={() => step.mutate({ step: "picked_up" })}><Package />{t("Commande récupérée")}</Button>}
          {d.status === "picked_up" && <Button className="flex-1" onClick={() => setCodeOpen(true)}><Check />{t("Remettre au client")}</Button>}
          {(d.status === "assigned" || d.status === "at_pickup") && <Button variant="ghost" onClick={() => setCancelOpen(true)}><X />{t("Me désister")}</Button>}
        </div>
      )}

      <Dialog open={codeOpen} onOpenChange={setCodeOpen} title={t("Code du client")} description={t("Demandez au client son code à 4 chiffres (affiché dans son appli).")}>
        <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" className="text-center text-3xl tracking-[0.5em]" placeholder="0000" autoFocus />
        <Button className="mt-4 w-full" disabled={code.length !== 4} loading={step.isPending} onClick={() => step.mutate({ step: "delivered", code })}>{t("Valider la livraison")}</Button>
      </Dialog>
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen} title={t("Se désister de cette course ?")} description={t("Elle sera proposée à un autre livreur. Aucune pénalité.")}>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setCancelOpen(false)}>{t("Garder")}</Button>
          <Button variant="destructive" className="flex-1" loading={cancel.isPending} onClick={() => cancel.mutate()}>{t("Me désister")}</Button>
        </div>
      </Dialog>
    </div>
  );
}

function AddressCard({ title, icon, name, p, highlight }: { title: string; icon: string; name?: string; p: DeliveryDetails["pickup"]; highlight: boolean }) {
  return (
    <Card className={cn("p-5", highlight && "border-primary/50 bg-primary/5")}>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{icon} {title}</p>
      {name && <p className="mt-1 font-bold">{name}</p>}
      {p ? (
        <>
          <p className="text-sm">{p.line1}{p.line2 ? `, ${p.line2}` : ""}</p>
          <p className="text-sm">{p.postal_code} {p.city}</p>
          {p.instructions && <p className="mt-2 rounded-lg bg-muted p-2 text-sm">📝 {p.instructions}</p>}
        </>
      ) : <p className="text-sm text-muted-foreground">—</p>}
    </Card>
  );
}

// ------------------------------------------------------------------ gains
export function CourierEarnings() {
  const { courier } = useAuth();
  const [days, setDays] = useState(30);
  const dash = useQuery({ queryKey: ["courier-dash", days], queryFn: () => fetchCourierDashboard(days) });
  const payouts = useQuery({ queryKey: ["courier-payouts"], queryFn: () => fetchCourierPayouts(courier!.id) });
  const [loading, setLoading] = useState(false);
  const cur = dash.data?.currency ?? "EUR";
  const go = async (mode: "onboarding" | "dashboard") => {
    setLoading(true);
    try { window.location.assign((await stripeConnect("courier", mode)).url); } catch (e) { toast.error(errorMessage(e)); setLoading(false); }
  };
  const max = Math.max(1, ...(dash.data?.daily ?? []).map((d) => d.earnings_cents));

  return (
    <div className="space-y-6">
      <div className="flex gap-2">{[7, 30, 90, 365].map((n) => <button key={n} onClick={() => setDays(n)} className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold", days === n ? "gradient-primary text-white" : "bg-muted")}>{t("{n} j", { n })}</button>)}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("Gains")} value={formatMoney(dash.data?.earnings_cents ?? 0, cur)} />
        <Stat label={t("Pourboires")} value={formatMoney(dash.data?.tips_cents ?? 0, cur)} />
        <Stat label={t("Courses")} value={String(dash.data?.deliveries_count ?? 0)} />
        <Stat label={t("Distance")} value={km(dash.data?.distance_m ?? 0)} />
      </div>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">{t("Gains par jour")}</h2>
        {!dash.data?.daily.length ? <p className="text-sm text-muted-foreground">{t("Pas encore de gains sur la période.")}</p> : (
          <div className="flex h-40 items-end gap-1" role="img" aria-label={t("Gains par jour")}>
            {dash.data.daily.map((d) => <div key={d.day} title={`${formatDate(d.day, { day: "numeric", month: "short" })} : ${formatMoney(d.earnings_cents, cur)}`} className="flex-1 rounded-t gradient-primary" style={{ height: `${(d.earnings_cents / max) * 100}%` }} />)}
          </div>
        )}
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-bold">{t("Virements")}</h2>
          <p className="text-sm text-muted-foreground">{courier?.stripe_payouts_enabled
            ? t("En attente : {amount}. Virement automatique 24 h après chaque livraison.", { amount: formatMoney(dash.data?.pending_payout_cents ?? 0, cur) })
            : t("Ajoutez votre IBAN via Stripe (sécurisé) pour recevoir vos gains.")}</p>
        </div>
        <Button loading={loading} onClick={() => go(courier?.stripe_account_id ? "dashboard" : "onboarding")}>
          {courier?.stripe_payouts_enabled ? t("Voir mes virements") : t("Configurer mes virements")}
        </Button>
      </Card>
      <Card className="divide-y divide-border">
        {(payouts.data ?? []).map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4 text-sm">
            <span>{t("Commande n°")}{p.orders?.number} · {formatDate(p.created_at, { day: "numeric", month: "short" })}</span>
            <span className="flex items-center gap-2"><b>{formatMoney(p.amount_cents, p.orders?.currency ?? cur)}</b>
              <Badge tone={p.status === "transferred" ? "success" : p.status === "failed" ? "danger" : "muted"}>{p.status === "transferred" ? t("Versé") : p.status === "failed" ? t("Échec") : t("En attente")}</Badge></span>
          </div>
        ))}
        {payouts.data?.length === 0 && <p className="p-5 text-sm text-muted-foreground">{t("Aucun versement pour l'instant.")}</p>}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ historique
export function CourierHistory() {
  const { courier } = useAuth();
  const q = useQuery({ queryKey: ["courier-history"], queryFn: () => fetchCourierHistory(courier!.id) });
  if (q.isLoading) return <Spinner />;
  if (!q.data?.length) return <EmptyState icon="🗂️" title={t("Aucune course pour l'instant")} />;
  return (
    <Card className="divide-y divide-border">
      {q.data.map((d) => (
        <Link key={d.id} to={`/livreur/course/${d.id}`} className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-muted/50">
          <span><b>n°{d.orders?.number}</b> · {d.assigned_at ? formatDate(d.assigned_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""} · {km(d.distance_m)}</span>
          <span className="flex items-center gap-2">{formatMoney(d.courier_payout_cents, d.orders?.currency ?? "EUR")}<Badge tone={d.status === "delivered" ? "success" : d.status === "cancelled" ? "danger" : "primary"}>{t(DELIVERY_STATUS_LABELS[d.status])}</Badge></span>
        </Link>
      ))}
    </Card>
  );
}

// ------------------------------------------------------------------ profil
export function CourierProfile() {
  const { courier, user, refreshCourier } = useAuth();
  const priv = useQuery({ queryKey: ["courier-private"], queryFn: () => fetchMyCourierPrivate(user!.id) });
  const [vehicle, setVehicle] = useState(courier!.vehicle);
  const [city, setCity] = useState(courier!.city ?? "");
  const save = useMutation({
    mutationFn: () => updateCourierProfile(user!.id, { vehicle, city }),
    onSuccess: () => { refreshCourier(); toast.success(t("Profil mis à jour")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-bold">{t("Mon activité")}</h2>
        <Field label={t("Véhicule")} htmlFor="p-vehicle">
          <Select id="p-vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value as typeof vehicle)}>
            {VEHICLES.map((v) => <option key={v.id} value={v.id}>{v.emoji} {t(v.label)}</option>)}
          </Select>
        </Field>
        <Field label={t("Ville")} htmlFor="p-city"><Input id="p-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} /></Field>
        <p className="text-sm text-muted-foreground">{countryFlag(courier!.country)} {countryName(courier!.country)} · {t("{n} courses", { n: courier!.deliveries_completed })}</p>
        <Button onClick={() => save.mutate()} loading={save.isPending}>{t("Enregistrer")}</Button>
      </Card>
      <Card className="space-y-3 p-6 text-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5" />{t("Informations légales")}</h2>
        {priv.data ? (
          <dl className="space-y-1">
            <div><dt className="inline font-semibold">{t("Nom :")} </dt><dd className="inline">{priv.data.legal_name}</dd></div>
            <div><dt className="inline font-semibold">{t("Statut :")} </dt><dd className="inline">{t(BUSINESS_STATUSES.find((b) => b.id === priv.data!.business_status)?.label ?? "")}</dd></div>
            <div><dt className="inline font-semibold">{t("Documents vérifiés :")} </dt><dd className="inline">{priv.data.documents_verified_at ? "✅" : "⏳"}</dd></div>
          </dl>
        ) : <Spinner />}
        <p className="text-muted-foreground">{t("Pour modifier ces informations, contactez le support.")}</p>
      </Card>
      <Card className="p-6 text-sm md:col-span-2">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Bike className="h-5 w-5" />{t("Vos droits de livreur indépendant")}</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("Vous choisissez quand vous vous connectez, sans minimum d'heures.")}</li>
          <li>{t("Vous pouvez refuser n'importe quelle course, sans pénalité ni baisse de visibilité.")}</li>
          <li>{t("Les courses sont proposées aux livreurs en ligne les plus proches de la cuisine. La note n'influence pas l'ordre.")}</li>
          <li>{t("Le prix d'une course = base fixe + prix au kilomètre, dont 80 % pour vous, plus 100 % du pourboire.")}</li>
          <li>{t("Vous pouvez contester toute décision (suspension, litige) auprès du support : une personne vous répond.")}</li>
        </ul>
        <Link to="/legal/livreurs" className="mt-3 inline-block font-semibold text-primary">{t("Lire les conditions des livreurs →")}</Link>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <Card className="p-4"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p></Card>;
}
