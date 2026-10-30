import { FlatList, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { cuisineLabel, t } from "@mami/shared";
import { fetchCook, fetchFeed } from "@/lib/api";
import { useGeo } from "@/hooks/providers";
import { useColors } from "@/lib/theme";
import { DishCard } from "@/components/DishCard";
import { Card, Empty, Loading, T } from "@/components/ui";

export default function CookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors();
  const geo = useGeo();
  const cook = useQuery({ queryKey: ["cook", slug], queryFn: () => fetchCook(slug) });
  const dishes = useQuery({ queryKey: ["cook-feed", cook.data?.id], enabled: !!cook.data, queryFn: () => fetchFeed({ lat: geo.lat, lng: geo.lng, cookId: cook.data!.id }) });
  if (cook.isLoading) return <Loading />;
  if (!cook.data) return <Empty emoji="🏠" title={t("Cuisine introuvable")} />;
  const k = cook.data;
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={dishes.data ?? []}
      keyExtractor={(d) => d.drop_id}
      renderItem={({ item, index }) => <DishCard item={item} index={index} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Stack.Screen options={{ title: k.kitchen_name }} />
          <Card style={{ gap: 6 }}>
            <T size={24} weight="800">{k.kitchen_name}</T>
            <T color={c.muted}>⭐ {Number(k.rating_avg).toFixed(1)} · {k.rating_count}{" "}{t("avis ·")}{" "}{k.city ?? ""}</T>
            <T size={13} color={c.muted}>{k.cuisines.map(cuisineLabel).join(" · ")}</T>
            {k.bio && <T style={{ marginTop: 6, lineHeight: 21 }}>{k.bio}</T>}
            <T size={13} color={c.success} weight="600">{t("✓ Cuisine vérifiée")}{" "}{k.offers_pickup ? t("· Retrait") : ""} {k.offers_delivery ? t("· Livraison {km} km", { km: k.delivery_radius_km }) : ""}</T>
          </Card>
          <T size={20} weight="800" style={{ marginTop: 18 }}>{t("Au menu cette semaine")}</T>
        </View>
      }
      ListEmptyComponent={dishes.isLoading ? <Loading /> : <Empty emoji="📅" title={t("Aucun plat programmé")} />}
    />
  );
}
