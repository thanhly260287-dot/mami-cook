import { useEffect, useState } from "react";
import { Alert, Linking, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatEuros, ORDER_STATUS_LABELS, relativeDay, formatTime, type Order, t } from "@mami/shared";
import { fetchCookOrders, fetchMyDrops, orderAction } from "@/lib/api";
import { errorMessage, SITE_URL, supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/providers";
import { useColors } from "@/lib/theme";
import { Badge, Button, Card, Chip, Empty, Input, Loading, T } from "@/components/ui";

const ACTIVE = ["paid", "accepted", "preparing", "ready", "out_for_delivery"];

export default function CookHome() {
  const c = useColors();
  const { cook } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"orders" | "drops">("orders");
  const orders = useQuery({ queryKey: ["cook-orders", cook?.id], queryFn: () => fetchCookOrders(cook!.id, ACTIVE), enabled: !!cook });
  const drops = useQuery({ queryKey: ["my-drops", cook?.id], queryFn: () => fetchMyDrops(cook!.id), enabled: !!cook && tab === "drops" });

  useEffect(() => {
    if (!supabase || !cook) return;
    const ch = supabase.channel(`m-cook-${cook.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `cook_id=eq.${cook.id}` }, () => qc.invalidateQueries({ queryKey: ["cook-orders"] }))
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [cook, qc]);

  if (!cook) return <Empty emoji="👩‍🍳" title={t("Pas encore de cuisine")} action={<Button title={t("Devenir Mami Cook")} onPress={() => Linking.openURL(`${SITE_URL}/devenir-cuisinier`)} />} />;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => { orders.refetch(); drops.refetch(); }} />}>
      <T size={22} weight="800">{cook.kitchen_name}</T>
      {cook.status !== "approved" && <Badge label={t("Cuisine en cours de validation")} color={c.warn} />}
      {cook.status === "approved" && !cook.stripe_charges_enabled && <Badge label={t("Connectez votre compte bancaire depuis le site")} color={c.warn} />}
      <View style={{ flexDirection: "row" }}>
        <Chip label={t("Commandes ({n})", { n: orders.data?.length ?? 0 })} active={tab === "orders"} onPress={() => setTab("orders")} />
        <Chip label={t("Mes ventes")} active={tab === "drops"} onPress={() => setTab("drops")} />
      </View>
      {tab === "orders" ? (
        orders.isLoading ? <Loading /> : !orders.data?.length ? <Empty emoji="🎉" title={t("Aucune commande en cours")} /> :
          orders.data.map((o) => <CookOrderCard key={o.id} order={o} />)
      ) : drops.isLoading ? <Loading /> : (
        <>
          {(drops.data ?? []).map((d) => (
            <Card key={d.id} style={{ gap: 4 }}>
              <T weight="700">{d.dishes?.title}</T>
              <T size={13} color={c.muted}>{relativeDay(d.available_on)}{" "}{t("dès")}{" "}{formatTime(d.ready_from)} · {d.quantity_total - d.quantity_remaining}/{d.quantity_total} vendus</T>
            </Card>
          ))}
          <Button variant="outline" title={t("Gérer plats et ventes sur le site")} icon="open-outline" onPress={() => Linking.openURL(`${SITE_URL}/cuisine/tableau-de-bord/ventes`)} />
        </>
      )}
      <Button variant="ghost" title={t("Tableau de bord complet")} onPress={() => Linking.openURL(`${SITE_URL}/cuisine/tableau-de-bord`)} />
    </ScrollView>
  );
}

function CookOrderCard({ order: o }: { order: Order & { customer: { display_name: string } | null } }) {
  const c = useColors();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const act = useMutation({
    mutationFn: (v: { to: string; note?: string; pickup_code?: string }) => orderAction(o.id, v.to, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cook-orders"] }),
    onError: (e) => Alert.alert(t("Impossible"), errorMessage(e)),
  });
  const next: Record<string, [string, string] | undefined> = {
    paid: ["accepted", "Accepter"], accepted: ["preparing", "Commencer"], preparing: ["ready", "Prête"],
    ready: o.fulfillment === "delivery" ? ["out_for_delivery", t("En livraison")] : undefined, out_for_delivery: ["completed", "Livrée"],
  };
  const n = next[o.status];
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T weight="800">n°{o.number} · {o.customer?.display_name}</T>
        <Badge label={o.fulfillment === "pickup" ? t("Retrait") : t("Livraison")} color={c.primary} />
      </View>
      <Badge label={t(ORDER_STATUS_LABELS[o.status])} />
      {o.order_items?.map((i) => <T key={i.id} size={14}>{i.quantity}× {i.title}</T>)}
      {o.note && <T size={13} color={c.warn}>📝 {o.note}</T>}
      {o.delivery_address && <T size={13} color={c.muted}>📍 {o.delivery_address.line1}, {o.delivery_address.city}</T>}
      <T size={13}>{t("Vous recevrez")}{" "}<T size={13} weight="700">{formatEuros(o.cook_payout_cents)}</T></T>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {n && <Button title={n[1]} loading={act.isPending} onPress={() => act.mutate({ to: n[0] })} />}
        {["paid", "accepted", "preparing"].includes(o.status) && (
          <Button variant="outline" title={o.status === "paid" ? t("Refuser") : t("Annuler")} onPress={() => Alert.alert(t("Refuser la commande ?"), t("Le client sera remboursé."), [{ text: t("Non") }, { text: t("Oui"), style: "destructive", onPress: () => act.mutate({ to: "cancelled", note: t("Refusée par la cuisine") }) }])} />
        )}
        <Button variant="ghost" title={t("Message")} onPress={() => router.push(`/commande/${o.id}`)} />
      </View>
      {o.status === "ready" && o.fulfillment === "pickup" && (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}><Input label={t("Code du client")} value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" maxLength={4} /></View>
          <Button title={t("Remettre")} disabled={code.length !== 4} loading={act.isPending} onPress={() => act.mutate({ to: "completed", pickup_code: code })} />
        </View>
      )}
    </Card>
  );
}
