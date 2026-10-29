import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Flame, MapPin, Snowflake, Star, UtensilsCrossed } from "lucide-react";
import { cuisineLabel, formatDistance, formatMoney, formatTime, relativeDay, type FeedItem, t } from "@mami/shared";
import { photoUrl } from "@/lib/utils";

const TEMP = {
  hot: { label: t("🔥 Chaud"), cls: "bg-status-hot" },
  reheat: { label: t("♨️ À réchauffer"), cls: "bg-status-warn" },
  cold: { label: t("🥗 Froid"), cls: "bg-primary" },
  frozen: { label: t("🧊 Congelé"), cls: "bg-status-frozen" },
} as const;

export function DishCard({ item, index = 0 }: { item: FeedItem; index?: number }) {
  const soldOut = item.quantity_remaining === 0;
  const temp = TEMP[item.temperature];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.04 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow shadow-card-hover"
    >
      <Link to={`/plat/${item.drop_id}`} className="absolute inset-0 z-10" aria-label={`${item.title} — ${item.cook_name}`} />
      <div className="relative aspect-square overflow-hidden">
        <img src={photoUrl(item.photos[0])} alt="" loading="lazy" decoding="async"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? "grayscale" : ""}`} />
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1.5 text-xs font-bold tabular-nums shadow-sm backdrop-blur-md">
          {item.temperature === "frozen" ? <Snowflake className="h-3 w-3 text-status-frozen" /> : <Flame className="h-3 w-3 text-status-hot" />}
          {soldOut ? t("Épuisé") : `${item.quantity_remaining} ${item.quantity_remaining > 1 ? t("plats restants") : t("plat restant")}`}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-card/90 px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-md">
          {cuisineLabel(item.cuisine)}
        </span>
        {item.menu_deal && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full gradient-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm">
            <UtensilsCrossed className="h-3 w-3" />{" "}{t("Menu dispo")}
          </span>
        )}
        <span className={`absolute bottom-3 right-3 rounded-full px-2 py-1 text-xs font-semibold text-white ${temp.cls}`}>{t(temp.label)}</span>
        {item.photos[0]?.includes("/ia-illustration") && <span className="absolute left-3 top-12 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">{t("Illustration IA")}</span>}
      </div>

      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="text-base font-bold leading-tight">{item.title}</h3>
          <p className="shrink-0 text-base font-bold tabular-nums">{formatMoney(item.customer_price_cents, item.currency)}</p>
        </div>
        <div className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{item.cook_name}</span>
          <span className="text-xs">{t("· Vérifié")}</span>
        </div>

        {item.extras.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {item.extras.slice(0, 3).map((e) => (
              <span key={e.id} className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs">
                <span aria-hidden>{e.emoji}</span>
                <span className="text-muted-foreground">{e.name}</span>
                <span className="font-semibold tabular-nums">+{formatMoney(e.customer_price_cents, item.currency)}</span>
              </span>
            ))}
          </div>
        )}

        {item.menu_deal && (
          <div className="mb-2.5 rounded-lg border border-accent/20 bg-accent/5 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-xs font-bold text-accent"><UtensilsCrossed className="h-3 w-3" />{item.menu_deal.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.menu_deal.items}</p>
              </div>
              <span className="text-sm font-bold tabular-nums text-accent">{formatMoney(item.menu_deal.customer_price_cents, item.currency)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="font-semibold tabular-nums text-foreground">{Number(item.dish_rating || item.cook_rating).toFixed(1)}</span>
              <span>({item.dish_rating_count || item.cook_rating_count})</span>
            </span>
            {item.distance_m != null && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{formatDistance(item.distance_m)}</span>}
          </div>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{relativeDay(item.available_on)} · {formatTime(item.ready_from)}</span>
        </div>
      </div>
    </motion.article>
  );
}

export function DishCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
