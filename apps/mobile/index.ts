// Point d'entrée : la langue est fixée avant le chargement des écrans.
import { initLocale } from "./src/lib/i18n";

initLocale();
require("expo-router/entry");
