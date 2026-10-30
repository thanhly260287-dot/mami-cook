import { t } from "@mami/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/api";
import { useGeo } from "@/hooks/useGeo";
import { CuisineFilter } from "@/components/CuisineFilter";
import { DishCard, DishCardSkeleton } from "@/components/DishCard";
import { HeroSection, HowItWorks, SellerDashboardPreview, TrustSection } from "@/components/home";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { Reveal } from "@/components/motion";

export default function Home() {
  const geo = useGeo();
  const [cuisine, setCuisine] = useState("");
  const feed = useQuery({
    queryKey: ["feed", geo.lat, geo.lng, cuisine],
    queryFn: () => fetchFeed({ lat: geo.lat, lng: geo.lng, radiusKm: 10, cuisine: cuisine || null, limit: 24 }),
    staleTime: 30_000,
  });

  return (
    <>
      <Seo title={t("MAMI COOK — Manger comme à la maison, partout")} path="/" />
      <HeroSection openCount={feed.data?.length} />
      <section className="py-6"><div className="container"><CuisineFilter value={cuisine} onChange={setCuisine} /></div></section>
      <section className="pb-16">
        <div className="container">
          <Reveal className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t("Disponible aujourd'hui")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("Des plats de nos mamans, nos tantes… pour tous ! 🏠 · autour de")}{" "}{geo.label}</p>
            </div>
            <Link to={`/explorer${cuisine ? `?cuisine=${cuisine}` : ""}`} className="shrink-0 text-sm font-semibold text-primary hover:underline">{t("Voir tout →")}</Link>
          </Reveal>
          {feed.isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <DishCardSkeleton key={i} />)}</div>
          ) : feed.isError ? (
            <EmptyState icon="😕" title={t("Impossible de charger les plats")} action={<Button onClick={() => feed.refetch()}>{t("Réessayer")}</Button>}>{t("Vérifiez votre connexion internet.")}</EmptyState>
          ) : feed.data!.length === 0 ? (
            <EmptyState icon="🍳" title={t("Pas encore de plat près de chez vous")} action={<Button asChild><Link to="/devenir-cuisinier">{t("Devenir la première Mami Cook du quartier")}</Link></Button>}>
              {t("Essayez une autre adresse ou une autre cuisine.")}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {feed.data!.map((it, i) => <DishCard key={it.drop_id} item={it} index={i} />)}
            </div>
          )}
        </div>
      </section>
      <HowItWorks />
      <TrustSection />
      <SellerDashboardPreview />
    </>
  );
}
