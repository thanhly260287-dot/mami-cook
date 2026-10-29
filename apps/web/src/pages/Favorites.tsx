import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cuisineLabel } from "@mami/shared";
import { fetchFavoriteCooks } from "@/lib/api";
import { Card, EmptyState, Spinner, Stars } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";

export default function Favorites() {
  const q = useQuery({ queryKey: ["favorite-cooks"], queryFn: fetchFavoriteCooks });
  return (
    <div className="container max-w-4xl py-8">
      <Seo title="Mes cuisines favorites — MAMI COOK" noindex />
      <h1 className="mb-6 text-3xl font-extrabold">Mes cuisines favorites</h1>
      {q.isLoading ? <Spinner /> : !q.data?.length ? (
        <EmptyState icon="❤️" title="Aucune cuisine favorite" action={<Button asChild><Link to="/explorer">Découvrir des cuisines</Link></Button>}>Suivez vos cuisinières préférées pour être averti de leurs nouveaux plats.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {q.data.map((c) => (
            <Link key={c.id} to={`/cuisine/${c.slug}`}>
              <Card className="flex items-center gap-4 p-4 hover:bg-muted/50">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-xl font-bold text-white">{c.kitchen_name.replace(/^Chez /, "").slice(0, 1)}</div>
                <div>
                  <p className="font-bold">{c.kitchen_name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground"><Stars value={c.rating_avg} size={12} /> {c.rating_count} avis</p>
                  <p className="text-xs text-muted-foreground">{c.cuisines.map(cuisineLabel).join(" · ")}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
