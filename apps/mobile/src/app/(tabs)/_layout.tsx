import { t } from "@mami/shared";
import { Tabs } from "expo-router/js-tabs";
import type { ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/hooks/providers";
import { useColors } from "@/lib/theme";

export default function TabsLayout() {
  const c = useColors();
  const { count } = useCart();
  const icon = (name: keyof typeof Ionicons.glyphMap) => {
    const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;
    return TabIcon;
  };
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted, tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border }, headerStyle: { backgroundColor: c.card }, headerTintColor: c.text }}>
      <Tabs.Screen name="index" options={{ title: t("Accueil"), headerShown: false, tabBarIcon: icon("home") }} />
      <Tabs.Screen name="explorer" options={{ title: t("Explorer"), tabBarIcon: icon("search") }} />
      <Tabs.Screen name="panier" options={{ title: t("Panier"), tabBarIcon: icon("bag-handle"), tabBarBadge: count || undefined }} />
      <Tabs.Screen name="commandes" options={{ title: t("Commandes"), tabBarIcon: icon("receipt") }} />
      <Tabs.Screen name="compte" options={{ title: t("Compte"), tabBarIcon: icon("person-circle") }} />
    </Tabs>
  );
}
