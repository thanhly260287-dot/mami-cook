import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DELIVERY_STATUS_LABELS, formatMoney, ORDER_STATUS_LABELS, relativeDay, t, VEHICLES } from "@mami/shared";
import { createReview, fetchDeliveryTracking, fetchMessages, fetchOrder, fetchPickupAddress, orderAction, sendMessage } from "@/lib/api";
import { errorMessage, SITE_URL, supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/providers";
import { useColors } from "@/lib/theme";
import { Badge, Button, Card, Empty, Input, Loading, T } from "@/components/ui";

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["order", id], queryFn: () => fetchOrder(id), refetchInterval: (s) => (s.state.data?.status === "pending_payment" ? 2500 : 20000) });
  const msgs = useQuery({ queryKey: ["messages", id], queryFn: () => fetchMessages(id), refetchInterval: 10000 });
  const accepted = ["accepted", "preparing", "ready"].includes(q.data?.status ?? "");
  const pickup = useQuery({ queryKey: ["pickup", id, q.data?.status], queryFn: () => fetchPickupAddress(id), enabled: accepted && q.data?.fulfillment === "pickup" && q.data.customer_id === userId });
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [courierRating, setCourierRating] = useState(0);
  const isCourier = q.data?.fulfillment === "courier";
  const tracking = useQuery({
    queryKey: ["tracking", id], queryFn: () => fetchDeliveryTracking(id), refetchInterval: 15000,
    enabled: isCourier && !["completed", "cancelled", "refunded", "expired", "pending_payment"].includes(q.data?.status ?? ""),
  });
  const [comment, setComment] = useState("");

  // Temps réel : statut et messages
  useEffect(() => {
    if (!supabase) return;
    const ch = supabase.channel(`m-order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["order", id] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `order_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["messages", id] }))
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [id, qc]);

  const act = useMutation({
    mutationFn: (to: string) => orderAction(id, to, { note: to === "cancelled" ? "Annulée par le client" : undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order", id] }),
    onError: (e) => Alert.alert(t("Impossible"), errorMessage(e)),
  });
  const send = useMutation({ mutationFn: () => sendMessage(id, userId!, text.trim()), onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["messages", id] }); }, onError: (e) => Alert.alert(t("Erreur"), errorMessage(e)) });
  const review = useMutation({ mutationFn: () => createReview(q.data!, userId!, rating, comment, courierRating), onSuccess: () => Alert.alert(t("Merci !"), t("Votre avis est publié ⭐")), onError: (e) => Alert.alert(t("Erreur"), errorMessage(e)) });

  if (q.isLoading) return <Loading />;
  const o = q.data;
  if (!o) return <Empty emoji="📦" title={t("Commande introuvable")} />;
  const isCustomer = o.customer_id === userId;
  const formatEuros = (cents: number) => formatMoney(cents, o.currency ?? "EUR");
  const tr = tracking.data;
  const vehicle = VEHICLES.find((v) => v.id === tr?.courier?.vehicle);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <View style={{ gap: 4 }}>
          <T size={13} color={c.muted}>{t("Commande n°")}{o.number} · {o.cooks?.kitchen_name}</T>
          <T size={24} weight="800">{t(ORDER_STATUS_LABELS[o.status])}</T>
          <Badge label={`${o.fulfillment === "pickup" ? t("🏠 Retrait") : isCourier ? t("⚡ Livreur MAMI COOK") : t("🛵 Livraison")} · ${relativeDay(o.scheduled_for)}`} color={c.primary} />
        </View>

        {tr && (
          <Card style={{ gap: 6, borderColor: c.primary }}>
            <T size={12} color={c.muted}>{t("Livraison")}</T>
            <T size={18} weight="800">{t(DELIVERY_STATUS_LABELS[tr.status])}</T>
            {tr.courier && <T color={c.muted}>{vehicle?.emoji} {tr.courier.name}{tr.courier.rating_count > 0 ? ` · ⭐ ${Number(tr.courier.rating).toFixed(1)}` : ""}</T>}
            {isCustomer && ["assigned", "at_pickup", "picked_up"].includes(tr.status) && (
              <View style={{ alignItems: "center", paddingTop: 6 }}>
                <T size={12} color={c.muted}>{t("Code à donner au livreur")}</T>
                <T size={40} weight="800" style={{ letterSpacing: 10 }}>{o.pickup_code}</T>
              </View>
            )}
            {tr.courier?.lat != null && tr.courier.lng != null && (
              <Button variant="ghost" title={t("Voir le livreur sur la carte")} icon="map" onPress={() => Linking.openURL(Platform.OS === "ios" ? `maps:?q=${tr.courier!.lat},${tr.courier!.lng}` : `geo:${tr.courier!.lat},${tr.courier!.lng}?q=${tr.courier!.lat},${tr.courier!.lng}`)} />
            )}
          </Card>
        )}

        {isCustomer && o.fulfillment === "pickup" && ["paid", "accepted", "preparing", "ready"].includes(o.status) && (
          <Card style={{ alignItems: "center", gap: 6, borderColor: c.primary }}>
            <T size={13} color={c.muted}>{t("Code de retrait")}</T>
            <T size={44} weight="800" style={{ letterSpacing: 10 }}>{o.pickup_code}</T>
            {pickup.data?.line1 ? (
              <>
                <T weight="600" style={{ textAlign: "center" }}>📍 {pickup.data.line1}, {pickup.data.postal_code} {pickup.data.city}</T>
                <Button variant="ghost" title={t("Itinéraire")} icon="navigate" onPress={() => Linking.openURL(Platform.OS === "ios" ? `maps:?daddr=${pickup.data!.lat},${pickup.data!.lng}` : `geo:0,0?q=${pickup.data!.lat},${pickup.data!.lng}`)} />
              </>
            ) : <T size={12} color={c.muted} style={{ textAlign: "center" }}>{t("L'adresse s'affiche dès que la cuisinière accepte la commande.")}</T>}
          </Card>
        )}

        <Card style={{ gap: 6 }}>
          {o.order_items?.map((i) => <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between" }}><T style={{ flex: 1 }}>{i.quantity}× {i.title}</T><T>{formatEuros(i.line_total_cents)}</T></View>)}
          <View style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }} />
          {(o.tip_cents ?? 0) > 0 && <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T>{t("Pourboire livreur")}</T><T>{formatEuros(o.tip_cents!)}</T></View>}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T weight="800">{t("Total")}</T><T weight="800">{formatEuros(o.total_cents)}</T></View>
          {o.paid_at && <Button variant="ghost" title={t("Reçu")} icon="receipt-outline" onPress={() => Linking.openURL(`${SITE_URL}/commande/${o.id}/recu`)} />}
        </Card>

        {isCustomer && (isCourier ? o.status === "out_for_delivery" : ["ready", "out_for_delivery"].includes(o.status)) && <Button title={t("J'ai bien reçu ma commande")} icon="checkmark-circle" loading={act.isPending} onPress={() => act.mutate("completed")} />}
        {isCustomer && ["pending_payment", "paid"].includes(o.status) && (
          <Button variant="outline" title={t("Annuler la commande")} onPress={() => Alert.alert(t("Annuler ?"), t("Vous serez remboursé intégralement."), [{ text: t("Non") }, { text: t("Oui, annuler"), style: "destructive", onPress: () => act.mutate("cancelled") }])} />
        )}

        {isCustomer && o.status === "completed" && (
          <Card style={{ gap: 10 }}>
            <T weight="700">{t("Votre avis")}</T>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} accessibilityRole="radio" accessibilityState={{ selected: rating === n }} accessibilityLabel={t(n > 1 ? "{n} étoiles" : "{n} étoile", { n })} hitSlop={6}>
                  <T size={34} color={n <= rating ? c.accent : c.muted}>{n <= rating ? "★" : "☆"}</T>
                </Pressable>
              ))}
            </View>
            {isCourier && (
              <View style={{ gap: 4 }}>
                <T size={13} weight="600">{t("Et la livraison ?")}</T>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setCourierRating(n)} accessibilityRole="radio" accessibilityState={{ selected: courierRating === n }} accessibilityLabel={t(n > 1 ? "{n} étoiles" : "{n} étoile", { n })} hitSlop={6}>
                      <T size={26} color={n <= courierRating ? c.accent : c.muted}>{n <= courierRating ? "★" : "☆"}</T>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <Input value={comment} onChangeText={setComment} placeholder={t("Racontez-nous (facultatif)")} multiline maxLength={1000} />
            <Button title={t("Publier")} disabled={!rating} loading={review.isPending} onPress={() => review.mutate()} />
          </Card>
        )}

        {!["pending_payment", "expired"].includes(o.status) && (
          <Card style={{ gap: 8 }}>
            <T weight="700">{t("💬 Messages")}</T>
            {(msgs.data ?? []).map((m) => (
              <View key={m.id} style={{ alignSelf: m.sender_id === userId ? "flex-end" : "flex-start", backgroundColor: m.sender_id === userId ? c.primary : c.input, borderRadius: 14, padding: 10, maxWidth: "85%" }}>
                <T color={m.sender_id === userId ? "#fff" : c.text}>{m.body}</T>
              </View>
            ))}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <View style={{ flex: 1 }}><Input value={text} onChangeText={setText} placeholder={t("Votre message…")} maxLength={2000} /></View>
              <Button title={t("Envoyer")} disabled={!text.trim()} loading={send.isPending} onPress={() => send.mutate()} />
            </View>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
