// Position de recherche : géolocalisation du navigateur ou adresse choisie, mémorisée localement.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { DEFAULT_LOCATION } from "@mami/shared";

interface Geo { lat: number; lng: number; label: string }
interface GeoState extends Geo {
  setLocation: (g: Geo) => void;
  locate: () => Promise<void>;
  locating: boolean;
}

const GeoContext = createContext<GeoState | null>(null);
const KEY = "mami-location-v1";

function load(): Geo {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (g && typeof g.lat === "number" && typeof g.lng === "number") return g;
  } catch { /* ignore */ }
  return DEFAULT_LOCATION;
}

export function GeoProvider({ children }: { children: ReactNode }) {
  const [geo, setGeo] = useState<Geo>(load);
  const [locating, setLocating] = useState(false);

  const setLocation = useCallback((g: Geo) => {
    setGeo(g);
    try { localStorage.setItem(KEY, JSON.stringify(g)); } catch { /* ignore */ }
  }, []);

  const locate = useCallback(() => new Promise<void>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Géolocalisation indisponible"));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let label = "Ma position";
        try {
          const r = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`);
          const j = await r.json();
          const p = j.features?.[0]?.properties;
          if (p) label = `${p.city}, ${p.postcode}`;
        } catch { /* ignore */ }
        setLocation({ lat, lng, label });
        setLocating(false);
        resolve();
      },
      (err) => { setLocating(false); reject(new Error(err.code === 1 ? "Autorisez la localisation dans votre navigateur" : "Position introuvable")); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }), [setLocation]);

  return <GeoContext.Provider value={{ ...geo, setLocation, locate, locating }}>{children}</GeoContext.Provider>;
}

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) throw new Error("useGeo hors GeoProvider");
  return ctx;
}
