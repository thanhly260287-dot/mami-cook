import { lazy, Suspense, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { DIETS, TEMPERATURES, type Temperature } from "@mami/shared";
import { fetchFeed } from "@/lib/api";
import { useGeo } from "@/hooks/useGeo";
import { CuisineFilter } from "@/components/CuisineFilter";
import { DishCard, DishCardSkeleton } from "@/components/DishCard";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/utils";

const MapView = lazy(() => import("@/components/MapView").then((m) => ({ default: m.MapView })));
const PAGE = 24;

function nextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    return { value: d.toISOString().slice(0, 10), label: i === 0 ? "Aujourd'hui" : i === 1 ? "Demain" : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" }) };
  });
}

export default function Explore() {
  const geo = useGeo();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<"list" | "map">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get("q") ?? "";
  const cuisine = params.get("cuisine") ?? "";
  const temperature = (params.get("temperature") as Temperature | null) ?? null;
  const diets = params.getAll("diet");
  const radius = Number(params.get("rayon") ?? 10);
  const date = params.get("date") ?? nextDays(1)[0].value;

  const set = (k: string, v: string | string[] | null) => {
    const p = new URLSearchParams(params);
    p.delete(k);
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else if (v) p.set(k, v);
    setParams(p, { replace: true });
  };

  const feed = useInfiniteQuery({
    queryKey: ["explore", geo.lat, geo.lng, q, cuisine, temperature, diets.join(","), radius, date],
    queryFn: ({ pageParam }) => fetchFeed({
      lat: geo.lat, lng: geo.lng, radiusKm: radius, query: q, cuisine: cuisine === "frozen" ? null : cuisine || null,
      temperature: cuisine === "frozen" ? "frozen" : temperature, diets, date, limit: PAGE, offset: pageParam,
    }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length * PAGE : undefined),
  });
  const items = feed.data?.pages.flat() ?? [];
  const activeFilters = (temperature ? 1 : 0) + diets.length + (radius !== 10 ? 1 : 0);

  return (
    <div className="container py-6">
      <Seo title={q ? `« ${q} » — MAMI COOK` : "Explorer les cuisines près de chez vous — MAMI COOK"} path="/explorer" />
      <div className="mb-4 md:hidden">
        <form onSubmit={(e) => { e.preventDefault(); set("q", new FormData(e.currentTarget).get("q") as string); }} role="search">
          <Input name="q" type="search" defaultValue={q} placeholder="Chercher un plat, une cuisine…" />
        </form>
      </div>
      <CuisineFilter value={cuisine} onChange={(c) => set("cuisine", c || null)} />

      <div className="my-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{q ? `Résultats pour « ${q} »` : "Près de chez vous"}</h1>
          <p className="text-sm text-muted-foreground">{feed.isLoading ? "Recherche…" : `${items.length}${feed.hasNextPage ? "+" : ""} plat${items.length > 1 ? "s" : ""} · ${geo.label}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={date} onChange={(e) => set("date", e.target.value)} className="h-10 w-auto" aria-label="Jour">
            {nextDays(7).map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
          <Button variant="outline" size="sm" className="h-10" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal /> Filtres{activeFilters ? ` (${activeFilters})` : ""}
          </Button>
          <div className="flex rounded-xl border border-border bg-card p-0.5">
            <button onClick={() => setView("list")} className={cn("rounded-lg p-2", view === "list" && "bg-muted")} aria-label="Vue liste" aria-pressed={view === "list"}><List className="h-4 w-4" /></button>
            <button onClick={() => setView("map")} className={cn("rounded-lg p-2", view === "map" && "bg-muted")} aria-label="Vue carte" aria-pressed={view === "map"}><MapIcon className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {view === "map" ? (
        <div className="h-[70vh] overflow-hidden rounded-2xl border border-border">
          <Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}>
            <MapView items={items} center={geo} />
          </Suspense>
        </div>
      ) : feed.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <DishCardSkeleton key={i} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon="🔍" title="Aucun plat ne correspond" action={<Button variant="secondary" onClick={() => setParams({})}>Effacer les filtres</Button>}>
          Élargissez le rayon de recherche, changez de jour ou de cuisine.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((it, i) => <DishCard key={it.drop_id} item={it} index={i % PAGE} />)}
          </div>
          {feed.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button variant="secondary" loading={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>Voir plus de plats</Button>
            </div>
          )}
        </>
      )}

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtres">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-semibold">Rayon : {radius} km</p>
            <input type="range" min={1} max={30} value={radius} onChange={(e) => set("rayon", e.target.value)} className="w-full accent-[hsl(var(--primary))]" aria-label="Rayon de recherche" />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Température</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={!temperature} onClick={() => set("temperature", null)}>Toutes</Chip>
              {TEMPERATURES.map((t) => <Chip key={t.id} active={temperature === t.id} onClick={() => set("temperature", t.id)}>{t.emoji} {t.label}</Chip>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Régime alimentaire</p>
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => (
                <Chip key={d.id} active={diets.includes(d.id)} onClick={() => set("diet", diets.includes(d.id) ? diets.filter((x) => x !== d.id) : [...diets, d.id])}>
                  {d.emoji} {d.label}
                </Chip>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={() => setFiltersOpen(false)}>Voir les plats</Button>
        </div>
      </Dialog>
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("rounded-xl border px-3 py-2 text-sm font-medium", active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted")}>
      {children}
    </button>
  );
}
