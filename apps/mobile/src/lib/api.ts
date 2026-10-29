import {
  DEMO_FEED, haversineKm, type Address, type AppNotification, type AvailableDelivery, type Cook, type Courier, type CourierDashboard, type DeliveryDetails,
  type DeliveryQuote, type DeliveryTracking, type FeedItem, type FeedParams, type Message, type Order,
} from "@mami/shared";
import { callFunction, DEMO_MODE, requireSupabase, supabase } from "./supabase";

const unwrap = <T>(r: { data: T | null; error: unknown }): T => { if (r.error) throw r.error; return r.data as T; };

export async function fetchFeed(p: FeedParams): Promise<FeedItem[]> {
  if (DEMO_MODE) {
    const q = p.query?.trim().toLowerCase();
    return DEMO_FEED.map((d) => ({ ...d, distance_m: haversineKm(p, d) * 1000 }))
      .filter((d) => !p.cookId || d.cook_id === p.cookId)
      .filter((d) => !p.cuisine || d.cuisine === p.cuisine)
      .filter((d) => !p.course || (p.course === "dessert" ? d.cuisine === "dessert" : d.cuisine !== "dessert"))
      .filter((d) => !q || `${d.title} ${d.cook_name}`.toLowerCase().includes(q))
      .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
  }
  return unwrap(await supabase!.rpc("feed", {
    p_lat: p.lat, p_lng: p.lng, p_radius_km: p.radiusKm ?? 10, p_cuisine: p.cuisine ?? null, p_query: p.query?.trim() || null,
    p_cook_id: p.cookId ?? null, p_limit: p.limit ?? 40, p_offset: p.offset ?? 0, p_course: p.course ?? null,
  })) as FeedItem[];
}

export async function fetchDrop(dropId: string): Promise<FeedItem | null> {
  if (DEMO_MODE) return DEMO_FEED.find((d) => d.drop_id === dropId) ?? null;
  const rows = unwrap(await supabase!.rpc("feed", { p_lat: 0, p_lng: 0, p_drop_id: dropId, p_limit: 1 })) as FeedItem[];
  return rows[0] ?? null;
}

export async function fetchCook(slug: string): Promise<Cook | null> {
  if (DEMO_MODE) {
    const d = DEMO_FEED.find((x) => x.cook_slug === slug);
    return d ? { id: d.cook_id, slug, kitchen_name: d.cook_name, bio: d.description, cover_url: null, cuisines: [d.cuisine], city: "Paris",
      offers_pickup: true, offers_delivery: d.offers_delivery, delivery_radius_km: 4, delivery_fee_cents: d.delivery_fee_cents, status: "approved",
      status_reason: null, stripe_account_id: null, stripe_charges_enabled: false, stripe_payouts_enabled: false, rating_avg: d.cook_rating,
      rating_count: d.cook_rating_count, orders_completed: 0, created_at: "" } : null;
  }
  return unwrap(await supabase!.from("cooks").select("*").eq("slug", slug).maybeSingle()) as Cook | null;
}

export const checkout = (body: unknown) => callFunction<{ order_id: string; order_number?: number; total_cents?: number; client_secret?: string }>("checkout", body);
export const orderAction = (orderId: string, to: string, opts: { note?: string; pickup_code?: string } = {}) =>
  callFunction<{ ok: boolean; refunded: boolean }>("order-action", { order_id: orderId, to, ...opts });

export async function fetchAddresses(): Promise<Address[]> {
  return unwrap(await requireSupabase().from("addresses").select("id,user_id,label,line1,line2,postal_code,city,country,instructions,is_default").order("is_default", { ascending: false })) as Address[];
}

export async function createAddress(userId: string, a: { label: string; line1: string; postal_code: string; city: string; lat: number; lng: number }) {
  return unwrap(await requireSupabase().from("addresses").insert({
    user_id: userId, label: a.label, line1: a.line1, postal_code: a.postal_code, city: a.city, location: `SRID=4326;POINT(${a.lng} ${a.lat})`,
  }).select("id").single()) as { id: string };
}

export async function searchAddress(q: string) {
  if (q.trim().length < 4) return [];
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`);
  const json = await res.json();
  return (json.features ?? []).map((f: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }) => ({
    label: f.properties.label, line1: f.properties.name, postal_code: f.properties.postcode, city: f.properties.city,
    lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
  })) as { label: string; line1: string; postal_code: string; city: string; lat: number; lng: number }[];
}

export async function fetchMyOrders(userId: string) {
  return unwrap(await requireSupabase().from("orders").select("*, order_items(*), cooks(kitchen_name, slug)")
    .eq("customer_id", userId).neq("status", "expired").order("created_at", { ascending: false }).limit(50)) as (Order & { cooks: { kitchen_name: string } | null })[];
}

export async function fetchOrder(id: string) {
  return unwrap(await requireSupabase().from("orders").select("*, order_items(*), cooks(kitchen_name, slug), customer:profiles!orders_customer_id_profiles_fkey(display_name)")
    .eq("id", id).maybeSingle()) as (Order & { cooks: { kitchen_name: string; slug: string } | null; customer: { display_name: string } | null }) | null;
}

export async function fetchPickupAddress(orderId: string) {
  return unwrap(await requireSupabase().rpc("pickup_address", { _order_id: orderId })) as { line1: string; postal_code: string; city: string; lat: number; lng: number } | null;
}

export async function fetchCookOrders(cookId: string, statuses: string[]) {
  return unwrap(await requireSupabase().from("orders").select("*, order_items(*), customer:profiles!orders_customer_id_profiles_fkey(display_name)")
    .eq("cook_id", cookId).in("status", statuses).order("created_at", { ascending: false }).limit(100)) as (Order & { customer: { display_name: string } | null })[];
}

export async function fetchMessages(orderId: string): Promise<Message[]> {
  return unwrap(await requireSupabase().from("messages").select("*").eq("order_id", orderId).order("created_at")) as Message[];
}
export async function sendMessage(orderId: string, senderId: string, body: string) {
  unwrap(await requireSupabase().from("messages").insert({ order_id: orderId, sender_id: senderId, body }));
}

export async function createReview(o: Order, userId: string, rating: number, comment: string, courierRating?: number) {
  const sb = requireSupabase();
  const r = unwrap(await sb.from("reviews").insert({
    order_id: o.id, customer_id: userId, cook_id: o.cook_id, rating, comment: comment || null, courier_rating: courierRating || null,
  }).select("id").single()) as { id: string };
  const rows = [...new Set((o.order_items ?? []).map((i) => i.dish_id))].map((dish_id) => ({ review_id: r.id, dish_id, rating }));
  if (rows.length) unwrap(await sb.from("review_dishes").insert(rows));
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  if (DEMO_MODE) return [];
  return unwrap(await supabase!.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)) as AppNotification[];
}

export async function fetchMyCook(userId: string): Promise<Cook | null> {
  if (DEMO_MODE) return null;
  return unwrap(await supabase!.from("cooks").select("*").eq("id", userId).maybeSingle()) as Cook | null;
}

export async function fetchMyDrops(cookId: string) {
  return unwrap(await requireSupabase().from("drops").select("*, dishes(title, photos)").eq("cook_id", cookId)
    .gte("available_on", new Date().toISOString().slice(0, 10)).order("available_on")) as
    { id: string; available_on: string; quantity_total: number; quantity_remaining: number; status: string; ready_from: string; dishes: { title: string; photos: string[] } | null }[];
}

// ------------------------------------------------------------------ livraison, livreurs, tableaux de bord
const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => unwrap(await requireSupabase().rpc(fn, args)) as T;

export const fetchDeliveryQuote = (cookId: string, addressId: string) => rpc<DeliveryQuote>("delivery_quote", { _cook_id: cookId, _address_id: addressId });
export const fetchDeliveryTracking = (orderId: string) => rpc<DeliveryTracking | null>("delivery_tracking", { _order_id: orderId });

export async function fetchMyCourier(userId: string): Promise<Courier | null> {
  if (DEMO_MODE) return null;
  return unwrap(await supabase!.from("couriers").select("*").eq("id", userId).maybeSingle()) as Courier | null;
}
export const setCourierOnline = (online: boolean, lat?: number, lng?: number) =>
  rpc<Courier>("courier_set_online", { _online: online, _lat: lat ?? null, _lng: lng ?? null });
export const fetchAvailableDeliveries = () => rpc<AvailableDelivery[]>("available_deliveries");
export const acceptDelivery = (id: string) => rpc<DeliveryDetails>("accept_delivery", { _delivery_id: id });
export const declineDelivery = (id: string) => rpc<void>("decline_delivery", { _delivery_id: id });
export const deliveryStep = (id: string, step: "at_pickup" | "picked_up" | "delivered", code?: string) =>
  rpc<DeliveryDetails>("delivery_step", { _delivery_id: id, _step: step, _code: code ?? null });
export const courierCancel = (id: string) => rpc<void>("courier_cancel", { _delivery_id: id, _reason: null });
export const fetchDeliveryDetails = (id: string) => rpc<DeliveryDetails | null>("delivery_details", { _delivery_id: id });
export const fetchCourierDashboard = (days = 1) => rpc<CourierDashboard>("courier_dashboard", { p_days: days });
export const stripeConnect = (role: "cook" | "courier", mode: "onboarding" | "dashboard") =>
  callFunction<{ url: string }>("connect-onboarding", { role, mode, return_url: "mamicook://livreur" });

export interface CustomerDashboard {
  orders: number; active: number; spent: { currency: string; cents: number }[]; saved_cents: number; plates: number; cooks: number;
  tips_cents: number; reviews: number; favorites: number; top_cuisines: { cuisine: string; n: number }[];
  top_cooks: { kitchen_name: string; slug: string; n: number }[]; monthly: { month: string; orders: number }[];
}
export const fetchCustomerDashboard = () => rpc<CustomerDashboard>("customer_dashboard");
