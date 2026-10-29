/** Distance à vol d'oiseau en km (formule de haversine). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

import { intlLocale } from "./i18n";

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return "";
  if (meters < 1000) return `${Math.max(100, Math.round(meters / 100) * 100)} m`;
  return `${new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(meters / 1000)} km`;
}

/** Paris centre — position par défaut quand la géolocalisation est refusée. */
export const DEFAULT_LOCATION = { lat: 48.8566, lng: 2.3522, label: "Paris" };
