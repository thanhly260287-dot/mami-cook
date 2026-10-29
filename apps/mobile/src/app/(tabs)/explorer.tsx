import { COURSES, t } from "@mami/shared";
import { useEffect, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/api";
import { useGeo } from "@/hooks/providers";
import { useColors } from "@/lib/theme";
import { DishCard } from "@/components/DishCard";
import { Chip, Empty, Input, Loading, T } from "@/components/ui";

export default function Explore() {
  const c = useColors();
  const geo = useGeo();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(10);
  const [course, setCourse] = useState("");
  useEffect(() => { const t = setTimeout(() => setQuery(text), 350); return () => clearTimeout(t); }, [text]);
  const q = useQuery({ queryKey: ["explore", geo.lat, geo.lng, query, radius, course], queryFn: () => fetchFeed({ lat: geo.lat, lng: geo.lng, query, radiusKm: radius, course: course || null }) });

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      data={q.data ?? []}
      keyExtractor={(i) => i.drop_id}
      renderItem={({ item }) => <DishCard item={item} />}
      contentContainerStyle={{ padding: 16 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: 14 }}>
          <Input value={text} onChangeText={setText} placeholder={t("Lasagnes, phở, tajine…")} returnKeyType="search" clearButtonMode="while-editing" accessibilityLabel="Rechercher" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[{ id: "", label: "Tout", emoji: "🍽️" }, ...COURSES].map((x) => <Chip key={x.id || "all"} label={`${x.emoji} ${t(x.label)}`} active={course === x.id} onPress={() => setCourse(x.id)} />)}
          </ScrollView>
          <View style={{ flexDirection: "row" }}>
            {[3, 5, 10, 20].map((r) => <Chip key={r} label={`${r} km`} active={r === radius} onPress={() => setRadius(r)} />)}
          </View>
          <T size={13} color={c.muted}>{q.data?.length ?? 0}{" "}{t("plat(s) autour de")}{" "}{geo.label}</T>
        </View>
      }
      ListEmptyComponent={q.isLoading ? <Loading /> : <Empty emoji="🔍" title={t("Aucun résultat")} text={t("Élargissez le rayon ou changez de recherche.")} />}
    />
  );
}
