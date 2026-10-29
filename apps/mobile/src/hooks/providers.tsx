import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { computeOrderPrice, DEFAULT_LOCATION, MAX_QTY_PER_LINE, type Cook, type FeedItem, t } from "@mami/shared";
import { supabase } from "@/lib/supabase";
import { fetchMyCook } from "@/lib/api";

// ------------------------------------------------------------------ authentification
interface AuthState { session: Session | null; userId: string | null; loading: boolean; cook: Cook | null; refreshCook: () => void; signOut: () => Promise<void> }
const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const qc = useQueryClient();
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) qc.clear(); });
    return () => data.subscription.unsubscribe();
  }, [qc]);
  const userId = session?.user.id ?? null;
  const cook = useQuery({ queryKey: ["my-cook", userId], queryFn: () => fetchMyCook(userId!), enabled: !!userId });
  useEffect(() => { if (userId) registerPush(userId).catch(() => undefined); }, [userId]);

  const value = useMemo<AuthState>(() => ({
    session, userId, loading, cook: cook.data ?? null,
    refreshCook: () => qc.invalidateQueries({ queryKey: ["my-cook", userId] }),
    signOut: async () => { await supabase?.auth.signOut(); },
  }), [session, userId, loading, cook.data, qc]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => { const c = useContext(AuthCtx); if (!c) throw new Error(t("AuthProvider manquant")); return c; };

// Notifications push : jeton Expo enregistré pour la personne connectée.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function registerPush(userId: string) {
  if (!Device.isDevice || !supabase) return;
  if (Platform.OS === "android") {
    // eslint-disable-next-line import/namespace -- réexporté par expo-notifications (vérifié par tsc)
    await Notifications.setNotificationChannelAsync("commandes", { name: "Commandes", importance: Notifications.AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await supabase.from("push_tokens").upsert({ token, user_id: userId, platform: Platform.OS === "ios" ? "ios" : "android", updated_at: new Date().toISOString() });
}

// ------------------------------------------------------------------ position
interface Geo { lat: number; lng: number; label: string }
interface GeoState extends Geo { locate: () => Promise<void>; setLocation: (g: Geo) => void; locating: boolean }
const GeoCtx = createContext<GeoState | null>(null);

export function GeoProvider({ children }: { children: ReactNode }) {
  const [geo, setGeo] = useState<Geo>(DEFAULT_LOCATION);
  const [locating, setLocating] = useState(false);
  useEffect(() => { AsyncStorage.getItem("geo").then((v) => v && setGeo(JSON.parse(v))).catch(() => undefined); }, []);
  const setLocation = useCallback((g: Geo) => { setGeo(g); AsyncStorage.setItem("geo", JSON.stringify(g)).catch(() => undefined); }, []);
  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") throw new Error(t("Autorisez la localisation dans les réglages"));
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: place?.city ?? "Ma position" });
    } finally {
      setLocating(false);
    }
  }, [setLocation]);
  return <GeoCtx.Provider value={{ ...geo, locate, setLocation, locating }}>{children}</GeoCtx.Provider>;
}
export const useGeo = () => { const c = useContext(GeoCtx); if (!c) throw new Error(t("GeoProvider manquant")); return c; };

// ------------------------------------------------------------------ panier
export interface CartLine {
  key: string; dropId: string; cookId: string; cookName: string; title: string; photo: string | null; availableOn: string;
  unitCookPriceCents: number; extras: { id: string; name: string; price_cents: number }[]; menuDealId: string | null;
  quantity: number; maxQuantity: number; offersPickup: boolean; offersDelivery: boolean; deliveryFeeCents: number;
}
interface CartState {
  lines: CartLine[]; count: number;
  add: (item: FeedItem, o: { quantity: number; extraIds: string[]; menuDeal: boolean }) => { replaced: boolean };
  setQuantity: (k: string, q: number) => void; remove: (k: string) => void; clear: () => void;
  price: (delivery: boolean) => ReturnType<typeof computeOrderPrice>;
}
const CartCtx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const ref = useRef(lines);
  useEffect(() => { ref.current = lines; }, [lines]);
  const loaded = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem("cart").then((v) => {
      const today = new Date().toISOString().slice(0, 10);
      if (v) setLines((JSON.parse(v) as CartLine[]).filter((l) => l.availableOn >= today));
      loaded.current = true;
    }).catch(() => { loaded.current = true; });
  }, []);
  useEffect(() => { if (loaded.current) AsyncStorage.setItem("cart", JSON.stringify(lines)).catch(() => undefined); }, [lines]);

  const value = useMemo<CartState>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    add: (item, { quantity, extraIds, menuDeal }) => {
      const cur = ref.current;
      const replaced = cur.length > 0 && (cur[0].cookId !== item.cook_id || cur[0].availableOn !== item.available_on);
      const deal = menuDeal ? item.menu_deal : null;
      const key = [item.drop_id, deal?.id ?? "", ...[...extraIds].sort()].join("|");
      const max = Math.min(item.quantity_remaining, MAX_QTY_PER_LINE);
      setLines((prev) => {
        const base = replaced ? [] : prev;
        if (base.some((l) => l.key === key)) return base.map((l) => l.key === key ? { ...l, quantity: Math.min(l.quantity + quantity, max) } : l);
        return [...base, {
          key, dropId: item.drop_id, cookId: item.cook_id, cookName: item.cook_name, title: deal ? `${deal.name} (${item.title})` : item.title,
          photo: item.photos[0] ?? null, availableOn: item.available_on, unitCookPriceCents: deal ? deal.price_cents : item.price_cents,
          extras: item.extras.filter((e) => extraIds.includes(e.id)).map(({ id, name, price_cents }) => ({ id, name, price_cents })),
          menuDealId: deal?.id ?? null, quantity: Math.min(quantity, max), maxQuantity: max,
          offersPickup: item.offers_pickup, offersDelivery: item.offers_delivery, deliveryFeeCents: item.delivery_fee_cents,
        }];
      });
      return { replaced };
    },
    setQuantity: (k, q) => setLines((p) => p.map((l) => l.key === k ? { ...l, quantity: Math.max(1, Math.min(q, l.maxQuantity)) } : l)),
    remove: (k) => setLines((p) => p.filter((l) => l.key !== k)),
    clear: () => setLines([]),
    price: (delivery) => computeOrderPrice(
      lines.map((l) => ({ unitCookPriceCents: l.unitCookPriceCents, extrasCookPriceCents: l.extras.reduce((s, e) => s + e.price_cents, 0), quantity: l.quantity, isMenuDeal: !!l.menuDealId })),
      { deliveryFeeCents: delivery ? lines[0]?.deliveryFeeCents ?? 0 : 0 }),
  }), [lines]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export const useCart = () => { const c = useContext(CartCtx); if (!c) throw new Error(t("CartProvider manquant")); return c; };
