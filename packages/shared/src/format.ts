import { getLocale, intlLocale, t } from "./i18n";

export function formatTime(hhmm: string): string {
  const s = hhmm.slice(0, 5);
  return getLocale() === "fr" ? s.replace(":", "h") : s;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }): string {
  return new Intl.DateTimeFormat(intlLocale(), opts).format(new Date(iso));
}

export function relativeDay(isoDate: string, now = new Date()): string {
  const d = new Date(isoDate + "T00:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return t("Aujourd'hui");
  if (diff === 1) return t("Demain");
  return formatDate(isoDate + "T00:00:00", { weekday: "long", day: "numeric", month: "short" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
