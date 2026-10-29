// Accès aux données. Toutes les règles de sécurité sont appliquées par la base
// (RLS + fonctions) : ce module ne fait que des appels, jamais de calcul qui fait foi.
import {
  haversineKm,
  type Address,
  type AppNotification,
  type Cook,
  type CookDashboard,
  type Dish,
  type DishExtra,
  type Drop,
  type FeedItem,
  type FeedParams,
  type Message,
  type Order,
  type Review,
} from "@mami/shared";
import { DEMO_FEED } from "./demo-data";
import { callFunction, DEMO_MODE, requireSupabase, supabase } from "./supabase";

const unwrap = <T>(res: { data: T | null; error: unknown }): T => {
  if (res.error) throw res.error;
  return res.data as T;
};

// ------------------------------------------------------------------ catalogue
export async function fetchFeed(p: FeedParams): Promise<FeedItem[]> {
  if (DEMO_MODE) {
    const q = p.query?.trim().toLowerCase();
    return DEMO_FEED.map((d) => ({ ...d, distance_m: haversineKm(p, d) * 1000 }))
      .filter((d) => !p.cookId || d.cook_id === p.cookId)
      .filter((d) => !p.cuisine || d.cuisine === p.cuisine || (p.cuisine === "frozen" && d.temperature === "frozen"))
      .filter((d) => !p.diets?.length || p.diets.every((x) => d.diets.includes(x)))
      .filter((d) => !p.temperature || d.temperature === p.temperature)
      .filter((d) => !q || `${d.title} ${d.description} ${d.cook_name}`.toLowerCase().includes(q))
      .filter((d) => p.cookId || (d.distance_m ?? 0) <= (p.radiusKm ?? 10) * 1000)
      .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
  }
  return unwrap(
    await supabase!.rpc("feed", {
      p_lat: p.lat,
      p_lng: p.lng,
      p_radius_km: p.radiusKm ?? 10,
      p_cuisine: p.cuisine ?? null,
      p_query: p.query?.trim() || null,
      p_diets: p.diets?.length ? p.diets : null,
      p_temperature: p.temperature ?? null,
      p_date: p.date ?? null,
      p_cook_id: p.cookId ?? null,
      p_limit: p.limit ?? 48,
      p_offset: p.offset ?? 0,
    }),
  ) as FeedItem[];
}

export async function fetchDrop(dropId: string, at?: { lat: number; lng: number }): Promise<FeedItem | null> {
  if (DEMO_MODE) return DEMO_FEED.find((d) => d.drop_id === dropId) ?? null;
  const rows = unwrap(
    await supabase!.rpc("feed", { p_lat: at?.lat ?? 0, p_lng: at?.lng ?? 0, p_drop_id: dropId, p_limit: 1 }),
  ) as FeedItem[];
  return rows[0] ?? null;
}

export async function fetchCookBySlug(slug: string): Promise<(Cook & { profiles: { avatar_url: string | null } | null }) | null> {
  if (DEMO_MODE) {
    const d = DEMO_FEED.find((x) => x.cook_slug === slug);
    if (!d) return null;
    return {
      id: d.cook_id, slug: d.cook_slug, kitchen_name: d.cook_name, bio: `Cuisine familiale faite avec amour. ${d.description}`,
      cover_url: null, cuisines: [d.cuisine], city: "Paris", offers_pickup: d.offers_pickup, offers_delivery: d.offers_delivery,
      delivery_radius_km: 4, delivery_fee_cents: d.delivery_fee_cents, status: "approved", status_reason: null,
      stripe_account_id: null, stripe_charges_enabled: false, stripe_payouts_enabled: false,
      rating_avg: d.cook_rating, rating_count: d.cook_rating_count, orders_completed: d.cook_rating_count * 3,
      created_at: "2026-01-15T10:00:00Z", profiles: null,
    };
  }
  return unwrap(await supabase!.from("cooks").select("*, profiles(avatar_url)").eq("slug", slug).maybeSingle());
}

export async function fetchCookReviews(cookId: string, limit = 20): Promise<Review[]> {
  if (DEMO_MODE) {
    return [
      { id: "r1", order_id: "", customer_id: "", cook_id: cookId, rating: 5, comment: "Exactement comme à la maison. Portions généreuses, je recommande !", cook_reply: "Merci beaucoup, à bientôt ! ❤️", cook_replied_at: null, created_at: new Date(Date.now() - 2 * 86400000).toISOString(), profiles: { display_name: "Camille", avatar_url: null } },
      { id: "r2", order_id: "", customer_id: "", cook_id: cookId, rating: 5, comment: "Super bon et livré encore chaud.", cook_reply: null, cook_replied_at: null, created_at: new Date(Date.now() - 6 * 86400000).toISOString(), profiles: { display_name: "Yanis", avatar_url: null } },
      { id: "r3", order_id: "", customer_id: "", cook_id: cookId, rating: 4, comment: "Très bon, un peu trop épicé pour moi.", cook_reply: null, cook_replied_at: null, created_at: new Date(Date.now() - 12 * 86400000).toISOString(), profiles: { display_name: "Sophie", avatar_url: null } },
    ];
  }
  return unwrap(
    await supabase!.from("reviews").select("*, profiles:customer_id(display_name, avatar_url)")
      .eq("cook_id", cookId).eq("is_hidden", false).order("created_at", { ascending: false }).limit(limit),
  ) as Review[];
}

// ------------------------------------------------------------------ favoris
export async function fetchFavorites(): Promise<string[]> {
  if (DEMO_MODE) return [];
  const rows = unwrap(await supabase!.from("favorites").select("cook_id")) as { cook_id: string }[];
  return rows.map((r) => r.cook_id);
}

export async function fetchFavoriteCooks(): Promise<Cook[]> {
  const sb = requireSupabase();
  const rows = unwrap(await sb.from("favorites").select("cooks(*)").order("created_at", { ascending: false })) as unknown as { cooks: Cook }[];
  return rows.map((r) => r.cooks).filter(Boolean);
}

export async function toggleFavorite(cookId: string, on: boolean, userId: string) {
  const sb = requireSupabase();
  if (on) unwrap(await sb.from("favorites").upsert({ user_id: userId, cook_id: cookId }));
  else unwrap(await sb.from("favorites").delete().eq("cook_id", cookId).eq("user_id", userId));
}

// ------------------------------------------------------------------ adresses
export async function fetchAddresses(): Promise<Address[]> {
  const sb = requireSupabase();
  return unwrap(await sb.from("addresses").select("id,user_id,label,line1,line2,postal_code,city,country,instructions,is_default")
    .order("is_default", { ascending: false }).order("created_at", { ascending: false })) as Address[];
}

export async function createAddress(userId: string, a: {
  label: string; line1: string; line2?: string; postal_code: string; city: string; instructions?: string; lat: number; lng: number; is_default?: boolean;
}): Promise<Address> {
  const sb = requireSupabase();
  if (a.is_default) await sb.from("addresses").update({ is_default: false }).eq("user_id", userId);
  return unwrap(await sb.from("addresses").insert({
    user_id: userId, label: a.label, line1: a.line1, line2: a.line2 || null, postal_code: a.postal_code, city: a.city,
    instructions: a.instructions || null, location: `SRID=4326;POINT(${a.lng} ${a.lat})`, is_default: !!a.is_default,
  }).select("id,user_id,label,line1,line2,postal_code,city,country,instructions,is_default").single()) as Address;
}

export async function deleteAddress(id: string) {
  unwrap(await requireSupabase().from("addresses").delete().eq("id", id));
}

/** Autocomplétion d'adresse via la Base Adresse Nationale (gratuite, sans clé). */
export async function searchAddress(q: string): Promise<{ label: string; line1: string; postal_code: string; city: string; lat: number; lng: number }[]> {
  if (q.trim().length < 4) return [];
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`);
  if (!res.ok) return [];
  const json = await res.json();
  // deno-lint-ignore no-explicit-any
  return (json.features ?? []).map((f: any) => ({
    label: f.properties.label,
    line1: f.properties.name,
    postal_code: f.properties.postcode,
    city: f.properties.city,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
  }));
}

// ------------------------------------------------------------------ commandes
export interface CheckoutResult {
  order_id: string;
  order_number?: number;
  total_cents?: number;
  client_secret?: string;
  publishable_key?: string;
  status?: string;
}

export function checkout(body: {
  lines: { drop_id: string; quantity: number; extra_ids: string[]; menu_deal_id?: string | null }[];
  fulfillment: "delivery" | "pickup";
  address_id?: string | null;
  note?: string;
  promo_code?: string;
  idempotency_key: string;
}) {
  return callFunction<CheckoutResult>("checkout", body);
}

export function orderAction(orderId: string, to: string, opts: { note?: string; pickup_code?: string } = {}) {
  return callFunction<{ ok: boolean; refunded: boolean }>("order-action", { order_id: orderId, to, ...opts });
}

const ORDER_SELECT = "*, order_items(*)";

export async function fetchMyOrders(): Promise<(Order & { cooks: { kitchen_name: string; slug: string } | null })[]> {
  const sb = requireSupabase();
  const { data: user } = await sb.auth.getUser();
  return unwrap(await sb.from("orders").select(`${ORDER_SELECT}, cooks(kitchen_name, slug)`)
    .eq("customer_id", user.user!.id).neq("status", "expired")
    .order("created_at", { ascending: false }).limit(100)) as never;
}

export async function fetchOrder(id: string) {
  const sb = requireSupabase();
  return unwrap(await sb.from("orders")
    .select(`${ORDER_SELECT}, cooks(kitchen_name, slug, offers_delivery), customer:profiles!orders_customer_id_profiles_fkey(display_name)`)
    .eq("id", id).maybeSingle()) as (Order & {
      cooks: { kitchen_name: string; slug: string } | null;
      customer: { display_name: string } | null;
      order_items: Order["order_items"];
    }) | null;
}

export async function fetchOrderEvents(orderId: string) {
  return unwrap(await requireSupabase().from("order_events").select("*").eq("order_id", orderId).order("created_at")) as
    { id: number; from_status: string | null; to_status: string; note: string | null; created_at: string }[];
}

export async function fetchCookOrders(cookId: string, statuses?: string[]) {
  let q = requireSupabase().from("orders")
    .select(`${ORDER_SELECT}, customer:profiles!orders_customer_id_profiles_fkey(display_name)`)
    .eq("cook_id", cookId).neq("status", "pending_payment").neq("status", "expired")
    .order("created_at", { ascending: false }).limit(200);
  if (statuses) q = q.in("status", statuses);
  return unwrap(await q) as (Order & { customer: { display_name: string } | null })[];
}

// ------------------------------------------------------------------ messages
export async function fetchMessages(orderId: string): Promise<Message[]> {
  return unwrap(await requireSupabase().from("messages").select("*").eq("order_id", orderId).order("created_at")) as Message[];
}

export async function sendMessage(orderId: string, senderId: string, body: string) {
  unwrap(await requireSupabase().from("messages").insert({ order_id: orderId, sender_id: senderId, body }));
}

// ------------------------------------------------------------------ avis & signalements
export async function createReview(input: { orderId: string; customerId: string; cookId: string; rating: number; comment?: string; dishRatings: Record<string, number> }) {
  const sb = requireSupabase();
  const review = unwrap(await sb.from("reviews").insert({
    order_id: input.orderId, customer_id: input.customerId, cook_id: input.cookId, rating: input.rating, comment: input.comment || null,
  }).select("id").single()) as { id: string };
  const rows = Object.entries(input.dishRatings).map(([dish_id, rating]) => ({ review_id: review.id, dish_id, rating }));
  if (rows.length) unwrap(await sb.from("review_dishes").insert(rows));
  return review;
}

export async function fetchMyReviewForOrder(orderId: string) {
  return unwrap(await requireSupabase().from("reviews").select("*").eq("order_id", orderId).maybeSingle()) as Review | null;
}

export async function replyToReview(id: string, reply: string) {
  unwrap(await requireSupabase().from("reviews").update({ cook_reply: reply }).eq("id", id));
}

export async function createReport(input: { reporterId: string; targetType: string; targetId: string; reason: string; details?: string }) {
  unwrap(await requireSupabase().from("reports").insert({
    reporter_id: input.reporterId, target_type: input.targetType, target_id: input.targetId, reason: input.reason, details: input.details || null,
  }));
}

// ------------------------------------------------------------------ notifications
export async function fetchNotifications(): Promise<AppNotification[]> {
  if (DEMO_MODE) return [];
  return unwrap(await supabase!.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)) as AppNotification[];
}

export async function markNotificationsRead(userId: string) {
  unwrap(await requireSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null));
}

// ------------------------------------------------------------------ espace cuisinier
export async function fetchMyCook(userId: string): Promise<Cook | null> {
  if (DEMO_MODE) return null;
  return unwrap(await supabase!.from("cooks").select("*").eq("id", userId).maybeSingle()) as Cook | null;
}

export async function fetchMyCookPrivate(userId: string) {
  return unwrap(await requireSupabase().from("cook_private").select("siret, address_id, addresses(line1, postal_code, city)").eq("cook_id", userId).maybeSingle());
}

export async function fetchMyDishes(cookId: string): Promise<(Dish & { dish_extras: DishExtra[] })[]> {
  return unwrap(await requireSupabase().from("dishes").select("*, dish_extras(*)").eq("cook_id", cookId)
    .order("created_at", { ascending: false })) as never;
}

export async function fetchMyDrops(cookId: string): Promise<(Drop & { dishes: { title: string; photos: string[] } | null })[]> {
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  return unwrap(await requireSupabase().from("drops").select("*, dishes(title, photos)").eq("cook_id", cookId)
    .gte("available_on", from).order("available_on", { ascending: false }).order("ready_from")) as never;
}

export async function fetchCookDashboard(days = 30): Promise<CookDashboard> {
  return unwrap(await requireSupabase().rpc("cook_dashboard", { p_days: days })) as CookDashboard;
}

export async function fetchMyPayouts(cookId: string) {
  return unwrap(await requireSupabase().from("payouts").select("*, orders(number)").eq("cook_id", cookId)
    .order("created_at", { ascending: false }).limit(100)) as {
      id: string; amount_cents: number; status: string; available_at: string; created_at: string; orders: { number: number } | null;
    }[];
}

/** Envoie une photo dans le dossier de l'utilisateur (règle imposée par la base). */
export async function uploadImage(bucket: "dish-photos" | "avatars" | "covers", userId: string, file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Format accepté : JPG, PNG ou WebP");
  const blob = await resizeImage(file, bucket === "avatars" ? 512 : 1600);
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await requireSupabase().storage.from(bucket).upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;
  return `${bucket}/${path}`;
}

/** Redimensionne et recompresse côté navigateur (photos plus légères, métadonnées EXIF/GPS supprimées). */
async function resizeImage(file: File, max: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image illisible"))), "image/webp", 0.82));
}

// ------------------------------------------------------------------ administration
export async function fetchPendingCooks() {
  return unwrap(await requireSupabase().from("cooks").select("*, cook_private(siret, identity_verified_at, addresses(line1, postal_code, city))")
    .in("status", ["pending_review"]).order("updated_at")) as (Cook & { cook_private: unknown })[];
}

export async function fetchReports(status = "open") {
  return unwrap(await requireSupabase().from("reports").select("*").eq("status", status).order("created_at").limit(100)) as {
    id: string; reporter_id: string; target_type: string; target_id: string; reason: string; details: string | null; status: string; created_at: string;
  }[];
}

export async function fetchMyRoles(): Promise<string[]> {
  if (DEMO_MODE) return [];
  const rows = unwrap(await supabase!.from("user_roles").select("role")) as { role: string }[];
  return rows.map((r) => r.role);
}

export async function fetchPickupAddress(orderId: string) {
  return unwrap(await requireSupabase().rpc("pickup_address", { _order_id: orderId })) as
    { line1: string | null; line2: string | null; postal_code: string | null; city: string | null; lat: number; lng: number } | null;
}
