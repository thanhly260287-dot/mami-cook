// Mode livreur : en ligne / hors ligne, courses proposées (gain affiché avant d'accepter),
// course en cours avec étapes et code client, gains du jour, virements Stripe.
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, RefreshControl, ScrollView, View } from "react-native";
import * as Location from "expo-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DELIVERY_STATUS_LABELS, formatMoney, intlLocale, t, type AvailableDelivery, type DeliveryDetails } from "@mami/shared";
import {
  acceptDelivery, courierCancel, declineDelivery, deliveryStep, fetchAvailableDeliveries, fetchCourierDashboard, fetchDeliveryDetails,
  setCourierOnline, stripeConnect,
} from "@/lib/api";
import { useAuth } from "@/hooks/providers";
import { errorMessage, SITE_URL } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { Badge, Button, Card, Empty, Input, Loading, T } from "@/components/ui";

const km = (m: number) => `${(m / 1000).toLocaleString(intlLocale(), { maximumFractionDigits: 1 })} km`;
const openMaps = (lat: number, lng: number) =>
  Linking.openURL(Platform.OS === "ios" ? `maps:?daddr=${lat},${lng}` : `google.navigation:q=${lat},${lng}`).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));

export default function CourierScreen() {
  const c = useColors();
  const { courier, refreshCourier } = useAuth();
  const qc = useQueryClient();
  const online = !!courier?.is_online;
  const watch = useRef<Location.LocationSubscription | null>(null);

  const dash = useQuery({ queryKey: ["courier-dash"], queryFn: () => fetchCourierDashboard(1), enabled: courier?.status === "approved", refetchInterval: 30000 });
  const list = useQuery({ queryKey: ["available-deliveries"], queryFn: fetchAvailableDeliveries, enabled: online, refetchInterval: online ? 15000 : false });

  // Position envoyée toutes les 20 s environ pendant que l'appli est ouverte et le livreur en ligne.
  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 20000, distanceInterval: 50 }, (p) => {
      setCourierOnline(true, p.coords.latitude, p.coords.longitude).catch(() => undefined);
    }).then((sub) => { if (cancelled) sub.remove(); else watch.current = sub; }).catch(() => undefined);
    return () => { cancelled = true; watch.current?.remove(); watch.current = null; };
  }, [online]);

  const toggle = useMutation({
    mutationFn: async (on: boolean) => {
      if (!on) return setCourierOnline(false);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error(t("Autorisez la localisation pour recevoir des courses."));
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return setCourierOnline(true, p.coords.latitude, p.coords.longitude);
    },
    onSuccess: () => { refreshCourier(); qc.invalidateQueries({ queryKey: ["available-deliveries"] }); },
    onError: (e) => Alert.alert(t("Impossible"), errorMessage(e)),
  });
  const accept = useMutation({
    mutationFn: acceptDelivery,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courier-dash"] }),
    onError: (e) => { Alert.alert(t("Course indisponible"), errorMessage(e)); qc.invalidateQueries({ queryKey: ["available-deliveries"] }); },
  });
  const decline = useMutation({ mutationFn: declineDelivery, onSuccess: () => qc.invalidateQueries({ queryKey: ["available-deliveries"] }) });
  const payouts = useMutation({
    mutationFn: () => stripeConnect("courier", courier?.stripe_account_id ? "dashboard" : "onboarding"),
    onSuccess: (r) => Linking.openURL(r.url),
    onError: (e) => Alert.alert(t("Erreur"), errorMessage(e)),
  });

  if (!courier || courier.status === "draft" || courier.status === "rejected") {
    return <Empty emoji="🛵" title={t("Devenir livreur")} text={t("Livrez des plats faits maison près de chez vous, quand vous voulez.")}
      action={<Button title={t("Postuler")} onPress={() => Linking.openURL(`${SITE_URL}/devenir-livreur`)} />} />;
  }
  if (courier.status === "pending_review") return <Empty emoji="⏳" title={t("Candidature en cours d'examen")} text={t("Notre équipe vérifie vos informations (48 h maximum). Vous recevrez une notification.")} action={<Button title={t("Déposez vos justificatifs")} onPress={() => Linking.openURL(`${SITE_URL}/livreur`)} />} />;
  if (courier.status === "suspended") return <Empty emoji="⛔" title={t("Compte suspendu")} text={courier.status_reason ?? t("Contactez le support pour en savoir plus.")} action={<Button title={t("Déposez vos justificatifs")} onPress={() => Linking.openURL(`${SITE_URL}/livreur`)} />} />;

  const cur = dash.data?.currency ?? "EUR";
  const active = dash.data?.active ?? [];
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={list.isFetching || dash.isFetching} onRefresh={() => { list.refetch(); dash.refetch(); }} />}>
      <Card style={{ gap: 10, borderColor: online ? c.success : c.border }}>
        <T size={22} weight="800">{online ? t("En ligne") : t("Hors ligne")}</T>
        <T color={c.muted}>{online ? t("Gardez l'appli ouverte : les courses proches s'affichent ici.") : t("Passez en ligne pour recevoir des courses.")}</T>
        <Button title={online ? t("Se déconnecter") : t("Passer en ligne")} icon="power" variant={online ? "outline" : "primary"} loading={toggle.isPending} onPress={() => toggle.mutate(!online)} />
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Stat label={t("Aujourd'hui")} value={formatMoney(dash.data?.earnings_cents ?? 0, cur)} />
        <Stat label={t("Courses")} value={String(dash.data?.deliveries_count ?? 0)} />
        <Stat label={t("Note")} value={courier.rating_count ? `⭐ ${Number(courier.rating_avg).toFixed(1)}` : "—"} />
      </View>

      {!courier.stripe_payouts_enabled && (
        <Card style={{ gap: 8, borderColor: c.warn }}>
          <T>💳 {t("Connectez votre compte bancaire pour recevoir vos gains.")}</T>
          <Button title={t("Configurer mes virements")} loading={payouts.isPending} onPress={() => payouts.mutate()} />
        </Card>
      )}

      {active.map((id) => <ActiveDelivery key={id} id={id} />)}

      <T size={18} weight="800">{t("Courses disponibles")}</T>
      {!online ? <Empty emoji="😴" title={t("Vous êtes hors ligne")} />
        : list.isLoading ? <Loading />
        : !list.data?.length ? <Empty emoji="📡" title={t("Aucune course pour l'instant")} text={t("Restez en ligne : vous serez notifié dès qu'une commande est prête près de vous.")} />
        : list.data.map((d) => <Offer key={d.delivery_id} d={d} busy={accept.isPending || decline.isPending} onAccept={() => accept.mutate(d.delivery_id)} onDecline={() => decline.mutate(d.delivery_id)} />)}

      {courier.stripe_account_id && <Button variant="ghost" title={t("Voir mes virements")} onPress={() => payouts.mutate()} />}
      <Button variant="ghost" title={t("Vos droits de livreur indépendant")} onPress={() => Linking.openURL(`${SITE_URL}/legal/livreurs`)} />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return <Card style={{ flex: 1, padding: 12 }}><T size={11} color={c.muted}>{label}</T><T size={17} weight="800">{value}</T></Card>;
}

function Offer({ d, onAccept, onDecline, busy }: { d: AvailableDelivery; onAccept: () => void; onDecline: () => void; busy: boolean }) {
  const c = useColors();
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T size={24} weight="800" color={c.success}>{formatMoney(d.payout_cents, d.currency)}</T>
        <Badge label={d.order_status === "ready" ? t("Prête") : t("En préparation")} color={d.order_status === "ready" ? c.success : c.muted} />
      </View>
      {d.tip_cents > 0 && <T size={12} color={c.success}>{t("dont {tip} de pourboire", { tip: formatMoney(d.tip_cents, d.currency) })}</T>}
      <T>👩‍🍳 {d.kitchen_name} · {t("à {d} de vous", { d: km(d.pickup_distance_m) })}</T>
      <T>🏠 {d.dropoff_postal_code} {d.dropoff_city} · {t("trajet {d}", { d: km(d.distance_m) })}</T>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button style={{ flex: 1 }} title={t("Accepter")} icon="checkmark" disabled={busy} onPress={onAccept} />
        <Button variant="outline" title={t("Refuser")} disabled={busy} onPress={onDecline} />
      </View>
    </Card>
  );
}

function ActiveDelivery({ id }: { id: string }) {
  const c = useColors();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const q = useQuery({ queryKey: ["delivery", id], queryFn: () => fetchDeliveryDetails(id), refetchInterval: 15000 });
  const step = useMutation({
    mutationFn: (v: { step: "at_pickup" | "picked_up" | "delivered"; code?: string }) => deliveryStep(id, v.step, v.code),
    onSuccess: (d, v) => {
      qc.setQueryData(["delivery", id], d);
      if (v.step === "delivered") { Alert.alert(t("Livraison terminée, merci ! 🎉")); qc.invalidateQueries({ queryKey: ["courier-dash"] }); }
    },
    onError: (e) => Alert.alert(t("Impossible"), errorMessage(e)),
  });
  const cancel = useMutation({ mutationFn: () => courierCancel(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["courier-dash"] }) });
  const d: DeliveryDetails | null | undefined = q.data;
  if (!d) return q.isLoading ? <Loading /> : null;
  const toDropoff = d.status === "picked_up";
  const target = toDropoff ? d.dropoff : d.pickup;
  return (
    <Card style={{ gap: 10, borderColor: c.primary }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T weight="800">n°{d.order_number} · {t(DELIVERY_STATUS_LABELS[d.status])}</T>
        <T weight="800" color={c.success}>{formatMoney(d.payout_cents, d.currency)}</T>
      </View>
      <View style={{ gap: 2, opacity: toDropoff ? 0.5 : 1 }}>
        <T size={12} color={c.muted}>👩‍🍳 {t("Retrait")} · {d.kitchen_name}</T>
        {d.pickup && <T>{d.pickup.line1}, {d.pickup.postal_code} {d.pickup.city}</T>}
      </View>
      <View style={{ gap: 2, opacity: toDropoff ? 1 : 0.6 }}>
        <T size={12} color={c.muted}>🏠 {t("Livraison")} · {d.dropoff?.customer_name}</T>
        {d.dropoff && <T>{d.dropoff.line1}, {d.dropoff.postal_code} {d.dropoff.city}</T>}
        {d.dropoff?.instructions && <T size={13} color={c.warn}>📝 {d.dropoff.instructions}</T>}
      </View>
      <T size={13} color={c.muted}>{d.items.map((i) => `${i.quantity}× ${i.title}`).join(" · ")}</T>
      {target && <Button variant="outline" title={t("Itinéraire")} icon="navigate" onPress={() => openMaps(target.lat, target.lng)} />}
      {d.status === "assigned" && <Button title={t("Je suis arrivé à la cuisine")} loading={step.isPending} onPress={() => step.mutate({ step: "at_pickup" })} />}
      {(d.status === "assigned" || d.status === "at_pickup") && (
        <>
          {d.order_status !== "ready" && <T size={13} color={c.warn}>⏳ {t("La commande est encore en préparation. Attendez qu'elle soit prête pour la récupérer.")}</T>}
          <Button title={t("Commande récupérée")} disabled={d.order_status !== "ready"} loading={step.isPending} onPress={() => step.mutate({ step: "picked_up" })} />
          <Button variant="ghost" title={t("Me désister")} onPress={() => Alert.alert(t("Se désister de cette course ?"), t("Elle sera proposée à un autre livreur. Aucune pénalité."), [{ text: t("Garder") }, { text: t("Me désister"), style: "destructive", onPress: () => cancel.mutate() }])} />
        </>
      )}
      {d.status === "picked_up" && (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}><Input label={t("Code du client")} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" maxLength={4} /></View>
          <Button title={t("Livrée")} disabled={code.length !== 4} loading={step.isPending} onPress={() => step.mutate({ step: "delivered", code })} />
        </View>
      )}
    </Card>
  );
}
