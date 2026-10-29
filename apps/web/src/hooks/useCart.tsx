// Panier local (une seule cuisine à la fois, comme la commande côté serveur).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { computeOrderPrice, MAX_QTY_PER_LINE, type FeedItem } from "@mami/shared";

export interface CartLine {
  key: string;
  dropId: string;
  dishId: string;
  cookId: string;
  cookName: string;
  cookSlug: string;
  title: string;
  photo: string | null;
  availableOn: string;
  unitCookPriceCents: number;
  extras: { id: string; name: string; price_cents: number }[];
  menuDeal: { id: string; name: string; price_cents: number } | null;
  quantity: number;
  maxQuantity: number;
  offersPickup: boolean;
  offersDelivery: boolean;
  deliveryFeeCents: number;
}

interface CartState {
  lines: CartLine[];
  count: number;
  cookId: string | null;
  add: (item: FeedItem, opts: { quantity: number; extraIds: string[]; menuDeal: boolean }) => { replaced: boolean };
  setQuantity: (key: string, q: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  price: (opts?: { delivery?: boolean }) => ReturnType<typeof computeOrderPrice>;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "mami-cart-v1";

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const lines = raw ? (JSON.parse(raw) as CartLine[]) : [];
    const today = new Date().toISOString().slice(0, 10);
    return Array.isArray(lines) ? lines.filter((l) => l.availableOn >= today) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* stockage indisponible (navigation privée) */
    }
  }, [lines]);

  const add = useCallback<CartState["add"]>((item, { quantity, extraIds, menuDeal }) => {
    const extras = item.extras.filter((e) => extraIds.includes(e.id)).map(({ id, name, price_cents }) => ({ id, name, price_cents }));
    const key = [item.drop_id, menuDeal ? item.menu_deal?.id : "", ...extraIds.slice().sort()].join("|");
    const current = linesRef.current;
    const replaced = current.length > 0 && (current[0].cookId !== item.cook_id || current[0].availableOn !== item.available_on);
    setLines((prev) => {
      const base = replaced ? [] : prev;
      const existing = base.find((l) => l.key === key);
      if (existing) {
        return base.map((l) => l.key === key ? { ...l, quantity: Math.min(l.quantity + quantity, l.maxQuantity) } : l);
      }
      return [...base, {
        key, dropId: item.drop_id, dishId: item.dish_id, cookId: item.cook_id, cookName: item.cook_name, cookSlug: item.cook_slug,
        title: menuDeal && item.menu_deal ? `${item.menu_deal.name} (${item.title})` : item.title,
        photo: item.photos[0] ?? null, availableOn: item.available_on,
        unitCookPriceCents: menuDeal && item.menu_deal ? item.menu_deal.price_cents : item.price_cents,
        extras, menuDeal: menuDeal && item.menu_deal ? { id: item.menu_deal.id, name: item.menu_deal.name, price_cents: item.menu_deal.price_cents } : null,
        quantity: Math.min(quantity, item.quantity_remaining, MAX_QTY_PER_LINE),
        maxQuantity: Math.min(item.quantity_remaining, MAX_QTY_PER_LINE),
        offersPickup: item.offers_pickup, offersDelivery: item.offers_delivery, deliveryFeeCents: item.delivery_fee_cents,
      }];
    });
    return { replaced };
  }, []);

  const value = useMemo<CartState>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    cookId: lines[0]?.cookId ?? null,
    add,
    setQuantity: (key, q) => setLines((p) => p.map((l) => l.key === key ? { ...l, quantity: Math.max(1, Math.min(q, l.maxQuantity)) } : l)),
    remove: (key) => setLines((p) => p.filter((l) => l.key !== key)),
    clear: () => setLines([]),
    price: (opts) => computeOrderPrice(
      lines.map((l) => ({
        unitCookPriceCents: l.unitCookPriceCents,
        extrasCookPriceCents: l.extras.reduce((s, e) => s + e.price_cents, 0),
        quantity: l.quantity,
        isMenuDeal: !!l.menuDeal,
      })),
      { deliveryFeeCents: opts?.delivery ? lines[0]?.deliveryFeeCents ?? 0 : 0 },
    ),
  }), [lines, add]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart hors CartProvider");
  return ctx;
}
