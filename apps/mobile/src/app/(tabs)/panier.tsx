import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStripe } from "@/lib/stripe";
import { Ionicons } from "@expo/vector-icons";
import { formatEuros, MIN_ORDER_CENTS, relativeDay, t } from "@mami/shared";
import { useAuth, useCart } from "@/hooks/providers";
import { checkout, createAddress, fetchAddresses, searchAddress } from "@/lib/api";
import { DEMO_MODE, errorMessage, photoUrl } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { Button, Card, Empty, Input, Stepper, T } from "@/components/ui";

export default function CartScreen() {
  const c = useColors();
  const cart = useCart();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const first = cart.lines[0];
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");
  const [addressId, setAddressId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchAddress>>>([]);
  const [note, setNote] = useState("");
  const [promo, setPromo] = useState("");
  const [loading, setLoading] = useState(false);
  const addresses = useQuery({ queryKey: ["addresses", userId], queryFn: fetchAddresses, enabled: !!userId && !DEMO_MODE });
  const selected = addressId ?? addresses.data?.[0]?.id ?? null;
  const price = cart.price(mode === "delivery");
  // Une clé par contenu de panier : un double appui ne crée pas deux commandes.
  const idem = useRef<{ sig: string; key: string } | null>(null);

  if (!first) return <Empty emoji="🛍️" title={t("Votre panier est vide")} text={t("Les plats faits maison de votre quartier vous attendent.")} action={<Button title={t("Découvrir les plats")} onPress={() => router.navigate("/")} />} />;

  const pay = async () => {
    if (DEMO_MODE) return Alert.alert(t("Mode démo"), t("Le paiement sera actif une fois Supabase et Stripe configurés."));
    if (!userId) return router.push("/connexion");
    if (mode === "delivery" && !selected) return Alert.alert(t("Adresse"), t("Ajoutez une adresse de livraison."));
    const sig = JSON.stringify([cart.lines, mode, selected, promo]);
    if (idem.current?.sig !== sig) idem.current = { sig, key: newKey() };
    setLoading(true);
    try {
      const res = await checkout({
        lines: cart.lines.map((l) => ({ drop_id: l.dropId, quantity: l.quantity, extra_ids: l.extras.map((e) => e.id), menu_deal_id: l.menuDealId })),
        fulfillment: mode, address_id: mode === "delivery" ? selected : null, note: note.trim() || undefined, promo_code: promo.trim() || undefined, idempotency_key: idem.current.key,
      });
      if (!res.client_secret) { router.push(`/commande/${res.order_id}`); return; }
      const init = await initPaymentSheet({
        merchantDisplayName: "MAMI COOK", paymentIntentClientSecret: res.client_secret, returnURL: "mamicook://stripe-redirect",
        applePay: { merchantCountryCode: "FR" }, googlePay: { merchantCountryCode: "FR", currencyCode: "EUR", testEnv: __DEV__ },
        defaultBillingDetails: { address: { country: "FR" } },
      });
      if (init.error) throw new Error(init.error.message);
      const result = await presentPaymentSheet();
      if (result.error) { if (result.error.code !== "Canceled") Alert.alert(t("Paiement refusé"), result.error.message); return; }
      cart.clear();
      router.push(`/commande/${res.order_id}`);
    } catch (e) {
      Alert.alert(t("Commande impossible"), errorMessage(e));
      qc.invalidateQueries({ queryKey: ["feed"] });
    } finally {
      setLoading(false);
    }
  };

  const addAddress = async (a: (typeof results)[number]) => {
    try {
      const r = await createAddress(userId!, { ...a, label: t("Maison") });
      setAddressId(r.id); setSearch(""); setResults([]);
      qc.invalidateQueries({ queryKey: ["addresses"] });
    } catch (e) { Alert.alert(t("Erreur"), errorMessage(e)); }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <T color={c.muted}>{first.cookName} · {relativeDay(first.availableOn)}</T>
      <Card style={{ gap: 14 }}>
        {cart.lines.map((l) => (
          <View key={l.key} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Image source={{ uri: photoUrl(l.photo) }} style={{ width: 64, height: 64, borderRadius: 12 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <T weight="700" numberOfLines={2}>{l.title}</T>
              {l.extras.length > 0 && <T size={12} color={c.muted}>+ {l.extras.map((e) => e.name).join(", ")}</T>}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Stepper value={l.quantity} max={l.maxQuantity} onChange={(q) => cart.setQuantity(l.key, q)} />
                <Pressable onPress={() => cart.remove(l.key)} accessibilityLabel={t("Retirer {name}", { name: l.title })} hitSlop={10}><Ionicons name="trash-outline" size={20} color={c.muted} /></Pressable>
              </View>
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <T weight="700">{t("Mode de remise")}</T>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["pickup", "delivery"] as const).map((m) => {
            const ok = m === "pickup" ? first.offersPickup : first.offersDelivery;
            const on = mode === m;
            return (
              <Pressable key={m} disabled={!ok} onPress={() => setMode(m)} accessibilityState={{ selected: on, disabled: !ok }}
                style={{ flex: 1, borderWidth: 2, borderColor: on ? c.primary : c.border, borderRadius: 14, padding: 12, opacity: ok ? 1 : 0.4 }}>
                <Ionicons name={m === "pickup" ? "storefront-outline" : "bicycle-outline"} size={20} color={c.text} />
                <T weight="700">{m === "pickup" ? t("Retrait") : t("Livraison")}</T>
                <T size={12} color={c.muted}>{m === "pickup" ? t("Gratuit") : ok ? (first.deliveryFeeCents ? formatEuros(first.deliveryFeeCents) : t("Offerte")) : t("Non proposée")}</T>
              </Pressable>
            );
          })}
        </View>
        {mode === "delivery" && userId && (
          <View style={{ gap: 8 }}>
            {(addresses.data ?? []).map((a) => (
              <Pressable key={a.id} onPress={() => setAddressId(a.id)} style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: selected === a.id ? c.primary : c.border }}>
                <Ionicons name={selected === a.id ? "radio-button-on" : "radio-button-off"} size={18} color={c.primary} />
                <T size={14} style={{ flex: 1 }}>{a.line1}, {a.postal_code} {a.city}</T>
              </Pressable>
            ))}
            <Input value={search} onChangeText={async (t) => { setSearch(t); setResults(await searchAddress(t).catch(() => [])); }} placeholder={t("Ajouter une adresse…")} />
            {results.map((r) => <Pressable key={r.label} onPress={() => addAddress(r)} style={{ padding: 10 }}><T size={14}>📍 {r.label}</T></Pressable>)}
          </View>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <Input label={t("Un mot pour la cuisinière ?")} value={note} onChangeText={setNote} maxLength={500} placeholder={t("Sans coriandre svp…")} multiline />
        <Input label={t("Code promo")} value={promo} onChangeText={(t) => setPromo(t.toUpperCase())} autoCapitalize="characters" maxLength={30} />
      </Card>

      <Card style={{ gap: 6 }}>
        <Row label={t(price.totalPlates > 1 ? "Sous-total ({n} plats)" : "Sous-total ({n} plat)", { n: price.totalPlates })} value={formatEuros(price.subtotalCents)} />
        {price.discountCents > 0 && <Row label={t("Remise volume")} value={`−${formatEuros(price.discountCents)}`} color={c.success} />}
        {mode === "delivery" && <Row label={t("Livraison")} value={formatEuros(price.deliveryFeeCents)} />}
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }} />
        <Row label={t("Total")} value={formatEuros(price.totalCents)} bold />
        {price.totalPlates < 5 && <T size={12} color={c.success}>{t("Plus que {n} plat(s) pour −10 % !", { n: 5 - price.totalPlates })}</T>}
      </Card>
      <Button title={t("Payer {price}", { price: formatEuros(price.totalCents) })} icon="lock-closed" loading={loading} disabled={price.subtotalCents - price.discountCents < MIN_ORDER_CENTS} onPress={pay} />
      <T size={12} color={c.muted} style={{ textAlign: "center" }}>{t("Paiement sécurisé par Stripe · Apple Pay · Google Pay")}</T>
    </ScrollView>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T weight={bold ? "800" : "400"} color={color}>{label}</T><T weight={bold ? "800" : "600"} color={color}>{value}</T></View>;
}

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
