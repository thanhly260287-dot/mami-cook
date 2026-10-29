import { useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { CUISINES } from "@mami/shared";
import { fetchFeed } from "@/lib/api";
import { DEMO_MODE, errorMessage, SITE_URL } from "@/lib/supabase";
import { useGeo } from "@/hooks/providers";
import { useColors } from "@/lib/theme";
import { DishCard } from "@/components/DishCard";
import { Chip, Empty, Loading, T } from "@/components/ui";

export default function Home() {
  const c = useColors();
  const geo = useGeo();
  const [cuisine, setCuisine] = useState("");
  const q = useQuery({ queryKey: ["feed", geo.lat, geo.lng, cuisine], queryFn: () => fetchFeed({ lat: geo.lat, lng: geo.lng, cuisine: cuisine || null }) });

  const header = (
    <View style={{ gap: 14, paddingBottom: 12 }}>
      {DEMO_MODE && <View style={{ backgroundColor: c.accent, borderRadius: 12, padding: 10 }}><T size={12} weight="600" color="#fff">{"Mode démo : données d'exemple."}</T></View>}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Image source={{ uri: `${SITE_URL}/images/logo.svg` }} style={{ width: 150, height: 32 }} contentFit="contain" accessibilityLabel="MAMI COOK" />
        <Pressable onPress={() => geo.locate().catch((e) => Alert.alert("Position", errorMessage(e)))} accessibilityRole="button" accessibilityLabel="Changer de position"
          style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.input, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Ionicons name={geo.locating ? "hourglass" : "location"} size={14} color={c.primary} />
          <T size={13} weight="600">{geo.label}</T>
        </Pressable>
      </View>
      <T size={30} weight="800" style={{ lineHeight: 34 }}>Manger comme{"\n"}<T size={30} weight="800" color={c.primary}>à la maison</T>, partout.</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip label="🍽️ Tout" active={!cuisine} onPress={() => setCuisine("")} />
        {CUISINES.map((x) => <Chip key={x.id} label={`${x.emoji} ${x.label}`} active={cuisine === x.id} onPress={() => setCuisine(x.id)} />)}
      </ScrollView>
      <T size={20} weight="800">{"Disponible aujourd'hui"}</T>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.drop_id}
        renderItem={({ item }) => <DishCard item={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={q.isLoading ? <Loading /> : <Empty emoji="🍳" title="Pas encore de plat près de chez vous" text="Essayez une autre cuisine ou une autre position." />}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { q.refetch(); }} />}
        initialNumToRender={4}
        windowSize={7}
      />
    </SafeAreaView>
  );
}
