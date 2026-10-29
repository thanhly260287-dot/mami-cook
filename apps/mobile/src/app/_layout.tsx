import { t , getLocale } from "@mami/shared";
import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StripeProvider } from "@/lib/stripe";
import * as Notifications from "expo-notifications";
import { AuthProvider, CartProvider, GeoProvider } from "@/hooks/providers";
import { useColors } from "@/lib/theme";
import { onLocaleChange } from "@/lib/i18n";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } });

function useNotificationNavigation() {
  // Ouvre la commande quand on touche une notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const orderId = r.notification.request.content.data?.order_id;
      if (typeof orderId === "string") router.push(`/commande/${orderId}`);
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const c = useColors();
  useNotificationNavigation();
  // Changer de langue reconstruit l'interface pour retraduire tous les écrans.
  const [locale, setLocaleState] = useState(getLocale());
  useEffect(() => onLocaleChange(setLocaleState), []);
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_demo"} merchantIdentifier="merchant.fr.mamicook" urlScheme="mamicook">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GeoProvider>
            <CartProvider>
              <StatusBar style="auto" />
              <Stack key={locale} screenOptions={{ headerTintColor: c.text, headerStyle: { backgroundColor: c.card }, contentStyle: { backgroundColor: c.bg }, headerBackTitle: t("Retour") }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="plat/[id]" options={{ title: "" }} />
                <Stack.Screen name="cuisine/[slug]" options={{ title: "" }} />
                <Stack.Screen name="commande/[id]" options={{ title: t("Ma commande") }} />
                <Stack.Screen name="connexion" options={{ title: t("Connexion"), presentation: "modal" }} />
                <Stack.Screen name="cuisinier/index" options={{ title: t("Ma cuisine") }} />
              </Stack>
            </CartProvider>
          </GeoProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StripeProvider>
  );
}
