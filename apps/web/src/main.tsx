import { createRoot } from "react-dom/client";
import { isRtl, pickLocale, setLocale, type Locale } from "@mami/shared";
import "./index.css";

// Thème : choix mémorisé, sinon préférence du système
try {
  const theme = localStorage.getItem("mami-theme");
  if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) document.documentElement.classList.add("dark");
} catch { /* ignore */ }

// Langue : choix mémorisé, sinon langue du navigateur. Elle doit être fixée AVANT
// de charger l'application (certains textes sont calculés au chargement des modules).
let locale: Locale = pickLocale(navigator.languages ?? [navigator.language]);
try {
  const saved = localStorage.getItem("mami-locale");
  if (saved) locale = pickLocale([saved]);
} catch { /* ignore */ }
setLocale(locale);
document.documentElement.lang = locale;
document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";

import("./App").then(({ default: App }) => createRoot(document.getElementById("root")!).render(<App />));
