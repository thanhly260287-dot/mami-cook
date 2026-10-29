import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, Camera, ChefHat, CreditCard, Leaf, ShieldCheck, ShoppingBag, Star, TrendingUp, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection({ openCount }: { openCount?: number }) {
  return (
    <section className="relative overflow-hidden bg-card">
      <div className="container py-10 md:py-20">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-status-hot" />
              {openCount ? `${openCount} plat${openCount > 1 ? "s" : ""} disponible${openCount > 1 ? "s" : ""} près de chez vous` : "Des cuisines ouvertes près de chez vous"}
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              Manger comme <span className="text-gradient">à la maison</span>, partout.
            </h1>
            <p className="mb-8 max-w-lg text-lg text-muted-foreground">
              Des plats faits maison par nos mamans, nos tantes, nos voisins. Lasagnes, rouleaux de printemps, paella… livrés chez vous ou à retirer aujourd'hui.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/explorer">Trouver une cuisine</Link></Button>
              <Button asChild size="lg" variant="secondary"><Link to="/devenir-cuisinier">Devenir Mami Cook</Link></Button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm">
              <Stat icon={<BadgeCheck className="h-5 w-5 text-primary" />} title="Cuisiniers vérifiés" />
              <div className="h-10 w-px bg-border" />
              <Stat icon={<ShieldCheck className="h-5 w-5 text-status-hot" />} title="Paiement sécurisé" />
              <div className="h-10 w-px bg-border" />
              <Stat icon={<Star className="h-5 w-5 fill-accent text-accent" />} title="Avis vérifiés" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }} className="relative hidden md:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
              <img src={`${import.meta.env.BASE_URL}images/hero.svg`} alt="Une marmite qui mijote dans une cuisine familiale" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-2xl border border-border bg-card p-4 shadow-xl">
              <p className="text-xs text-muted-foreground">Dernière commande</p>
              <p className="mt-0.5 text-sm font-bold">Chez Mami Nono</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Lasagnes maison · 15,00 €</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-2 font-semibold">{icon}<span className="leading-tight">{title}</span></div>;
}

const steps = [
  { icon: ChefHat, title: "Cuisinez", desc: "Préparez vos meilleurs plats chez vous. Vous fixez vos prix, vos quantités et vos jours." },
  { icon: Camera, title: "Photographiez", desc: "Une photo, une description, les allergènes : votre annonce est en ligne en 2 minutes." },
  { icon: Truck, title: "Remettez", desc: "Les clients viennent chercher leur plat, ou vous livrez dans votre quartier." },
  { icon: Star, title: "Récoltez", desc: "Paiement versé automatiquement sur votre compte, avis et réputation de Mami Cook." },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-card py-16">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold">Vous cuisinez, on s'occupe du reste.</h2>
          <p className="mx-auto max-w-lg text-muted-foreground">Lancez votre mini-restaurant depuis votre cuisine en 4 étapes simples.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.4 }} className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-primary">
                <s.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustSection() {
  const items = [
    { icon: BadgeCheck, title: "Chaque cuisine est vérifiée", desc: "Identité, engagement d'hygiène et adresse contrôlés avant la première vente." },
    { icon: Leaf, title: "Allergènes obligatoires", desc: "Les 14 allergènes réglementaires sont affichés sur chaque plat." },
    { icon: CreditCard, title: "Paiement protégé", desc: "Vous payez via Stripe. La cuisinière est payée seulement une fois la commande remise." },
    { icon: ShieldCheck, title: "Remboursement garanti", desc: "Commande annulée ou non conforme ? Remboursement sur votre carte." },
  ];
  return (
    <section className="py-16">
      <div className="container">
        <h2 className="mb-10 text-center text-3xl font-bold">Le fait-maison, en toute confiance</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <it.icon className="mb-3 h-7 w-7 text-primary" />
              <h3 className="mb-1.5 font-bold">{it.title}</h3>
              <p className="text-sm text-muted-foreground">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SellerDashboardPreview() {
  return (
    <section className="border-t border-border bg-card py-16">
      <div className="container">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold">Votre tableau de bord, votre business.</h2>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              Suivez vos ventes en temps réel, gérez vos « drops » de plats, et profitez des remises automatiques à partir de 5 ou 10 plats commandés. Vous décidez de tout.
            </p>
            <ul className="space-y-3 text-sm text-secondary-foreground">
              {["Choisissez vos tarifs librement", "Remise automatique −10 % dès 5 plats, −15 % dès 10", "Planifiez vos jours de vente (1 fois/semaine ou tous les jours)", "Republiez vos annonces précédentes en un clic", "Versement automatique 24 h après chaque commande"].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full gradient-primary" />{t}</li>
              ))}
            </ul>
            <Button asChild className="mt-8" size="lg"><Link to="/devenir-cuisinier">Ouvrir ma cuisine</Link></Button>
          </div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="rounded-3xl bg-[hsl(215_25%_15%)] p-6 text-white shadow-xl">
              <p className="text-sm text-white/60">Total des ventes · 30 jours</p>
              <p className="mt-1 text-4xl font-bold tabular-nums">1 847,50 €</p>
              <div className="mt-4 flex gap-2"><div className="h-1 flex-1 rounded-full bg-primary" /><div className="h-1 w-16 rounded-full bg-white/20" /></div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[{ i: ShoppingBag, v: "156", l: "commandes" }, { i: Users, v: "89", l: "clients" }, { i: TrendingUp, v: "+24 %", l: "ce mois" }].map(({ i: I, v, l }) => (
                  <div key={l} className="rounded-2xl bg-white/10 p-3 text-center">
                    <I className="mx-auto mb-1 h-5 w-5 text-primary" />
                    <p className="text-xl font-bold tabular-nums">{v}</p>
                    <p className="text-xs text-white/60">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
