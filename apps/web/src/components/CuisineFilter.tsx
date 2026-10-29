import { motion } from "framer-motion";
import { CUISINES, t } from "@mami/shared";
import { cn } from "@/lib/utils";

const ALL = [{ id: "", label: t("Tout"), emoji: "🍽️" }, ...CUISINES, { id: "frozen", label: t("Congelé"), emoji: "🧊" }];

export function CuisineFilter({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label={t("Filtrer par cuisine")}>
      {ALL.map((c) => {
        const active = value === c.id;
        return (
          <button key={c.id || "all"} role="tab" aria-selected={active} onClick={() => onChange(c.id)}
            className={cn("relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              active ? "text-primary-foreground" : "border border-border bg-card text-secondary-foreground hover:bg-muted")}>
            {active && <motion.span layoutId="cuisine-active" className="absolute inset-0 rounded-xl gradient-primary" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
            <span className="relative z-10" aria-hidden>{c.emoji}</span>
            <span className="relative z-10">{t(c.label)}</span>
          </button>
        );
      })}
    </div>
  );
}
