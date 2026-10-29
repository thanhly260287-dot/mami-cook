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
  limit?: number;
  offset?: number;
}

export interface Cook {
  id: string;
  slug: string;
  kitchen_name: string;
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
