import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { formatEuros, ORDER_STATUS_LABELS, t, intlLocale } from "@mami/shared";
import { useAuth } from "@/hooks/providers";
import { fetchMyOrders } from "@/lib/api";
import { useColors } from "@/lib/theme";
import { Badge, Button, Card, Empty, Loading, T } from "@/components/ui";

export default function OrdersScreen() {
  const c = useColors();
  const { userId } = useAuth();
  const q = useQuery({ queryKey: ["my-orders", userId], queryFn: () => fetchMyOrders(userId!), enabled: !!userId });
  if (!userId) return <Empty emoji="📦" title={t("Connectez-vous pour voir vos commandes")} action={<Button title={t("Se connecter")} onPress={() => router.push("/connexion")} />} />;
  if (q.isLoading) return <Loading />;
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      data={q.data ?? []}
      keyExtractor={(o) => o.id}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { q.refetch(); }} />}
      ListEmptyComponent={<Empty emoji="📦" title={t("Aucune commande pour l'instant")} />}
      renderItem={({ item: o }) => (
        <Pressable onPress={() => router.push(`/commande/${o.id}`)}>
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <T weight="700">{o.cooks?.kitchen_name}</T>
              <T weight="800">{formatEuros(o.total_cents)}</T>
            </View>
            <Badge label={t(ORDER_STATUS_LABELS[o.status])} color={o.status === "completed" ? c.success : ["cancelled", "refunded"].includes(o.status) ? c.danger : c.primary} />
            <T size={13} color={c.muted} numberOfLines={1}>{o.order_items?.map((i) => `${i.quantity}× ${i.title}`).join(", ")}</T>
            <T size={12} color={c.muted}>n°{o.number} · {new Date(o.created_at).toLocaleDateString(intlLocale())}</T>
          </Card>
        </Pressable>
      )}
    />
  );
}
