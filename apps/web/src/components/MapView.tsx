import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { formatEuros, type FeedItem } from "@mami/shared";

// Les cuisines sont affichées à leur position publique floutée (pas l'adresse exacte).
const icon = (label: string) => L.divIcon({
  className: "",
  html: `<div style="background:linear-gradient(135deg,#3fbef0,#9b51e0);color:#fff;font:700 12px 'Plus Jakarta Sans',sans-serif;padding:6px 10px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.2);white-space:nowrap;transform:translate(-50%,-50%)">${label}</div>`,
});
const me = L.divIcon({ className: "", html: `<div style="width:18px;height:18px;border-radius:50%;background:#3fbef0;border:3px solid #fff;box-shadow:0 0 0 6px rgba(63,190,240,.25);transform:translate(-50%,-50%)"></div>` });

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng]); }, [lat, lng, map]);
  return null;
}

export function MapView({ items, center }: { items: (FeedItem & { lat?: number; lng?: number })[]; center: { lat: number; lng: number } }) {
  // Position approximative déduite de la distance quand les coordonnées ne sont pas fournies
  const cooks = new Map<string, { item: FeedItem; lat: number; lng: number; count: number }>();
  items.forEach((it, i) => {
    const existing = cooks.get(it.cook_id);
    if (existing) { existing.count++; return; }
    const angle = (i * 137.5 * Math.PI) / 180;
    const d = (it.distance_m ?? 500) / 111_000;
    cooks.set(it.cook_id, { item: it, lat: it.lat ?? center.lat + d * Math.sin(angle), lng: it.lng ?? center.lng + (d * Math.cos(angle)) / Math.cos((center.lat * Math.PI) / 180), count: 1 });
  });

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={14} scrollWheelZoom className="h-full w-full rounded-2xl z-0">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter lat={center.lat} lng={center.lng} />
      <Marker position={[center.lat, center.lng]} icon={me} />
      {[...cooks.values()].map(({ item, lat, lng, count }) => (
        <Marker key={item.cook_id} position={[lat, lng]} icon={icon(`${item.cook_name.replace(/^Chez /, "")} · ${formatEuros(item.customer_price_cents)}`)}>
          <Popup>
            <div className="min-w-[180px]">
              <p className="font-bold">{item.cook_name}</p>
              <p className="text-xs">{count} plat{count > 1 ? "s" : ""} aujourd'hui · ⭐ {Number(item.cook_rating).toFixed(1)}</p>
              <Link to={`/cuisine/${item.cook_slug}`} className="mt-1 inline-block text-xs font-semibold">Voir la cuisine →</Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
