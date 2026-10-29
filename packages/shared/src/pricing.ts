import { intlLocale } from "./i18n";

// Calcul des prix. ATTENTION : le serveur (fonction SQL `place_order`) refait
// TOUJOURS ce calcul et c'est lui qui fait foi. Ce module sert uniquement à
// afficher un récapitulatif cohérent côté client. Les deux implémentations sont
// testées avec les mêmes cas (packages/shared/src/pricing.test.ts et
// supabase/tests/*.sql).

/** Majoration plateforme appliquée au prix fixé par la cuisinière (20 %). */
export const SERVICE_RATE = 0.2;

/** Remises automatiques par volume (nombre total de plats dans la commande). */
export const VOLUME_DISCOUNTS = [
  { minPlates: 10, rate: 0.15 },
  { minPlates: 5, rate: 0.1 },
] as const;

/** Montant minimum d'une commande (hors frais de livraison), en centimes. */
export const MIN_ORDER_CENTS = 500;

/** Quantité maximum d'un même plat par commande (anti-accaparement). */
export const MAX_QTY_PER_LINE = 20;

/** Prix client d'un article (prix cuisinière + majoration), en centimes. */
export function customerPrice(cookPriceCents: number): number {
  return Math.round(cookPriceCents * (1 + SERVICE_RATE));
}

export function volumeDiscountRate(totalPlates: number): number {
  for (const tier of VOLUME_DISCOUNTS) {
    if (totalPlates >= tier.minPlates) return tier.rate;
  }
  return 0;
}

export interface PricedLine {
  /** Prix cuisinière unitaire du plat, en centimes. */
  unitCookPriceCents: number;
  /** Somme des prix cuisinière des suppléments choisis (par unité), en centimes. */
  extrasCookPriceCents: number;
  quantity: number;
  /** Les menus ne comptent pas dans la remise volume (déjà remisés). */
  isMenuDeal?: boolean;
}

export interface PriceBreakdown {
  /** Total articles au prix client, avant remise. */
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  promoCents: number;
  totalCents: number;
  /** Part de la plateforme (commission). */
  platformFeeCents: number;
  /** Ce que la cuisinière reçoit. */
  cookPayoutCents: number;
  totalPlates: number;
}

export function computeOrderPrice(
  lines: PricedLine[],
  opts: { deliveryFeeCents?: number; promoCents?: number } = {},
): PriceBreakdown {
  let subtotal = 0;
  let cookBase = 0;
  let discountable = 0;
  let plates = 0;

  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1) throw new Error("Quantité invalide");
    const unitCook = l.unitCookPriceCents + l.extrasCookPriceCents;
    const unitCustomer = customerPrice(unitCook);
    subtotal += unitCustomer * l.quantity;
    cookBase += unitCook * l.quantity;
    plates += l.quantity;
    if (!l.isMenuDeal) discountable += unitCustomer * l.quantity;
  }

  const rate = volumeDiscountRate(plates);
  const discount = Math.round(discountable * rate);
  const itemsAfterDiscount = subtotal - discount;
  const promo = Math.min(opts.promoCents ?? 0, itemsAfterDiscount);
  const delivery = opts.deliveryFeeCents ?? 0;

  // La remise volume est partagée au prorata entre cuisinière et plateforme ;
  // le code promo est entièrement à la charge de la plateforme.
  const cookPayoutItems = subtotal === 0 ? 0 : Math.round((cookBase * itemsAfterDiscount) / subtotal);
  const platformFee = itemsAfterDiscount - cookPayoutItems - promo;

  return {
    subtotalCents: subtotal,
    discountCents: discount,
    deliveryFeeCents: delivery,
    promoCents: promo,
    totalCents: itemsAfterDiscount - promo + delivery,
    platformFeeCents: platformFee,
    cookPayoutCents: cookPayoutItems + delivery,
    totalPlates: plates,
  };
}

export function formatEuros(cents: number): string {
  return formatMoney(cents, "EUR");
}

/** Montant dans la devise de la commande ou du pays (EUR, CHF, GBP…). */
export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat(intlLocale(), { style: "currency", currency }).format(cents / 100);
}

/** Pourboires proposés au client pour son livreur (en centimes). Il reçoit 100 % du pourboire. */
export const TIP_PRESETS_CENTS = [0, 100, 200, 300, 500] as const;
export const MAX_TIP_CENTS = 5000;
