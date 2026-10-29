import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, CalendarDays, Flag, Heart, MapPin, Store } from "lucide-react";
import { cuisineLabel, formatDate, formatEuros, relativeDay, t } from "@mami/shared";
import { fetchCookBySlug, fetchCookReviews, fetchFavorites, fetchFeed, toggleFavorite } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useGeo } from "@/hooks/useGeo";
import { DishCard } from "@/components/DishCard";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Spinner, Stars } from "@/components/ui/misc";
import { ReportDialog } from "@/components/ReportDialog";
import { Seo } from "@/components/Seo";
import { photoUrl, errorMessage } from "@/lib/utils";

export default function CookPage() {
  const { slug } = useParams();
  const geo = useGeo();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const cook = useQuery({ queryKey: ["cook", slug], queryFn: () => fetchCookBySlug(slug!) });
  const dishes = useQuery({ queryKey: ["cook-feed", cook.data?.id], enabled: !!cook.data, queryFn: () => fetchFeed({ lat: geo.lat, lng: geo.lng, cookId: cook.data!.id }) });
  const reviews = useQuery({ queryKey: ["cook-reviews", cook.data?.id], enabled: !!cook.data, queryFn: () => fetchCookReviews(cook.data!.id) });
  const favs = useQuery({ queryKey: ["favorites", user?.id], enabled: !!user, queryFn: fetchFavorites });
  const isFav = !!cook.data && (favs.data ?? []).includes(cook.data.id);
  const fav = useMutation({
    mutationFn: () => toggleFavorite(cook.data!.id, !isFav, user!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["favorites"] }); toast.success(isFav ? t("Retirée des favoris") : t("Ajoutée à vos favoris ❤️")); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (cook.isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!cook.data) return <EmptyState icon="🏠" title={t("Cuisine introuvable")} action={<Button asChild><Link to="/explorer">{t("Explorer")}</Link></Button>} />;
  const c = cook.data;
  const byDay = new Map<string, NonNullable<typeof dishes.data>>();
  (dishes.data ?? []).forEach((d) => byDay.set(d.available_on, [...(byDay.get(d.available_on) ?? []), d]));

  return (
    <div>
      <Seo title={`${c.kitchen_name} — cuisine maison | MAMI COOK`} description={c.bio ?? undefined} path={`/cuisine/${c.slug}`} />
      <div className="h-40 gradient-primary md:h-56" style={c.cover_url ? { background: `url(${photoUrl(c.cover_url)}) center/cover` } : undefined} />
      <div className="container -mt-16 max-w-6xl">
        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-card gradient-primary text-4xl font-extrabold text-white shadow-xl">
                {c.profiles?.avatar_url ? <img src={photoUrl(c.profiles.avatar_url)} alt="" className="h-full w-full object-cover" /> : c.kitchen_name.replace(/^Chez /, "").slice(0, 1)}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold md:text-3xl">{c.kitchen_name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Stars value={c.rating_avg} /> <span className="font-semibold text-foreground">{Number(c.rating_avg).toFixed(1)}</span> ({c.rating_count}{" "}{t("avis)")}
                  <span>·</span> {c.orders_completed} commandes
                  {c.city && <><span>·</span><MapPin className="h-3.5 w-3.5" />{c.city}</>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {user && <Button variant={isFav ? "primary" : "outline"} onClick={() => fav.mutate()} loading={fav.isPending}><Heart className={isFav ? "fill-current" : ""} />{isFav ? t("Favori") : t("Suivre")}</Button>}
              <Button variant="ghost" size="icon" onClick={() => setReportOpen(true)} aria-label={t("Signaler cette cuisine")}><Flag /></Button>
            </div>
          </div>
          {c.bio && <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{c.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {c.cuisines.map((x) => <Badge key={x}>{cuisineLabel(x)}</Badge>)}
            {c.offers_pickup && <Badge tone="primary"><Store className="h-3 w-3" />{" "}{t("Retrait")}</Badge>}
            {c.offers_delivery && <Badge tone="primary"><Bike className="h-3 w-3" />{" "}{t("Livraison (")}{c.delivery_radius_km}{" "}{t("km ·")}{" "}{c.delivery_fee_cents ? formatEuros(c.delivery_fee_cents) : "offerte"})</Badge>}
            <Badge tone="success">{t("✓ Cuisine vérifiée")}</Badge>
          </div>
        </Card>

        <section className="py-10">
          <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6" />{" "}{t("Au menu cette semaine")}</h2>
          {dishes.isLoading ? <Spinner /> : byDay.size === 0 ? (
            <EmptyState icon="📅" title={t("Aucun plat programmé")}>{t("Suivez cette cuisine pour être prévenu de ses prochaines ventes.")}</EmptyState>
          ) : [...byDay.entries()].map(([day, items]) => (
            <div key={day} className="mb-8">
              <h3 className="mb-3 font-bold capitalize">{relativeDay(day)}</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((it, i) => <DishCard key={it.drop_id} item={it} index={i} />)}</div>
            </div>
          ))}
        </section>

        <section className="pb-16">
          <h2 className="mb-5 text-2xl font-bold">{t("Avis (")}{c.rating_count})</h2>
          {(reviews.data ?? []).length === 0 ? <p className="text-muted-foreground">{t("Pas encore d'avis.")}</p> : (
            <div className="grid gap-4 md:grid-cols-2">
              {reviews.data!.map((r) => (
                <Card key={r.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{r.profiles?.display_name ?? t("Client")}</p>
                    <span className="text-xs text-muted-foreground">{formatDate(r.created_at, { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  <Stars value={r.rating} className="mt-1" />
                  {r.comment && <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>}
                  {r.cook_reply && <div className="mt-3 rounded-xl bg-muted p-3 text-sm"><p className="mb-1 text-xs font-bold">{t("Réponse de")}{" "}{c.kitchen_name}</p>{r.cook_reply}</div>}
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="cook" targetId={c.id} />
    </div>
  );
}
