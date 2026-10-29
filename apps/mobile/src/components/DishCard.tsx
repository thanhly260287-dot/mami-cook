import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { cuisineLabel, formatDistance, formatEuros, formatTime, relativeDay, type FeedItem, t } from "@mami/shared";
import { photoUrl } from "@/lib/supabase";
import { radius, useColors } from "@/lib/theme";
import { T } from "./ui";

export function DishCard({ item }: { item: FeedItem }) {
  const c = useColors();
  const soldOut = item.quantity_remaining === 0;
  return (
    <Pressable onPress={() => router.push(`/plat/${item.drop_id}`)} accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.cook_name}, ${formatEuros(item.customer_price_cents)}`}
      style={({ pressed }) => ({ backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: "hidden", opacity: pressed ? 0.92 : 1, marginBottom: 16 })}>
      <View>
        <Image source={{ uri: photoUrl(item.photos[0]) }} style={{ width: "100%", aspectRatio: 16 / 11, opacity: soldOut ? 0.5 : 1 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}>
          <T size={12} weight="700" color="#1D2433">{soldOut ? t("Épuisé") : `🔥 ${t(item.quantity_remaining > 1 ? "{n} restants" : "{n} restant", { n: item.quantity_remaining })}`}</T>
        </View>
        <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}>
          <T size={12} color="#5F6B7E">{cuisineLabel(item.cuisine)}</T>
        </View>
        {item.menu_deal && (
          <View style={{ position: "absolute", bottom: 10, left: 10, backgroundColor: c.accent, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}>
            <T size={12} weight="700" color="#fff">🍽 {item.menu_deal.name} · {formatEuros(item.menu_deal.customer_price_cents)}</T>
          </View>
        )}
      </View>
      <View style={{ padding: 14, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <T size={16} weight="700" style={{ flex: 1 }} numberOfLines={2}>{item.title}</T>
          <T size={16} weight="800">{formatEuros(item.customer_price_cents)}</T>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="checkmark-circle" size={14} color={c.primary} />
          <T size={13} color={c.muted}>{item.cook_name}{" "}{t("· Vérifié")}</T>
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          <T size={12} color={c.muted}>⭐ {Number(item.dish_rating || item.cook_rating).toFixed(1)} ({item.dish_rating_count || item.cook_rating_count})</T>
          {item.distance_m != null && <T size={12} color={c.muted}>📍 {formatDistance(item.distance_m)}</T>}
          <T size={12} color={c.muted}>🕐 {relativeDay(item.available_on)} {formatTime(item.ready_from)}</T>
        </View>
      </View>
    </Pressable>
  );
}
