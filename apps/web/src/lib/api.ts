// Accès aux données. Toutes les règles de sécurité sont appliquées par la base
// (RLS + fonctions) : ce module ne fait que des appels, jamais de calcul qui fait foi.
import {
  DEMO_FEED,
  haversineKm,
  type Address,
  type AppNotification,
  type AvailableDelivery,
  type Cook,
  type Country,
  type Courier,
  type CourierDashboard,
  type Dac7Row,
  type DeliveryDetails,
  type DeliveryQuote,
  type DeliveryTracking,
  type PlatformStats,
  type CookDashboard,
  type ComplianceItem,
  type ComplianceRole,
  type Dish,
  type DishExtra,
  type Drop,
  type FeedItem,
  type FeedParams,
  type Message,
  type Order,
  type Review,
  t,
} from "@mami/shared";
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
      .filter((d) => !p.course || (p.course === "dessert" ? d.cuisine === "dessert" : d.cuisine !== "dessert"))
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
      p_course: p.course ?? null,
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

export interface RatingSummary { average: number; count: number; with_comment: number; distribution: Record<"1" | "2" | "3" | "4" | "5", number> }

/** Note moyenne et répartition par étoiles (avis de vrais clients, hors avis masqués). */
export async function fetchRatingSummary(cookId: string, fallback?: { avg: number; count: number }): Promise<RatingSummary> {
  if (DEMO_MODE) {
    // Démo : répartition plausible à partir de la note affichée
    const count = fallback?.count ?? 0, avg = fallback?.avg ?? 0;
    const five = Math.round(count * Math.max(0, Math.min(1, (avg - 3.6) / 1.4)));
    const four = Math.round((count - five) * 0.7), three = Math.round((count - five - four) * 0.6), two = Math.round((count - five - four - three) * 0.6);
    return { average: avg, count, with_comment: Math.round(count * 0.6), distribution: { 5: five, 4: four, 3: three, 2: two, 1: Math.max(0, count - five - four - three - two) } };
  }
  return unwrap(await supabase!.rpc("cook_rating_summary", { _cook_id: cookId })) as RatingSummary;
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
  type Feature = { properties: Record<string, string>; geometry: { coordinates: [number, number] } };
  return ((json.features ?? []) as Feature[]).map((f) => ({
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
  fulfillment: "delivery" | "pickup" | "courier";
  address_id?: string | null;
  note?: string;
  promo_code?: string;
  tip_cents?: number;
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
export async function createReview(input: { orderId: string; customerId: string; cookId: string; rating: number; comment?: string; courierRating?: number; dishRatings: Record<string, number> }) {
  const sb = requireSupabase();
  const review = unwrap(await sb.from("reviews").insert({
    order_id: input.orderId, customer_id: input.customerId, cook_id: input.cookId, rating: input.rating, comment: input.comment || null,
    courier_rating: input.courierRating ?? null,
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
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(t("Format accepté : JPG, PNG ou WebP"));
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
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(t("Image illisible")))), "image/webp", 0.82));
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

// ------------------------------------------------------------------ livraison (client)
const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> =>
  unwrap(await requireSupabase().rpc(fn, args)) as T;

export const fetchDeliveryQuote = (cookId: string, addressId: string) =>
  rpc<DeliveryQuote>("delivery_quote", { _cook_id: cookId, _address_id: addressId });
export const fetchDeliveryTracking = (orderId: string) =>
  rpc<DeliveryTracking | null>("delivery_tracking", { _order_id: orderId });

// ------------------------------------------------------------------ espace livreur
export async function fetchMyCourier(userId: string): Promise<Courier | null> {
  if (DEMO_MODE) return null;
  return unwrap(await supabase!.from("couriers").select("*").eq("id", userId).maybeSingle()) as Courier | null;
}

export async function fetchMyCourierPrivate(userId: string) {
  return unwrap(await requireSupabase().from("courier_private").select("*").eq("courier_id", userId).maybeSingle()) as {
    legal_name: string | null; birth_date: string | null; tax_id: string | null; business_status: string;
    registration_number: string | null; address: string | null; insurance_declared_at: string | null; documents_verified_at: string | null;
  } | null;
}

/** Inscription livreur : profil + informations légales, puis envoi pour validation. */
export async function applyAsCourier(userId: string, v: {
  country: string; city: string; vehicle: string; legal_name: string; birth_date: string; tax_id: string;
  business_status: string; registration_number?: string; address: string; insurance: boolean;
}) {
  const sb = requireSupabase();
  unwrap(await sb.from("couriers").upsert({ id: userId, country: v.country, city: v.city, vehicle: v.vehicle }));
  unwrap(await sb.from("courier_private").upsert({
    courier_id: userId, legal_name: v.legal_name, birth_date: v.birth_date, tax_id: v.tax_id, business_status: v.business_status,
    registration_number: v.registration_number || null, address: v.address, insurance_declared_at: v.insurance ? new Date().toISOString() : null,
  }));
  unwrap(await sb.from("couriers").update({ status: "pending_review" }).eq("id", userId));
}

export async function updateCourierProfile(userId: string, v: { city?: string; vehicle?: string }) {
  unwrap(await requireSupabase().from("couriers").update(v).eq("id", userId));
}

export const setCourierOnline = (online: boolean, lat?: number, lng?: number) =>
  rpc<Courier>("courier_set_online", { _online: online, _lat: lat ?? null, _lng: lng ?? null });
export const fetchAvailableDeliveries = () => rpc<AvailableDelivery[]>("available_deliveries");
export const acceptDelivery = (id: string) => rpc<DeliveryDetails>("accept_delivery", { _delivery_id: id });
export const declineDelivery = (id: string) => rpc<void>("decline_delivery", { _delivery_id: id });
export const deliveryStep = (id: string, step: "at_pickup" | "picked_up" | "delivered", code?: string) =>
  rpc<DeliveryDetails>("delivery_step", { _delivery_id: id, _step: step, _code: code ?? null });
export const courierCancel = (id: string, reason?: string) => rpc<void>("courier_cancel", { _delivery_id: id, _reason: reason ?? null });
export const fetchDeliveryDetails = (id: string) => rpc<DeliveryDetails | null>("delivery_details", { _delivery_id: id });
export const fetchCourierDashboard = (days = 30) => rpc<CourierDashboard>("courier_dashboard", { p_days: days });

export async function fetchCourierHistory(courierId: string) {
  return unwrap(await requireSupabase().from("deliveries")
    .select("id, status, distance_m, fee_cents, tip_cents, courier_payout_cents, assigned_at, delivered_at, orders(number, currency)")
    .eq("courier_id", courierId).order("created_at", { ascending: false }).limit(100)) as unknown as {
      id: string; status: string; distance_m: number; tip_cents: number; courier_payout_cents: number;
      assigned_at: string | null; delivered_at: string | null; orders: { number: number; currency: string } | null;
    }[];
}

export async function fetchCourierPayouts(courierId: string) {
  return unwrap(await requireSupabase().from("payouts").select("*, orders(number, currency)").eq("courier_id", courierId)
    .order("created_at", { ascending: false }).limit(100)) as {
      id: string; amount_cents: number; status: string; available_at: string; created_at: string; orders: { number: number; currency: string } | null;
    }[];
}

export function stripeConnect(role: "cook" | "courier", mode: "onboarding" | "dashboard") {
  return callFunction<{ url: string }>("connect-onboarding", { role, mode, return_url: window.location.href });
}

// ------------------------------------------------------------------ cuisinière : statistiques, légal, IA
export interface CookStats {
  currency: string | null; orders: number; completed: number; cancelled: number; revenue_cents: number; avg_basket_cents: number;
  plates_sold: number; customers: number; repeat_customers: number; by_fulfillment: Record<string, number>;
  top_dishes: { dish_id: string; title: string; qty: number; sales_cents: number }[];
  by_weekday: { dow: number; orders: number }[]; by_hour: { hour: number; orders: number }[];
  ratings: { avg: number; count: number; distribution: Record<string, number> };
  stock: { offered: number; sold: number }; favorites: number;
}
export const fetchCookStats = (days = 30) => rpc<CookStats>("cook_stats", { p_days: days });

export async function fetchCookLegal(userId: string) {
  return unwrap(await requireSupabase().from("cook_private")
    .select("legal_name, birth_date, tax_id, vat_number, business_status, registration_number, food_registration_ref, hygiene_training_at, insurance_declared_at, siret")
    .eq("cook_id", userId).maybeSingle()) as Record<string, string | null> | null;
}

export async function saveCookLegal(userId: string, v: Record<string, string | null>) {
  unwrap(await requireSupabase().from("cook_private").update(v).eq("cook_id", userId));
}

export function aiImage(mode: "enhance" | "background" | "generate", opts: { path?: string; description?: string }) {
  return callFunction<{ path: string; remaining_today: number }>("ai-image", { mode, ...opts });
}

// ------------------------------------------------------------------ client : tableau de bord
export interface CustomerDashboard {
  orders: number; active: number; spent: { currency: string; cents: number }[]; saved_cents: number; plates: number; cooks: number;
  tips_cents: number; reviews: number; favorites: number;
  top_cuisines: { cuisine: string; n: number }[]; top_cooks: { kitchen_name: string; slug: string; n: number }[];
  monthly: { month: string; orders: number }[];
}
export const fetchCustomerDashboard = () => rpc<CustomerDashboard>("customer_dashboard");

// ------------------------------------------------------------------ administration (suite)
export const fetchPlatformStats = async (days = 30, city: string | null = null): Promise<PlatformStats> =>
  DEMO_MODE ? demoPlatformStats(days, city) : rpc<PlatformStats>("platform_stats", { p_days: days, p_city: city });

export interface AdminCity { city: string; cooks: number; couriers: number }
export const fetchAdminCities = async (): Promise<AdminCity[]> =>
  DEMO_MODE ? DEMO_CITIES.map(({ city, cooks, couriers }) => ({ city, cooks, couriers })) : rpc<AdminCity[]>("admin_cities");

// Démo : part de l'activité de chaque ville.
const DEMO_CITIES = [
  { city: "Paris", cooks: 24, couriers: 15, share: 0.46 },
  { city: "Lyon", cooks: 9, couriers: 6, share: 0.17 },
  { city: "Marseille", cooks: 7, couriers: 4, share: 0.14 },
  { city: "Bruxelles", cooks: 5, couriers: 3, share: 0.1 },
  { city: "Genève", cooks: 4, couriers: 2, share: 0.08 },
  { city: "Lille", cooks: 3, couriers: 1, share: 0.05 },
];

/** Chiffres d'exemple pour la démo (proportionnels à la période choisie). */
function demoPlatformStats(days: number, city: string | null): PlatformStats {
  const c = city ? DEMO_CITIES.find((x) => x.city === city) : null;
  const share = c?.share ?? 1;
  const k = (Math.max(1, days) / 30) * share;
  const n = (v: number) => Math.round(v * k);
  const orders = n(1240);
  const gmv = n(2_480_000);
  const delivery = n(61_000);
  const food = Math.round(gmv * 0.2 / 1.2);
  const daily = Array.from({ length: Math.min(days, 90) }, (_, i) => {
    const d = new Date(Date.now() - (Math.min(days, 90) - 1 - i) * 86_400_000);
    const weekend = [0, 5, 6].includes(d.getDay());
    return { day: d.toISOString().slice(0, 10), orders: Math.round(((weekend ? 52 : 34) + 8 * Math.sin(i)) * share), revenue_cents: Math.round((weekend ? 11_000 : 7_000) * share) };
  });
  const top = (v: number) => Math.round(v * share);
  const inCity = <T extends { kitchen_name: string }>(rows: T[]) => (city ? rows.filter((r) => DEMO_COOK_CITY[r.kitchen_name] === city) : rows);
  return {
    city,
    top_cities: DEMO_CITIES.map((x) => ({ city: x.city, orders: Math.round(1240 * x.share * days / 30), sales_cents: Math.round(2_480_000 * x.share * days / 30), currency: x.city === "Genève" ? "CHF" : "EUR" })),
    by_currency: [{
      currency: city === "Genève" ? "CHF" : "EUR", gmv_cents: gmv, revenue_cents: food + delivery, food_revenue_cents: food, delivery_revenue_cents: delivery,
      cooks_cents: Math.round(gmv / 1.2) - n(120_000), couriers_cents: n(244_000), tips_cents: n(31_000),
      orders, completed: Math.round(orders * 0.94), cancelled: Math.round(orders * 0.03), avg_basket_cents: Math.round(gmv / orders),
    }],
    items_by_course: { main: n(1630), dessert: n(540), pastry: n(210), starter: n(180), snack: n(150), drink: n(260) },
    top_dishes: inCity([
      { title: "Lasagnes Maison Bolognaise", kitchen_name: "Chez Mami Nono", course: "main", qty: n(212), sales_cents: n(318_000), currency: "EUR" },
      { title: "Phở Bò Traditionnel", kitchen_name: "Chez Mami Hương", course: "main", qty: n(187), sales_cents: n(235_620), currency: "EUR" },
      { title: "Tiramisu Artisanal", kitchen_name: "Chez Nonna Lucia", course: "dessert", qty: n(164), sales_cents: n(137_760), currency: "EUR" },
      { title: "Butter Chicken & Naan", kitchen_name: "Chez Mami Priya", course: "main", qty: n(151), sales_cents: n(196_300), currency: "EUR" },
      { title: "Tarte aux Fruits Rouges", kitchen_name: "Chez Mamie Colette", course: "dessert", qty: n(128), sales_cents: n(99_840), currency: "EUR" },
    ]),
    top_cooks: inCity([
      { kitchen_name: "Chez Mami Nono", slug: "mami-nono", city: "Paris", orders: n(176), sales_cents: n(352_000), currency: "EUR" },
      { kitchen_name: "Chez Mami Hương", slug: "mami-huong", city: "Paris", orders: n(158), sales_cents: n(298_000), currency: "EUR" },
      { kitchen_name: "Chez Mami Priya", slug: "mami-priya", city: "Lyon", orders: n(131), sales_cents: n(254_000), currency: "EUR" },
      { kitchen_name: "Chez Nonna Lucia", slug: "nonna-lucia", city: "Marseille", orders: n(119), sales_cents: n(171_000), currency: "EUR" },
      { kitchen_name: "Chez Abuela Rosa", slug: "abuela-rosa", city: "Paris", orders: n(97), sales_cents: n(166_000), currency: "EUR" },
    ]),
    sellers_active: Math.min(c?.cooks ?? 48, n(48)), dishes_published: top(214), deliveries_completed: n(530),
    orders_active: top(23), deliveries_searching: c && c.share < 0.4 ? 0 : 1, cooks_approved: c?.cooks ?? 52, cooks_pending: top(6), couriers_approved: c?.couriers ?? 31, couriers_pending: top(4), couriers_online: top(9),
    users_total: 4870, new_users: Math.round(612 * days / 30), customers_active: n(1890), reports_open: 2, documents_to_review: 7, payouts_pending_cents: 184_000,
    installs: { total: 3920, ios: 2210, android: 1710, new: Math.round(540 * days / 30), active_30d: 2650 },
    daily,
  };
}

/** Démo : ville de chaque cuisine d'exemple. */
const DEMO_COOK_CITY: Record<string, string> = {
  "Chez Mami Nono": "Paris", "Chez Mami Hương": "Paris", "Chez Abuela Rosa": "Paris",
  "Chez Mami Priya": "Lyon", "Chez Nonna Lucia": "Marseille", "Chez Mamie Colette": "Lille",
};
export const fetchDac7 = (year: number) => rpc<Dac7Row[]>("dac7_report", { _year: year });
export const searchUsers = (q: string) => rpc<{
  id: string; email: string; display_name: string; created_at: string; is_cook: boolean; is_courier: boolean; roles: string[]; orders_count: number;
}[]>("admin_search_users", { _q: q });
export const reviewCourier = (id: string, approve: boolean, reason?: string) =>
  rpc<void>("review_courier_application", { _courier_id: id, _approve: approve, _reason: reason ?? null });
export const suspendCourier = (id: string, reason: string) => rpc<void>("suspend_courier", { _courier_id: id, _reason: reason });
export const savePromo = (v: { code: string; percent_off?: number | null; amount_off_cents?: number | null; description?: string; min_order_cents?: number; max_redemptions?: number | null; first_order_only?: boolean; ends_at?: string | null; is_active?: boolean }) =>
  rpc("admin_save_promo", {
    _code: v.code, _percent_off: v.percent_off ?? null, _amount_off_cents: v.amount_off_cents ?? null, _description: v.description ?? null,
    _min_order_cents: v.min_order_cents ?? 0, _max_redemptions: v.max_redemptions ?? null, _first_order_only: v.first_order_only ?? false,
    _ends_at: v.ends_at ?? null, _is_active: v.is_active ?? true,
  });

export async function fetchPendingCouriers() {
  return unwrap(await requireSupabase().from("couriers").select("*, profiles(display_name), courier_private(*)")
    .in("status", ["pending_review"]).order("updated_at")) as (Courier & {
      profiles: { display_name: string } | null;
      courier_private: { legal_name: string | null; birth_date: string | null; tax_id: string | null; business_status: string; registration_number: string | null; address: string | null; insurance_declared_at: string | null } | null;
    })[];
}

export async function fetchCountries(): Promise<Country[]> {
  if (DEMO_MODE) return [];
  return unwrap(await supabase!.from("countries").select("*").order("enabled", { ascending: false }).order("code")) as Country[];
}

export async function updateCountry(code: string, v: Partial<Country>) {
  unwrap(await requireSupabase().from("countries").update(v).eq("code", code));
}

export async function fetchPromoCodes() {
  return unwrap(await requireSupabase().from("promo_codes").select("*").order("created_at", { ascending: false }).limit(200)) as {
    id: string; code: string; description: string | null; percent_off: number | null; amount_off_cents: number | null; min_order_cents: number;
    max_redemptions: number | null; redemptions: number; first_order_only: boolean; ends_at: string | null; is_active: boolean;
  }[];
}

export async function adminSearchOrders(q: { number?: number; status?: string }) {
  let query = requireSupabase().from("orders")
    .select("id, number, status, fulfillment, total_cents, currency, platform_fee_cents, created_at, cooks(kitchen_name), customer:profiles!orders_customer_id_profiles_fkey(display_name)")
    .order("created_at", { ascending: false }).limit(50);
  if (q.number) query = query.eq("number", q.number);
  if (q.status) query = query.eq("status", q.status);
  return unwrap(await query) as unknown as {
    id: string; number: number; status: string; fulfillment: string; total_cents: number; currency: string; platform_fee_cents: number; created_at: string;
    cooks: { kitchen_name: string } | null; customer: { display_name: string } | null;
  }[];
}

export async function adminPayouts(status = "pending") {
  return unwrap(await requireSupabase().from("payouts")
    .select("id, amount_cents, status, available_at, created_at, cook_id, courier_id, orders(number, currency)")
    .eq("status", status).order("available_at").limit(100)) as unknown as {
      id: string; amount_cents: number; status: string; available_at: string; created_at: string; cook_id: string | null; courier_id: string | null;
      orders: { number: number; currency: string } | null;
    }[];
}

// ------------------------------------------------------------------ justificatifs légaux (par pays)
export const fetchCompliance = (userId: string, role: ComplianceRole) =>
  rpc<ComplianceItem[]>("compliance_status", { _user: userId, _role: role });

/** Envoie un justificatif (PDF ou photo, 10 Mo max.) dans le bucket privé, dossier de l'utilisateur. */
export async function uploadComplianceFile(userId: string, file: File): Promise<string> {
  const types: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  if (!types[file.type]) throw new Error(t("Format accepté : PDF, JPG, PNG ou WebP"));
  if (file.size > 10 * 1024 * 1024) throw new Error(t("Fichier trop lourd (10 Mo maximum)"));
  const path = `${userId}/${crypto.randomUUID()}.${types[file.type]}`;
  const { error } = await requireSupabase().storage.from("compliance-docs").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export const submitComplianceDocument = (v: { role: ComplianceRole; code: string; reference?: string; issuedOn?: string; expiresOn?: string; filePath?: string }) =>
  rpc("submit_compliance_document", {
    _role: v.role, _code: v.code, _reference: v.reference || null, _issued_on: v.issuedOn || null,
    _expires_on: v.expiresOn || null, _file_path: v.filePath || null,
  });

export const reviewComplianceDocument = (id: string, approve: boolean, note?: string) =>
  rpc<void>("review_compliance_document", { _doc_id: id, _approve: approve, _note: note || null });

/** Lien temporaire (5 min) pour consulter un justificatif (équipe ou propriétaire). */
export async function complianceFileUrl(path: string): Promise<string> {
  const { data, error } = await requireSupabase().storage.from("compliance-docs").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

/** Personnes ayant des justificatifs en attente de vérification (équipe). */
export async function fetchComplianceQueue() {
  const rows = unwrap(await requireSupabase().from("compliance_documents").select("user_id, role, created_at, profiles!compliance_documents_user_id_fkey(display_name)")
    .eq("status", "submitted").order("created_at").limit(200)) as unknown as { user_id: string; role: ComplianceRole; profiles: { display_name: string } | null }[];
  const seen = new Map<string, { user_id: string; role: ComplianceRole; name: string }>();
  for (const r of rows) seen.set(`${r.user_id}:${r.role}`, { user_id: r.user_id, role: r.role, name: r.profiles?.display_name ?? "—" });
  return [...seen.values()];
}
