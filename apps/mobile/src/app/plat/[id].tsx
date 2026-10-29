import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ALLERGENS, DIETS, customerPrice, formatEuros, formatTime, relativeDay } from "@mami/shared";
import { fetchDrop } from "@/lib/api";
import { photoUrl } from "@/lib/supabase";
import { useCart } from "@/hooks/providers";
import { useColors } from "@/lib/theme";
import { Badge, Button, Card, Empty, Loading, Stepper, T } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const cart = useCart();
  const q = useQuery({ queryKey: ["drop", id], queryFn: () => fetchDrop(id) });
  const [qty, setQty] = useState(1);
  const [extras, setExtras] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  if (q.isLoading) return <Loading />;
  const it = q.data;
  if (!it) return <Empty emoji="🍽️" title="Ce plat n'est plus disponible" />;
  const unit = (menu && it.menu_deal ? it.menu_deal.price_cents : it.price_cents) + it.extras.filter((e) => extras.includes(e.id)).reduce((s, e) => s + e.price_cents, 0);
  const soldOut = it.quantity_remaining === 0;

  const add = () => {
    const { replaced } = cart.add(it, { quantity: qty, extraIds: extras, menuDeal: menu });
    Alert.alert("Ajouté au panier", replaced ? "Votre panier contenait une autre cuisine ou un autre jour : il a été remplacé." : `${qty} × ${it.title}`, [
      { text: "Continuer", style: "cancel" }, { text: "Voir le panier", onPress: () => router.navigate("/panier") },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: it.title }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Image source={{ uri: photoUrl(it.photos[0]) }} style={{ width: "100%", aspectRatio: 1 }} contentFit="cover" accessibilityLabel={it.title} />
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Badge label={{ hot: "🔥 Chaud", reheat: "♨️ À réchauffer", cold: "🥗 Froid", frozen: "🧊 Congelé" }[it.temperature]} color={c.success} />
            {it.diets.map((d) => <Badge key={d} label={DIETS.find((x) => x.id === d)?.label ?? d} color={c.accent} />)}
          </View>
          <T size={26} weight="800">{it.title}</T>
          <Pressable onPress={() => router.push(`/cuisine/${it.cook_slug}`)}><T weight="600" color={c.primary}>{it.cook_name} · ⭐ {Number(it.cook_rating).toFixed(1)} ({it.cook_rating_count}) ›</T></Pressable>
          {it.description && <T color={c.muted} style={{ lineHeight: 22 }}>{it.description}</T>}
          <T size={14}>🕐 {relativeDay(it.available_on)}, {formatTime(it.ready_from)}–{formatTime(it.ready_until)}   {it.offers_pickup ? "🏠 Retrait" : ""}  {it.offers_delivery ? "🛵 Livraison" : ""}</T>
          <Card style={{ backgroundColor: c.warn + "12", borderColor: c.warn + "55", gap: 6 }}>
            <T weight="700">⚠️ Allergènes</T>
            <T size={14}>{it.allergens.length ? it.allergens.map((a) => ALLERGENS.find((x) => x.id === a)?.label ?? a).join(" · ") : "Aucun des 14 allergènes réglementaires déclaré."}</T>
            <T size={12} color={c.muted}>{"Cuisine familiale : traces possibles. En cas d'allergie sévère, contactez la cuisinière avant de commander."}</T>
          </Card>
          {it.menu_deal && (
            <Pressable onPress={() => setMenu(!menu)} style={{ borderWidth: 2, borderColor: menu ? c.accent : c.border, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name={menu ? "checkbox" : "square-outline"} size={22} color={c.accent} />
              <View style={{ flex: 1 }}><T weight="700" color={c.accent}>{it.menu_deal.name}</T><T size={13} color={c.muted}>{it.menu_deal.items}</T></View>
              <T weight="800" color={c.accent}>{formatEuros(it.menu_deal.customer_price_cents)}</T>
            </Pressable>
          )}
          {it.extras.map((e) => {
            const on = extras.includes(e.id);
            return (
              <Pressable key={e.id} onPress={() => setExtras(on ? extras.filter((x) => x !== e.id) : [...extras, e.id])} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: on ? c.primary : c.border }}>
                <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={c.primary} />
                <T style={{ flex: 1 }}>{e.emoji} {e.name}</T>
                <T weight="600">+{formatEuros(e.customer_price_cents)}</T>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.card }}>
        <Stepper value={qty} max={Math.max(1, Math.min(it.quantity_remaining, 20))} onChange={setQty} />
        <Button style={{ flex: 1 }} title={soldOut ? "Épuisé" : `Ajouter · ${formatEuros(customerPrice(unit) * qty)}`} disabled={soldOut} onPress={add} />
      </View>
    </SafeAreaView>
  );
}
