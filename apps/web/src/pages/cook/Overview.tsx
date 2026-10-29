import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, Euro, Package, TrendingUp, Users, Wallet } from "lucide-react";
import { formatEuros } from "@mami/shared";
import { fetchCookDashboard } from "@/lib/api";
import { Card, Spinner } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export default function Overview() {
  const q = useQuery({ queryKey: ["cook-dashboard"], queryFn: () => fetchCookDashboard(30) });
  if (q.isLoading) return <Spinner />;
  const d = q.data!;
  const growth = d.previous_revenue_cents ? Math.round(((d.revenue_cents - d.previous_revenue_cents) / d.previous_revenue_cents) * 100) : null;
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
    const found = d.daily.find((x) => x.day === day);
    return { day: day.slice(8, 10) + "/" + day.slice(5, 7), euros: (found?.revenue_cents ?? 0) / 100 };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Euro />} label="Revenus · 30 j" value={formatEuros(d.revenue_cents)} sub={growth != null ? `${growth >= 0 ? "+" : ""}${growth} % vs mois précédent` : undefined} />
        <Kpi icon={<Package />} label="Commandes" value={String(d.orders_count)} />
        <Kpi icon={<Users />} label="Clients" value={String(d.customers_count)} />
        <Kpi icon={<Wallet />} label="Versement à venir" value={formatEuros(d.pending_payout_cents)} />
      </div>
      {(d.pending_count > 0 || d.active_count > 0) && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary/5 p-5">
          <p className="flex items-center gap-2 font-semibold"><Clock className="h-5 w-5 text-primary" />{d.pending_count} commande(s) à accepter · {d.active_count} en cours</p>
          <Button asChild><Link to="commandes">Gérer les commandes</Link></Button>
        </Card>
      )}
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold"><TrendingUp className="h-5 w-5" /> Revenus des 30 derniers jours</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} unit=" €" />
              <Tooltip formatter={(v: number) => [`${v.toFixed(2)} €`, "Revenus"]} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="euros" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Shortcut to="plats" title="Ajouter un plat" desc="Photo, prix, allergènes" />
        <Shortcut to="ventes" title="Programmer une vente" desc="Choisissez le jour et les quantités" />
        <Shortcut to="avis" title="Répondre aux avis" desc="Fidélisez vos clients" />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function Shortcut({ to, title, desc }: { to: string; title: string; desc: string }) {
  return <Link to={to}><Card className="p-5 transition-colors hover:bg-muted/50"><p className="font-bold">{title} →</p><p className="text-sm text-muted-foreground">{desc}</p></Card></Link>;
}
