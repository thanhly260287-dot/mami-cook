// Langue de l'appli : choix mémorisé, sinon langue du téléphone.
import { I18nManager } from "react-native";
import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { isRtl, pickLocale, setLocale, type Locale } from "@mami/shared";

const KEY = "mami-locale";
const listeners = new Set<(l: Locale) => void>();

export function initLocale() {
  let saved: string | null = null;
  try { saved = SecureStore.getItem(KEY); } catch { /* ignore */ }
  const l = pickLocale(saved ? [saved] : getLocales().map((x) => x.languageTag));
  setLocale(l);
  I18nManager.allowRTL(true);
  return l;
}

export function changeLocale(l: Locale) {
  try { SecureStore.setItem(KEY, l); } catch { /* ignore */ }
  setLocale(l);
  // La mise en page droite-à-gauche (arabe) s'applique au prochain lancement.
  I18nManager.forceRTL(isRtl(l));
  listeners.forEach((fn) => fn(l));
}

export function onLocaleChange(fn: (l: Locale) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
