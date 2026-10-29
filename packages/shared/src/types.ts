// Types des données renvoyées par la base (cf. supabase/migrations).
import type { Fulfillment, OrderStatus, Temperature } from "./constants";

export interface FeedExtra {
  id: string;
  name: string;
  emoji: string | null;
  price_cents: number;
  customer_price_cents: number;
}

export interface FeedMenuDeal {
  id: string;
  name: string;
  items: string;
  price_cents: number;
  customer_price_cents: number;
}

/** Une ligne de la fonction `feed` : un plat en vente un jour donné. */
export interface FeedItem {
  drop_id: string;
  dish_id: string;
  cook_id: string;
  title: string;
  description: string | null;
  cuisine: string;
  photos: string[];
  price_cents: number;
  customer_price_cents: number;
  temperature: Temperature;
  allergens: string[];
  diets: string[];
  spice_level: number;
  portion_grams: number | null;
  available_on: string;
  ready_from: string;
  ready_until: string;
  quantity_remaining: number;
  quantity_total: number;
  dish_rating: number;
  dish_rating_count: number;
  cook_name: string;
  cook_slug: string;
  cook_avatar: string | null;
  cook_rating: number;
  cook_rating_count: number;
  offers_pickup: boolean;
  offers_delivery: boolean;
  delivery_fee_cents: number;
  distance_m: number | null;
  extras: FeedExtra[];
  menu_deal: FeedMenuDeal | null;
  /** Livraison par un livreur MAMI COOK proposée (pays + cuisine). */
  offers_courier?: boolean;
  /** Vendeur professionnel (directive Omnibus) ; sinon particulier. */
  is_professional?: boolean;
  /** Devise du pays de la cuisine (EUR, CHF…). */
  currency?: string;
  course?: string;
}

export interface FeedParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  cuisine?: string | null;
  query?: string | null;
  diets?: string[] | null;
  temperature?: Temperature | null;
  date?: string | null;
  cookId?: string | null;
  /** Type de plat (dessert, boisson…). */
  course?: string | null;
  limit?: number;
  offset?: number;
}

export interface Cook {
  id: string;
  slug: string;
  kitchen_name: string;
  country?: string;
  is_professional?: boolean;
  offers_courier?: boolean;
  bio: string | null;
  cover_url: string | null;
  cuisines: string[];
  city: string | null;
  offers_pickup: boolean;
  offers_delivery: boolean;
  delivery_radius_km: number;
  delivery_fee_cents: number;
  status: "draft" | "pending_review" | "approved" | "suspended" | "rejected";
  status_reason: string | null;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  rating_avg: number;
  rating_count: number;
  orders_completed: number;
  created_at: string;
}

export interface Dish {
  id: string;
  cook_id: string;
  title: string;
  description: string | null;
  ingredients: string | null;
  cuisine: string;
  course?: string;
  photos: string[];
  price_cents: number;
  temperature: Temperature;
  allergens: string[];
  diets: string[];
  spice_level: number;
  portion_grams: number | null;
  is_active: boolean;
  is_hidden_by_moderation: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface DishExtra {
  id: string;
  dish_id: string;
  name: string;
  emoji: string | null;
  price_cents: number;
  is_active: boolean;
  position: number;
}

export interface Drop {
  id: string;
  dish_id: string;
  cook_id: string;
  available_on: string;
  ready_from: string;
  ready_until: string;
  quantity_total: number;
  quantity_remaining: number;
  status: "scheduled" | "open" | "sold_out" | "closed" | "cancelled";
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  line1: string;
  line2: string | null;
  postal_code: string;
  city: string;
  country: string;
  instructions: string | null;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  drop_id: string;
  dish_id: string;
  title: string;
  quantity: number;
  unit_price_cents: number;
  extras: { id: string; name: string; price_cents: number }[];
  line_total_cents: number;
}

export interface Order {
  id: string;
  number: number;
  customer_id: string;
  cook_id: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  delivery_address: {
    label: string; line1: string; line2: string | null; postal_code: string; city: string; instructions: string | null;
  } | null;
  scheduled_for: string;
  note: string | null;
  subtotal_cents: number;
  discount_cents: number;
  promo_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  platform_fee_cents: number;
  cook_payout_cents: number;
  tip_cents?: number;
  courier_payout_cents?: number;
  cook_commission_cents?: number;
  currency?: string;
  pickup_code: string;
  paid_at: string | null;
  accepted_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  cook_id: string;
  rating: number;
  comment: string | null;
  cook_reply: string | null;
  cook_replied_at: string | null;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null } | null;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface CookDashboard {
  revenue_cents: number;
  orders_count: number;
  customers_count: number;
  pending_count: number;
  active_count: number;
  previous_revenue_cents: number;
  daily: { day: string; revenue_cents: number; orders: number }[];
  pending_payout_cents: number;
}

// ------------------------------------------------------------------ livraison par livreurs
export type CookStatus = "draft" | "pending_review" | "approved" | "suspended" | "rejected";
export type DeliveryStatus = "pending" | "searching" | "assigned" | "at_pickup" | "picked_up" | "delivered" | "cancelled";
export type Vehicle = "foot" | "bike" | "ebike" | "scooter" | "car";

export interface Courier {
  id: string;
  country: string;
  city: string | null;
  vehicle: Vehicle;
  status: CookStatus;
  status_reason: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  stripe_account_id: string | null;
  stripe_payouts_enabled: boolean;
  rating_avg: number;
  rating_count: number;
  deliveries_completed: number;
  created_at: string;
}

export interface AvailableDelivery {
  delivery_id: string;
  order_number: number;
  kitchen_name: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_distance_m: number;
  distance_m: number;
  dropoff_city: string | null;
  dropoff_postal_code: string | null;
  payout_cents: number;
  tip_cents: number;
  currency: string;
  order_status: OrderStatus;
  ready_until: string | null;
  searching_since: string | null;
}

export interface DeliveryAddressPoint {
  line1: string | null;
  line2?: string | null;
  postal_code: string | null;
  city: string | null;
  instructions?: string | null;
  customer_name?: string;
  lat: number;
  lng: number;
}

export interface DeliveryDetails {
  delivery_id: string;
  status: DeliveryStatus;
  order_id: string;
  order_number: number;
  order_status: OrderStatus;
  payout_cents: number;
  tip_cents: number;
  fee_cents: number;
  currency: string;
  distance_m: number;
  kitchen_name: string;
  note: string | null;
  items: { title: string; quantity: number }[];
  pickup: DeliveryAddressPoint | null;
  dropoff: DeliveryAddressPoint | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}

export interface DeliveryTracking {
  status: DeliveryStatus;
  distance_m: number;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  courier: {
    name: string; avatar_url: string | null; vehicle: Vehicle; rating: number; rating_count: number;
    lat: number | null; lng: number | null; last_seen_at: string | null;
  } | null;
}

export interface CourierDashboard {
  earnings_cents: number;
  tips_cents: number;
  deliveries_count: number;
  distance_m: number;
  pending_payout_cents: number;
  active: string[];
  daily: { day: string; earnings_cents: number; deliveries: number }[];
  currency: string | null;
}

export interface DeliveryQuote {
  currency: string;
  distance_m: number;
  courier: { available: boolean; fee_cents: number };
  cook_delivery: { available: boolean; fee_cents: number };
  available?: false;
  reason?: string;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
  enabled: boolean;
  service_rate: number;
  cook_commission_rate: number;
  courier_commission_rate: number;
  delivery_base_cents: number;
  delivery_per_km_cents: number;
  delivery_min_cents: number;
  delivery_max_cents: number;
  courier_max_distance_km: number;
  min_order_cents: number;
  courier_mode: "independent" | "partner_agency" | "disabled";
  payout_delay_hours: number;
  vat_rate: number;
}

export interface PlatformStats {
  by_currency: {
    currency: string; gmv_cents: number | null; revenue_cents: number | null; food_revenue_cents: number | null; delivery_revenue_cents: number;
    cooks_cents: number | null; couriers_cents: number | null; tips_cents: number; orders: number; completed: number; cancelled: number; avg_basket_cents: number | null;
  }[];
  /** Portions vendues par type de plat (main, dessert, pastry…). */
  items_by_course: Record<string, number>;
  top_dishes: { title: string; kitchen_name: string; course: string; qty: number; sales_cents: number; currency: string }[];
  top_cooks: { kitchen_name: string; slug: string; orders: number; sales_cents: number; currency: string }[];
  sellers_active: number;
  dishes_published: number;
  deliveries_completed: number;
  users_total: number;
  documents_to_review: number;
  installs: { total: number; ios: number; android: number; new: number; active_30d: number };
  orders_active: number;
  deliveries_searching: number;
  cooks_approved: number;
  cooks_pending: number;
  couriers_approved: number;
  couriers_pending: number;
  couriers_online: number;
  new_users: number;
  customers_active: number;
  reports_open: number;
  payouts_pending_cents: number;
  daily: { day: string; orders: number; revenue_cents: number | null }[];
}

export interface Dac7Row {
  seller_type: "cook" | "courier";
  seller_id: string;
  legal_name: string | null;
  display_name: string;
  birth_date: string | null;
  tax_id: string | null;
  vat_number: string | null;
  business_status: string;
  registration_number: string | null;
  country: string;
  address: string | null;
  currency: string;
  transactions: number;
  consideration_cents: number;
  fees_cents: number;
  q1_cents: number | null;
  q2_cents: number | null;
  q3_cents: number | null;
  q4_cents: number | null;
  reportable: boolean;
}
