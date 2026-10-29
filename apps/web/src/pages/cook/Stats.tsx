// Statistiques détaillées de la cuisinière : ventes, plats phares, clients fidèles, horaires, notes.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, intlLocale, t } from "@mami/shared";
import { fetchCookStats } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, EmptyState, Spinner, Stars } from "@/components/ui/misc";

export default function CookStatsPage() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["cook-stats", days], queryFn: () => fetchCookStats(days) });
  if (q.isLoading) return <Spinner />;
  const s = q.data;
  if (!s) return <EmptyState icon="📊" title={t("Pas encore de statistiques")} />;
  const cur = s.currency ?? "EUR";
  const weekday = (n: number) => new Date(2024, 0, n).toLocaleDateString(intlLocale(), { weekday: "short" }); // 1er janv. 2024 = lundi
  const byDay = Array.from({ length: 7 }, (_, i) => ({ d: weekday(i + 1), n: s.by_weekday.find((x) => x.dow === i + 1)?.orders ?? 0 }));
  const byHour = Array.from({ length: 15 }, (_, i) => ({ h: `${i + 8}h`, n: s.by_hour.find((x) => x.hour === i + 8)?.orders ?? 0 }));
  const sellThrough = s.stock.offered ? Math.round((s.stock.sold / s.stock.offered) * 100) : 0;
  const loyalty = s.customers ? Math.round((s.repeat_customers / s.customers) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">{[7, 30, 90, 365].map((n) => (
        <button key={n} onClick={() => setDays(n)} className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold", days === n ? "gradient-primary text-white" : "bg-muted")}>{t("{n} j", { n })}</button>
      ))}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("Chiffre d'affaires")} value={formatMoney(s.revenue_cents, cur)} />
        <Kpi label={t("Panier moyen")} value={formatMoney(s.avg_basket_cents, cur)} />
        <Kpi label={t("Plats vendus")} value={String(s.plates_sold)} />
        <Kpi label={t("Commandes terminées")} value={`${s.completed} / ${s.orders}`} />
        <Kpi label={t("Clients")} value={String(s.customers)} />
        <Kpi label={t("Clients fidèles")} value={`${loyalty} %`} hint={t("ont commandé plusieurs fois")} />
        <Kpi label={t("Stock écoulé")} value={`${sellThrough} %`} hint={t("{sold} vendus sur {offered}", { sold: s.stock.sold, offered: s.stock.offered })} />
        <Kpi label={t("Abonnés")} value={String(s.favorites)} hint={t("vous ont mis en favori")} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-bold">{t("Vos plats stars")}</h2>
          {s.top_dishes.length === 0 ? <p className="text-sm text-muted-foreground">{t("Aucune vente sur la période.")}</p> : (
            <ol className="space-y-3">{s.top_dishes.map((d, i) => (
              <li key={d.dish_id} className="flex items-center justify-between gap-3 text-sm">
                <span><b className="mr-2 text-primary">#{i + 1}</b>{d.title}</span>
                <span className="text-muted-foreground">{t("{n} vendus", { n: d.qty })} · <b className="text-foreground">{formatMoney(d.sales_cents, cur)}</b></span>
              </li>
            ))}</ol>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-bold">{t("Votre note")}</h2>
          <div className="flex items-center gap-3"><span className="text-4xl font-extrabold">{Number(s.ratings.avg).toFixed(1)}</span><Stars value={s.ratings.avg} size={20} /><span className="text-sm text-muted-foreground">({s.ratings.count})</span></div>
          <div className="mt-3 space-y-1">{[5, 4, 3, 2, 1].map((r) => {
            const n = s.ratings.distribution[String(r)] ?? 0;
            return <div key={r} className="flex items-center gap-2 text-xs"><span className="w-3">{r}</span><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-accent" style={{ width: `${s.ratings.count ? (n / s.ratings.count) * 100 : 0}%` }} /></div><span className="w-6 text-right">{n}</span></div>;
          })}</div>
        </Card>
        <Chart title={t("Commandes par jour de la semaine")} data={byDay} x="d" />
        <Chart title={t("Heures de commande")} data={byHour} x="h" />
      </div>
      <Card className="p-5 text-sm">
        <h2 className="mb-1 font-bold">💡 {t("Conseils")}</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {sellThrough < 60 && s.stock.offered > 0 && <li>{t("Vous vendez moins de 60 % de vos portions : proposez des quantités plus petites ou une remise en fin de journée.")}</li>}
          {sellThrough >= 95 && <li>{t("Tout part ! Augmentez les quantités ou ajoutez un plat.")}</li>}
          {loyalty < 20 && s.customers > 5 && <li>{t("Répondez aux avis et ajoutez un dessert : les clients reviennent plus souvent.")}</li>}
          <li>{t("Les plats avec de belles photos se vendent mieux : essayez la retouche photo IA dans « Mes plats ».")}</li>
        </ul>
      </Card>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <Card className="p-4"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-xl font-extrabold tabular-nums">{value}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</Card>;
}

function Chart({ title, data, x }: { title: string; data: { n: number }[]; x: string }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 font-bold">{title}</h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey={x} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
            <Tooltip formatter={(v: number) => [v, t("Commandes")]} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar dataKey="n" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
