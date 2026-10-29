import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

// Carte d'une course : cuisine (retrait), client (dépôt) et position du livreur.
export interface MapPoint { lat: number; lng: number; kind: "pickup" | "dropoff" | "courier" }

const COLORS = { pickup: "#9b51e0", dropoff: "#3fbef0", courier: "#16a34a" } as const;
const EMOJI = { pickup: "👩‍🍳", dropoff: "🏠", courier: "🛵" } as const;
const icon = (k: MapPoint["kind"]) => L.divIcon({
  className: "",
  html: `<div style="background:${COLORS[k]};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.25);transform:translate(-50%,-50%)">${EMOJI[k]}</div>`,
});

function Fit({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function RouteMap({ points, className }: { points: MapPoint[]; className?: string }) {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!valid.length) return null;
  const pick = valid.find((p) => p.kind === "pickup");
  const drop = valid.find((p) => p.kind === "dropoff");
  return (
    <MapContainer center={[valid[0].lat, valid[0].lng]} zoom={14} scrollWheelZoom={false} className={className ?? "h-64 w-full rounded-2xl z-0"}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Fit points={valid} />
      {pick && drop && <Polyline positions={[[pick.lat, pick.lng], [drop.lat, drop.lng]]} pathOptions={{ color: "#9b51e0", dashArray: "6 8", weight: 3 }} />}
      {valid.map((p) => <Marker key={p.kind} position={[p.lat, p.lng]} icon={icon(p.kind)} />)}
    </MapContainer>
  );
}

/** Lien d'itinéraire (ouvre l'appli de navigation du téléphone). */
export const directionsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
