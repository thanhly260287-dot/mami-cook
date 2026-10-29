import { t , getLocale, LOCALES } from "@mami/shared";
import { Alert, Linking, Pressable, ScrollView, Share, View } from "react-native";
import { changeLocale } from "@/lib/i18n";
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
      await Share.share({ message: JSON.stringify(data, null, 2), title: t("Mes données MAMI COOK") });
    } catch (e) { Alert.alert(t("Erreur"), errorMessage(e)); }
  };
  const deleteAccount = () => Alert.alert(t("Supprimer mon compte ?"), t("Action définitive. Vos commandes sont conservées anonymement pour nos obligations comptables."), [
    { text: t("Annuler"), style: "cancel" },
    { text: t("Supprimer"), style: "destructive", onPress: async () => {
      try { await callFunction("delete-account", {}); await signOut(); Alert.alert(t("Compte supprimé"), t("Au revoir 👋")); } catch (e) { Alert.alert(t("Impossible"), errorMessage(e)); }
    } },
  ]);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      {session ? (
        <Card><T size={13} color={c.muted}>{t("Connecté")}</T><T weight="700">{session.user.email}</T></Card>
      ) : (
        <Card style={{ gap: 10 }}><T weight="700">{t("Bienvenue !")}</T><T color={c.muted}>{t("Connectez-vous pour commander et suivre vos plats.")}</T><Button title={t("Se connecter / S'inscrire")} onPress={() => router.push("/connexion")} /></Card>
      )}
      <Card style={{ paddingVertical: 4 }}>
        {cook ? item("restaurant", t("Ma cuisine"), () => router.push("/cuisinier")) : item("restaurant-outline", t("Devenir Mami Cook"), () => Linking.openURL(`${SITE_URL}/devenir-cuisinier`))}
        {item("help-circle-outline", t("Aide"), () => Linking.openURL(`${SITE_URL}/aide`))}
        {item("document-text-outline", t("Conditions générales"), () => Linking.openURL(`${SITE_URL}/legal/cgu`))}
        {item("shield-checkmark-outline", t("Confidentialité"), () => Linking.openURL(`${SITE_URL}/legal/confidentialite`))}
      </Card>
      <Card style={{ gap: 8 }}>
        <T weight="700">🌍 {t("Langue")}</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {LOCALES.map((l) => (
            <Pressable key={l.id} onPress={() => changeLocale(l.id)} accessibilityRole="radio" accessibilityState={{ selected: getLocale() === l.id }}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: getLocale() === l.id ? c.primary : c.border, backgroundColor: getLocale() === l.id ? c.primary + "18" : c.card }}>
              <T size={14} weight={getLocale() === l.id ? "700" : "400"}>{l.flag} {l.label}</T>
            </Pressable>
          ))}
        </View>
      </Card>
      {session && (
        <Card style={{ paddingVertical: 4 }}>
          {item("settings-outline", t("Profil, adresses, sécurité (2FA)"), () => Linking.openURL(`${SITE_URL}/compte`))}
          {item("download-outline", t("Exporter mes données"), exportData)}
          {item("log-out-outline", t("Se déconnecter"), () => signOut())}
          {item("trash-outline", t("Supprimer mon compte"), deleteAccount, true)}
        </Card>
      )}
      <View style={{ alignItems: "center", paddingTop: 10 }}><T size={12} color={c.muted}>{t("MAMI COOK · v1.0.0")}</T></View>
    </ScrollView>
  );
}
