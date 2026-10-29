import { t } from "./i18n";

// Référentiels partagés entre le site, les applis et la base de données.
// Toute modification ici doit être répercutée dans supabase/migrations (types enum / contraintes).

export const CUISINES = [
  { id: "vietnamese", label: "Vietnamien", emoji: "🇻🇳" },
  { id: "thai", label: "Thaï", emoji: "🇹🇭" },
  { id: "chinese", label: "Chinois", emoji: "🇨🇳" },
  { id: "japanese", label: "Japonais", emoji: "🇯🇵" },
  { id: "korean", label: "Coréen", emoji: "🇰🇷" },
  { id: "indian", label: "Indien", emoji: "🇮🇳" },
  { id: "italian", label: "Italien", emoji: "🇮🇹" },
  { id: "french", label: "Français", emoji: "🇫🇷" },
  { id: "spanish", label: "Espagnol", emoji: "🇪🇸" },
  { id: "portuguese", label: "Portugais", emoji: "🇵🇹" },
  { id: "moroccan", label: "Marocain", emoji: "🇲🇦" },
  { id: "algerian", label: "Algérien", emoji: "🇩🇿" },
  { id: "tunisian", label: "Tunisien", emoji: "🇹🇳" },
  { id: "lebanese", label: "Libanais", emoji: "🇱🇧" },
  { id: "turkish", label: "Turc", emoji: "🇹🇷" },
  { id: "african", label: "Africain", emoji: "🌍" },
  { id: "caribbean", label: "Antillais", emoji: "🌴" },
  { id: "mexican", label: "Mexicain", emoji: "🇲🇽" },
  { id: "fastfood", label: "Fast Food", emoji: "🍔" },
  { id: "dessert", label: "Desserts", emoji: "🍰" },
  { id: "lab", label: "Le Labo", emoji: "🧪" },
] as const;

export type CuisineId = (typeof CUISINES)[number]["id"];
export const CUISINE_IDS = CUISINES.map((c) => c.id) as [CuisineId, ...CuisineId[]];

export function cuisineLabel(id: string): string {
  const c = CUISINES.find((x) => x.id === id);
  return c ? `${c.emoji} ${t(c.label)}` : id;
}

/** Les 14 allergènes à déclaration obligatoire (règlement UE n°1169/2011). */
export const ALLERGENS = [
  { id: "gluten", label: "Gluten" },
  { id: "crustaceans", label: "Crustacés" },
  { id: "eggs", label: "Œufs" },
  { id: "fish", label: "Poisson" },
  { id: "peanuts", label: "Arachides" },
  { id: "soy", label: "Soja" },
  { id: "milk", label: "Lait" },
  { id: "nuts", label: "Fruits à coque" },
  { id: "celery", label: "Céleri" },
  { id: "mustard", label: "Moutarde" },
  { id: "sesame", label: "Sésame" },
  { id: "sulphites", label: "Sulfites" },
  { id: "lupin", label: "Lupin" },
  { id: "molluscs", label: "Mollusques" },
] as const;
export type AllergenId = (typeof ALLERGENS)[number]["id"];
export const ALLERGEN_IDS = ALLERGENS.map((a) => a.id) as [AllergenId, ...AllergenId[]];

export const DIETS = [
  { id: "vegetarian", label: "Végétarien", emoji: "🥕" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "halal", label: "Halal", emoji: "☪️" },
  { id: "kosher", label: "Casher", emoji: "✡️" },
  { id: "gluten_free", label: "Sans gluten", emoji: "🌾" },
  { id: "lactose_free", label: "Sans lactose", emoji: "🥛" },
] as const;
export type DietId = (typeof DIETS)[number]["id"];
export const DIET_IDS = DIETS.map((d) => d.id) as [DietId, ...DietId[]];

export const TEMPERATURES = [
  { id: "hot", label: "Chaud", emoji: "🔥" },
  { id: "reheat", label: "À réchauffer", emoji: "♨️" },
  { id: "cold", label: "Froid", emoji: "🥗" },
  { id: "frozen", label: "Congelé", emoji: "🧊" },
] as const;
export type Temperature = (typeof TEMPERATURES)[number]["id"];
export const TEMPERATURE_IDS = TEMPERATURES.map((t) => t.id) as [Temperature, ...Temperature[]];

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
  "refunded",
  "expired",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "En attente de paiement",
  paid: "Payée — en attente de la cuisinière",
  accepted: "Acceptée",
  preparing: "En préparation",
  ready: "Prête",
  out_for_delivery: "En livraison",
  completed: "Terminée",
  cancelled: "Annulée",
  refunded: "Remboursée",
  expired: "Expirée",
};

// delivery = la cuisinière livre ; courier = livreur MAMI COOK ; pickup = retrait sur place
export const FULFILLMENTS = ["delivery", "pickup", "courier"] as const;
export type Fulfillment = (typeof FULFILLMENTS)[number];

export const REPORT_REASONS = [
  { id: "food_safety", label: "Problème d'hygiène / sécurité alimentaire" },
  { id: "allergen", label: "Allergène non déclaré" },
  { id: "not_received", label: "Commande non reçue" },
  { id: "not_as_described", label: "Non conforme à l'annonce" },
  { id: "inappropriate", label: "Contenu inapproprié" },
  { id: "fraud", label: "Fraude / arnaque" },
  { id: "other", label: "Autre" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["id"];
