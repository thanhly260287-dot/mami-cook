import { Alert, Linking, Pressable, ScrollView, Share, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/providers";
import { callFunction, requireSupabase, SITE_URL, errorMessage } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { Button, Card, T } from "@/components/ui";

export default function AccountScreen() {
  const c = useColors();
  const { session, cook, signOut } = useAuth();

  const item = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, danger?: boolean) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}>
      <Ionicons name={icon} size={22} color={danger ? c.danger : c.primary} />
      <T style={{ flex: 1 }} color={danger ? c.danger : undefined}>{label}</T>
      <Ionicons name="chevron-forward" size={18} color={c.muted} />
    </Pressable>
  );

  const exportData = async () => {
    try {
      const { data, error } = await requireSupabase().rpc("export_my_data");
      if (error) throw error;
      await Share.share({ message: JSON.stringify(data, null, 2), title: "Mes données MAMI COOK" });
    } catch (e) { Alert.alert("Erreur", errorMessage(e)); }
  };
  const deleteAccount = () => Alert.alert("Supprimer mon compte ?", "Action définitive. Vos commandes sont conservées anonymement pour nos obligations comptables.", [
    { text: "Annuler", style: "cancel" },
    { text: "Supprimer", style: "destructive", onPress: async () => {
      try { await callFunction("delete-account", {}); await signOut(); Alert.alert("Compte supprimé", "Au revoir 👋"); } catch (e) { Alert.alert("Impossible", errorMessage(e)); }
    } },
  ]);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      {session ? (
        <Card><T size={13} color={c.muted}>Connecté</T><T weight="700">{session.user.email}</T></Card>
      ) : (
        <Card style={{ gap: 10 }}><T weight="700">Bienvenue !</T><T color={c.muted}>Connectez-vous pour commander et suivre vos plats.</T><Button title="Se connecter / S'inscrire" onPress={() => router.push("/connexion")} /></Card>
      )}
      <Card style={{ paddingVertical: 4 }}>
        {cook ? item("restaurant", "Ma cuisine", () => router.push("/cuisinier")) : item("restaurant-outline", "Devenir Mami Cook", () => Linking.openURL(`${SITE_URL}/devenir-cuisinier`))}
        {item("help-circle-outline", "Aide", () => Linking.openURL(`${SITE_URL}/aide`))}
        {item("document-text-outline", "Conditions générales", () => Linking.openURL(`${SITE_URL}/legal/cgu`))}
        {item("shield-checkmark-outline", "Confidentialité", () => Linking.openURL(`${SITE_URL}/legal/confidentialite`))}
      </Card>
      {session && (
        <Card style={{ paddingVertical: 4 }}>
          {item("settings-outline", "Profil, adresses, sécurité (2FA)", () => Linking.openURL(`${SITE_URL}/compte`))}
          {item("download-outline", "Exporter mes données", exportData)}
          {item("log-out-outline", "Se déconnecter", () => signOut())}
          {item("trash-outline", "Supprimer mon compte", deleteAccount, true)}
        </Card>
      )}
      <View style={{ alignItems: "center", paddingTop: 10 }}><T size={12} color={c.muted}>MAMI COOK · v1.0.0</T></View>
    </ScrollView>
  );
}
