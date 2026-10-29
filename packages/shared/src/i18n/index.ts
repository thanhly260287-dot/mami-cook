// Traductions partagées par le site et les applis.
// Le texte français sert de clé : t("Mon panier") → "My cart" en anglais.
// Une clé absente d'une langue retombe sur le français (jamais d'écran vide).
import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import it from "./locales/it.json";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import vi from "./locales/vi.json";
import tr from "./locales/tr.json";

export const LOCALES = [
  { id: "fr", label: "Français", flag: "🇫🇷", intl: "fr-FR", rtl: false },
  { id: "en", label: "English", flag: "🇬🇧", intl: "en-GB", rtl: false },
  { id: "es", label: "Español", flag: "🇪🇸", intl: "es-ES", rtl: false },
  { id: "pt", label: "Português", flag: "🇵🇹", intl: "pt-PT", rtl: false },
  { id: "it", label: "Italiano", flag: "🇮🇹", intl: "it-IT", rtl: false },
  { id: "de", label: "Deutsch", flag: "🇩🇪", intl: "de-DE", rtl: false },
  { id: "ar", label: "العربية", flag: "🇲🇦", intl: "ar", rtl: true },
  { id: "zh", label: "中文", flag: "🇨🇳", intl: "zh-CN", rtl: false },
  { id: "vi", label: "Tiếng Việt", flag: "🇻🇳", intl: "vi-VN", rtl: false },
  { id: "tr", label: "Türkçe", flag: "🇹🇷", intl: "tr-TR", rtl: false },
] as const;

export type Locale = (typeof LOCALES)[number]["id"];
const DICTS: Record<string, Record<string, string>> = { en, es, pt, it, de, ar, zh, vi, tr };

let current: Locale = "fr";

export function setLocale(l: Locale) {
  current = l;
}
export function getLocale(): Locale {
  return current;
}
export function intlLocale(l: Locale = current): string {
  return LOCALES.find((x) => x.id === l)?.intl ?? "fr-FR";
}
export function isRtl(l: Locale = current): boolean {
  return LOCALES.find((x) => x.id === l)?.rtl ?? false;
}

/** Choisit la meilleure langue parmi celles préférées par l'appareil / le navigateur. */
export function pickLocale(preferred: readonly string[]): Locale {
  for (const p of preferred) {
    const base = p.toLowerCase().split(/[-_]/)[0];
    const hit = LOCALES.find((l) => l.id === base);
    if (hit) return hit.id;
  }
  return "fr";
}

/** Traduit un texte français ; {nom} est remplacé par vars.nom. */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const s = locale === "fr" ? key : DICTS[locale]?.[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`)) : s;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  return translate(current, key, vars);
}
