import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const DEMO_MODE = !url || !anonKey || url.includes("xxxxxxxx");
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? "https://mamicook.fr";

/**
 * Stockage de la session dans le trousseau chiffré du téléphone (Keychain iOS /
 * Keystore Android). SecureStore limite chaque valeur à ~2 Ko : la session est
 * découpée en morceaux.
 */
const CHUNK = 1800;
const secureStorage = {
  async getItem(key: string) {
    const n = await SecureStore.getItemAsync(`${key}.n`);
    if (!n) return null;
    const parts = await Promise.all(Array.from({ length: Number(n) }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.some((p) => p == null) ? null : parts.join("");
  },
  async setItem(key: string, value: string) {
    const old = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    const chunks = value.match(new RegExp(`.{1,${CHUNK}}`, "gs")) ?? [""];
    for (const [i, c] of chunks.entries()) await SecureStore.setItemAsync(`${key}.${i}`, c, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    await SecureStore.setItemAsync(`${key}.n`, String(chunks.length));
    for (let i = chunks.length; i < old; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
  },
  async removeItem(key: string) {
    const n = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

export const supabase: SupabaseClient | null = DEMO_MODE
  ? null
  : createClient(url!, anonKey!, {
      auth: {
        storage: Platform.OS === "web" ? undefined : secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });

// Rafraîchit le jeton uniquement quand l'appli est au premier plan.
if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Mode démo : configurez Supabase (voir docs/DEPLOIEMENT.md)");
  return supabase;
}

export async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let message = "Une erreur est survenue";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = (await ctx.json()).error ?? message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return data as T;
}

export function photoUrl(path: string | null | undefined): string | undefined {
  if (!path) return `${SITE_URL}/images/dishes/placeholder.svg`;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return SITE_URL + path;
  return `${url}/storage/v1/object/public/${path}`;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Une erreur est survenue";
}
