import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Mode démo : aucune configuration Supabase → données d'exemple en lecture seule. */
export const DEMO_MODE = !url || !anonKey || url.includes("xxxxxxxx");

export const supabase: SupabaseClient | null = DEMO_MODE
  ? null
  : createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      realtime: { params: { eventsPerSecond: 5 } },
    });

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new DemoModeError();
  return supabase;
}

export class DemoModeError extends Error {
  constructor() {
    super("Mode démo : connectez Supabase pour utiliser cette fonctionnalité (voir docs/DEPLOIEMENT.md).");
  }
}

/** Appelle une Edge Function et renvoie un message d'erreur lisible. */
export async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let message = "Une erreur est survenue";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = (await ctx.json()).error ?? message;
    } catch {
      /* corps illisible */
    }
    throw new Error(message);
  }
  return data as T;
}
