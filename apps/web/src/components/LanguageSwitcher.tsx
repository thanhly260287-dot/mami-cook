import { Globe } from "lucide-react";
import { getLocale, LOCALES, t } from "@mami/shared";
import { cn } from "@/lib/utils";

/** Changer de langue recharge la page pour retraduire tous les textes. */
export function changeLocale(id: string) {
  try { localStorage.setItem("mami-locale", id); } catch { /* ignore */ }
  window.location.reload();
}

export function LanguageSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <label className={cn("relative inline-flex items-center gap-1.5 text-sm", className)}>
      <Globe className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">{t("Langue")}</span>
      <select value={getLocale()} onChange={(e) => changeLocale(e.target.value)}
        className={cn("cursor-pointer appearance-none bg-transparent font-medium focus:outline-none", compact ? "absolute inset-0 h-full w-full opacity-0" : "pr-1")}
        aria-label={t("Langue")}>
        {LOCALES.map((l) => <option key={l.id} value={l.id} className="text-foreground">{l.flag} {l.label}</option>)}
      </select>
    </label>
  );
}
