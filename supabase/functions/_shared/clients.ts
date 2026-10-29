import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";
import Stripe from "npm:stripe@16.12.0";
import { HttpError } from "./cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Client avec les droits de la personne connectée (RLS appliquée). */
export async function userClient(req: Request): Promise<{ client: SupabaseClient; userId: string; email?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new HttpError(401, "Connexion requise");
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Session expirée, reconnectez-vous");
  return { client, userId: data.user.id, email: data.user.email };
}

/** Client administrateur (contourne la RLS) — à n'utiliser qu'après vérification des droits. */
export const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

export const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:8080";

/** Vérifie un secret partagé (tâches planifiées, webhooks de base de données). */
export function requireCronSecret(req: Request) {
  const expected = Deno.env.get("CRON_SECRET");
  const got = req.headers.get("x-cron-secret");
  if (!expected || !got || !timingSafeEqual(expected, got)) throw new HttpError(401, "Non autorisé");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
