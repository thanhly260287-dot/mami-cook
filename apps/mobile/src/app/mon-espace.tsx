// Tableau de bord personnel du client : commandes, économies, goûts, cuisines préférées.
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { cuisineLabel, formatMoney, t } from "@mami/shared";
import { fetchCustomerDashboard } from "@/lib/api";
import { useAuth } from "@/hooks/providers";
import { useColors } from "@/lib/theme";
import { Badge, Button, Card, Empty, Loading, T } from "@/components/ui";

export default function MySpaceScreen() {
  const c = useColors();
  const { userId } = useAuth();
  const q = useQuery({ queryKey: ["customer-dashboard"], queryFn: fetchCustomerDashboard, enabled: !!userId });
  if (!userId) return <Empty emoji="🔒" title={t("Connectez-vous")} action={<Button title={t("Se connecter / S'inscrire")} onPress={() => router.push("/connexion")} />} />;
  if (q.isLoading) return <Loading />;
  const d = q.data;
  if (!d) return null;
  const cur = d.spent[0]?.currency ?? "EUR";
  const max = Math.max(1, ...d.monthly.map((m) => m.orders));
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Stat label={t("Commandes")} value={String(d.orders)} />
        <Stat label={t("Plats dégustés")} value={String(d.plates)} />
        <Stat label={t("Économisé")} value={formatMoney(d.saved_cents, cur)} />
        <Stat label={t("Cuisines favorites")} value={String(d.favorites)} />
      </View>
      <Card style={{ gap: 8 }}>
        <T weight="700">{t("Vos goûts")}</T>
        {d.top_cuisines.length === 0 ? <T color={c.muted}>{t("Commandez pour découvrir vos préférences !")}</T>
          : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{d.top_cuisines.map((x) => <Badge key={x.cuisine} label={`${cuisineLabel(x.cuisine)} · ${x.n}`} color={c.primary} />)}</View>}
        {d.top_cooks.map((x) => <T key={x.slug} onPress={() => router.push(`/cuisine/${x.slug}`)} color={c.primary}>{x.kitchen_name} · {t("{n} commandes", { n: x.n })}</T>)}
      </Card>
      <Card style={{ gap: 8 }}>
        <T weight="700">{t("Commandes par mois")}</T>
        {d.monthly.length === 0 ? <T color={c.muted}>{t("Pas encore de commande terminée.")}</T> : (
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 110, gap: 6 }}>
            {d.monthly.map((m) => (
              <View key={m.month} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <View style={{ width: "100%", height: Math.max(4, (m.orders / max) * 90), backgroundColor: c.primary, borderRadius: 6 }} />
                <T size={10} color={c.muted}>{m.month.slice(5)}</T>
              </View>
            ))}
          </View>
        )}
        <T size={13} color={c.muted}>⭐ {t("{n} avis publiés", { n: d.reviews })}{d.tips_cents > 0 ? ` · 🎁 ${t("{tip} de pourboires offerts", { tip: formatMoney(d.tips_cents, cur) })}` : ""}</T>
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return <Card style={{ width: "48%", padding: 12 }}><T size={12} color={c.muted}>{label}</T><T size={20} weight="800">{value}</T></Card>;
}
