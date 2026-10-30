import { formatMoney, t } from "@mami/shared";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Camera, ChefHat, CreditCard, Leaf, ShieldCheck, ShoppingBag, Star, TrendingUp, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp, Reveal, Stagger, staggerItem } from "@/components/motion";

export function HeroSection({ openCount }: { openCount?: number }) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    // Pas de défilement automatique si l'utilisateur a demandé à réduire les animations.
    if (paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setSlide((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => window.clearInterval(id);
  }, [paused]);
  return (
    // Grande photo lumineuse en fond (Wikimedia Commons, crédit dans les mentions légales), texte posé dessus.
    <section className="relative isolate overflow-hidden bg-card" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <HeroCarousel index={slide} />
      {/* Fondu vers le fond de page : par le bas sur téléphone, par la gauche de la photo sur ordinateur (le texte déborde dessus) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[384px] bg-gradient-to-b from-card/0 from-40% via-card/80 via-70% to-card to-90% sm:h-[464px] md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[64%] md:bg-gradient-to-r md:from-card md:from-0% md:via-card/40 md:via-25% md:to-card/0 md:to-50%" />
      <div className="container relative flex pb-10 pt-[270px] sm:pt-[350px] md:min-h-[620px] md:items-center md:py-20">
        <Stagger onMount className="max-w-xl">
          <motion.div variants={staggerItem} className="mb-5 inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-status-hot" />
            {openCount ? t(openCount > 1 ? "{n} plats disponibles près de chez vous" : "{n} plat disponible près de chez vous", { n: openCount }) : t("Des cuisines ouvertes près de chez vous")}
          </motion.div>
          <motion.h1 variants={staggerItem} className="mb-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {t("Manger comme")}{" "}<span className="text-gradient">{t("à la maison")}</span>{t(", partout.")}
          </motion.h1>
          <motion.p variants={staggerItem} className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
            {t("Des plats faits maison par nos mamans, nos tantes, nos voisins. Lasagnes, rouleaux de printemps, paella… livrés chez vous ou à retirer aujourd'hui.")}
          </motion.p>
          <motion.div variants={staggerItem} className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-lg"><Link to="/explorer">{t("Trouver une cuisine")}</Link></Button>
            <Button asChild size="lg" variant="secondary" className="shadow-sm"><Link to="/devenir-cuisinier">{t("Devenir Mami Cook")}</Link></Button>
          </motion.div>
          <motion.div variants={staggerItem} className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <Stat icon={<BadgeCheck className="h-5 w-5 text-primary" />} title={t("Cuisiniers vérifiés")} />
            <div className="hidden h-8 w-px bg-border sm:block" />
            <Stat icon={<ShieldCheck className="h-5 w-5 text-status-hot" />} title={t("Paiement sécurisé")} />
            <div className="hidden h-8 w-px bg-border sm:block" />
            <Stat icon={<Star className="h-5 w-5 fill-accent text-accent" />} title={t("Avis vérifiés")} />
          </motion.div>
        </Stagger>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{ opacity: { duration: 0.6, delay: 0.8 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 } }}
          className="absolute bottom-10 right-8 hidden rounded-2xl bg-card/95 p-4 shadow-2xl ring-1 ring-border backdrop-blur lg:block">
          <p className="text-xs text-muted-foreground">{t("Dernière commande")}</p>
          <p className="mt-0.5 text-sm font-bold">{t("Chez Mami Nono")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("Lasagnes maison · 15,00 €")}</p>
        </motion.div>
      </div>
      {/* Points du carrousel (au premier plan pour rester cliquables) */}
      <div className="absolute right-4 top-4 z-20 flex gap-2 md:bottom-6 md:right-[32%] md:top-auto md:translate-x-1/2">
        {HERO_SLIDES.map((p, i) => (
          <button key={p.file} onClick={() => setSlide(i)} aria-label={t("Photo {n}", { n: i + 1 })} aria-current={i === slide}
            className={`h-2.5 rounded-full shadow ring-1 ring-black/10 transition-all ${i === slide ? "w-7 bg-white" : "w-2.5 bg-white/60 hover:bg-white/90"}`} />
        ))}
      </div>
    </section>
  );
}

// Photos du carrousel (Wikimedia Commons, crédits dans les mentions légales).
// Cadrage propre à chaque photo ; la dernière est affichée en miroir pour que la cuisinière soit à droite, loin du texte.
const HERO_SLIDES = [
  { file: "hero.jpg", className: "object-[42%_30%] md:object-[40%_35%]" },
  { file: "hero-1.jpg", className: "object-[80%_30%] md:object-[70%_35%]" },
  { file: "hero-2.jpg", className: "object-[45%_20%] md:object-[45%_30%]" },
  { file: "hero-3.jpg", className: "-scale-x-100 object-[25%_25%] md:object-[30%_30%]" },
];

function HeroCarousel({ index }: { index: number }) {
  return (
    <div className="absolute inset-x-0 top-0 -z-10 h-[380px] overflow-hidden sm:h-[460px] md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[64%]">
      {HERO_SLIDES.map((slide, i) => (
        <div key={slide.file} className={`absolute inset-0 transition-[opacity,transform] ease-out motion-reduce:transition-none ${i === index ? "scale-110 opacity-100 duration-[7000ms]" : "scale-100 opacity-0 duration-1000"}`}>
          <img src={`${import.meta.env.BASE_URL}images/${slide.file}`}
            alt={i === index ? t("Une maman souriante qui cuisine dans sa cuisine") : ""} aria-hidden={i !== index}
            fetchPriority={i === 0 ? "high" : "low"} loading={i === 0 ? "eager" : "lazy"} decoding="async"
            className={`h-full w-full object-cover ${slide.className}`} />
        </div>
      ))}
    </div>
  );
}

function Stat({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-2 font-semibold">{icon}<span className="leading-tight">{title}</span></div>;
}

const steps = [
  { icon: ChefHat, title: t("Cuisinez"), desc: t("Préparez vos meilleurs plats chez vous. Vous fixez vos prix, vos quantités et vos jours.") },
  { icon: Camera, title: t("Photographiez"), desc: t("Une photo, une description, les allergènes : votre annonce est en ligne en 2 minutes.") },
  { icon: Truck, title: t("Remettez"), desc: t("Les clients viennent chercher leur plat, ou vous livrez dans votre quartier.") },
  { icon: Star, title: t("Récoltez"), desc: t("Paiement versé automatiquement sur votre compte, avis et réputation de Mami Cook.") },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-card py-16">
      <div className="container">
        <Reveal className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold">{t("Vous cuisinez, on s'occupe du reste.")}</h2>
          <p className="mx-auto max-w-lg text-muted-foreground">{t("Lancez votre mini-restaurant depuis votre cuisine en 4 étapes simples.")}</p>
        </Reveal>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.12, duration: 0.5 }} className="group p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-primary transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-6 group-hover:scale-110">
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
    { icon: BadgeCheck, title: t("Chaque cuisine est vérifiée"), desc: t("Identité, engagement d'hygiène et adresse contrôlés avant la première vente.") },
    { icon: Leaf, title: t("Allergènes obligatoires"), desc: t("Les 14 allergènes réglementaires sont affichés sur chaque plat.") },
    { icon: CreditCard, title: t("Paiement protégé"), desc: t("Vous payez via Stripe. La cuisinière est payée seulement une fois la commande remise.") },
    { icon: ShieldCheck, title: t("Remboursement garanti"), desc: t("Commande annulée ou non conforme ? Remboursement sur votre carte.") },
  ];
  return (
    <section className="py-16">
      <div className="container">
        <Reveal><h2 className="mb-10 text-center text-3xl font-bold">{t("Le fait-maison, en toute confiance")}</h2></Reveal>
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <motion.div variants={staggerItem} whileHover={{ y: -6 }} key={it.title} className="rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-xl">
              <it.icon className="mb-3 h-7 w-7 text-primary" />
              <h3 className="mb-1.5 font-bold">{it.title}</h3>
              <p className="text-sm text-muted-foreground">{it.desc}</p>
            </motion.div>
          ))}
        </Stagger>
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
            <h2 className="mb-4 text-3xl font-bold">{t("Votre tableau de bord, votre business.")}</h2>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              {t("Suivez vos ventes en temps réel, gérez vos « drops » de plats, et profitez des remises automatiques à partir de 5 ou 10 plats commandés. Vous décidez de tout.")}
            </p>
            <ul className="space-y-3 text-sm text-secondary-foreground">
              {[t("Choisissez vos tarifs librement"), t("Remise automatique −10 % dès 5 plats, −15 % dès 10"), t("Planifiez vos jours de vente (1 fois/semaine ou tous les jours)"), t("Republiez vos annonces précédentes en un clic"), t("Versement automatique 24 h après chaque commande")].map((line) => (
                <li key={line} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full gradient-primary" />{line}</li>
              ))}
            </ul>
            <Button asChild className="mt-8" size="lg"><Link to="/devenir-cuisinier">{t("Ouvrir ma cuisine")}</Link></Button>
          </div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="rounded-3xl bg-[hsl(215_25%_15%)] p-6 text-white shadow-xl">
              <p className="text-sm text-white/60">{t("Total des ventes · 30 jours")}</p>
              <p className="mt-1 text-4xl font-bold tabular-nums"><CountUp to={184750} format={(n) => formatMoney(Math.round(n), "EUR")} /></p>
              <div className="mt-4 flex gap-2"><motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: "easeOut" }} className="h-1 flex-1 origin-left rounded-full bg-primary" /><div className="h-1 w-16 rounded-full bg-white/20" /></div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[{ i: ShoppingBag, v: <CountUp to={156} />, l: t("commandes") }, { i: Users, v: <CountUp to={89} />, l: t("clients") }, { i: TrendingUp, v: <>+<CountUp to={24} /> %</>, l: t("ce mois") }].map(({ i: I, v, l }) => (
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
