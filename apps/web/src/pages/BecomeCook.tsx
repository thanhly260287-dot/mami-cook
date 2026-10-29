import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChefHat, ClipboardCheck, Euro, ShieldCheck, Store } from "lucide-react";
import { CUISINES, cookApplicationSchema, formatEuros, t } from "@mami/shared";
import { requireSupabase, DEMO_MODE } from "@/lib/supabase";
import { createAddress } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn, errorMessage, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Card, Switch } from "@/components/ui/misc";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import { Seo } from "@/components/Seo";

const LEGAL = [
  { id: "hygiene", label: t("Je respecte les règles d'hygiène alimentaire (chaîne du froid, propreté, traçabilité) et je m'engage à suivre une formation hygiène (HACCP) si je vends régulièrement.") },
  { id: "ddpp", label: t("Je déclarerai mon activité de préparation de denrées alimentaires auprès de la DDPP de mon département (Cerfa n°13984) si mon activité devient régulière.") },
  { id: "status", label: t("Je dispose ou je créerai un statut adapté (ex. micro-entreprise) et déclarerai mes revenus.") },
  { id: "allergens", label: t("J'indiquerai honnêtement les 14 allergènes réglementaires de chaque plat.") },
];

export default function BecomeCook() {
  const { user, cook, refreshCook } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [kitchenName, setKitchenName] = useState("");
  const [bio, setBio] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [address, setAddress] = useState<AddressSuggestion | null>(null);
  const [offersPickup, setOffersPickup] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [radius, setRadius] = useState(3);
  const [fee, setFee] = useState(250);
  const [siret, setSiret] = useState("");
  const [legal, setLegal] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (cook) {
    return (
      <div className="container max-w-xl py-16 text-center">
        <ChefHat className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold">{t("Vous avez déjà une cuisine")}</h1>
        <Button asChild className="mt-6"><Link to="/cuisine/tableau-de-bord">{t("Aller à mon tableau de bord")}</Link></Button>
      </div>
    );
  }

  const submit = async () => {
    if (DEMO_MODE) return toast.info(t("Disponible une fois Supabase configuré"));
    if (!user) return navigate("/inscription?redirect=/devenir-cuisinier");
    const parsed = cookApplicationSchema.safeParse({
      kitchenName, bio, cuisines, offersPickup, offersDelivery, deliveryRadiusKm: radius, deliveryFeeCents: fee,
      hygieneTrainingDeclared: legal.length === LEGAL.length, siret,
      address: address ? { label: t("Cuisine"), line1: address.line1, postalCode: address.postal_code, city: address.city, country: "FR", lat: address.lat, lng: address.lng } : undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    try {
      const sb = requireSupabase();
      const slug = `${slugify(kitchenName.replace(/^chez /i, ""))}-${Math.random().toString(36).slice(2, 6)}`;
      const r1 = await sb.from("cooks").insert({
        id: user.id, slug, kitchen_name: kitchenName.trim(), bio: bio.trim() || null, cuisines, city: address!.city,
        offers_pickup: offersPickup, offers_delivery: offersDelivery, delivery_radius_km: radius, delivery_fee_cents: fee,
        hygiene_declared_at: new Date().toISOString(),
      });
      if (r1.error) throw r1.error;
      const addr = await createAddress(user.id, { label: t("Ma cuisine"), line1: address!.line1, postal_code: address!.postal_code, city: address!.city, lat: address!.lat, lng: address!.lng });
      const r2 = await sb.from("cook_private").insert({ cook_id: user.id, address_id: addr.id, exact_location: `SRID=4326;POINT(${address!.lng} ${address!.lat})`, siret: siret || null });
      if (r2.error) throw r2.error;
      const r3 = await sb.from("cooks").update({ status: "pending_review" }).eq("id", user.id);
      if (r3.error) throw r3.error;
      refreshCook();
      toast.success(t("Candidature envoyée ! Nous la validons sous 48 h."));
      navigate("/cuisine/tableau-de-bord");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const steps = [t("Ma cuisine"), t("Adresse & remise"), t("Engagements")];
  const canNext = [kitchenName.trim().length >= 2 && cuisines.length > 0, !!address && (offersPickup || offersDelivery), legal.length === LEGAL.length];

  return (
    <div className="container max-w-3xl py-10">
      <Seo title={t("Devenir Mami Cook — vendez vos plats faits maison")} description={t("Ouvrez votre mini-restaurant depuis votre cuisine. Vous fixez vos prix, vos jours, vos quantités.")} path="/devenir-cuisinier" />
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold md:text-4xl">{t("Ouvrez votre cuisine")}{" "}<span className="text-gradient">{t("en 5 minutes")}</span></h1>
        <p className="mt-2 text-muted-foreground">{t("Vous fixez vos prix. Le client paie 20 % de frais de service en plus : vous touchez votre prix (les remises volume sont partagées avec la plateforme).")}</p>
        <div className="mt-6 grid gap-3 text-left text-sm sm:grid-cols-3">
          {[{ i: Euro, t: t("Votre prix, sans commission"), d: t("Versé 24 h après chaque commande") }, { i: Store, t: t("Retrait ou livraison"), d: t("Vous choisissez votre rayon") }, { i: ShieldCheck, t: t("Paiement garanti"), d: t("Les clients paient d'avance") }].map(({ i: I, t, d }) => (
            <Card key={t} className="p-4"><I className="mb-2 h-5 w-5 text-primary" /><p className="font-bold">{t}</p><p className="text-muted-foreground">{d}</p></Card>
          ))}
        </div>
      </div>

      <ol className="mb-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", i <= step ? "gradient-primary text-white" : "bg-muted text-muted-foreground")}>{i < step ? <Check className="h-4 w-4" /> : i + 1}</span>
            <span className={cn("hidden text-sm font-semibold sm:inline", i > step && "text-muted-foreground")}>{s}</span>
            {i < steps.length - 1 && <span className="h-0.5 flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <Card className="p-6">
        {step === 0 && (
          <div className="space-y-5">
            <Field label={t("Nom de votre cuisine")} htmlFor="kn" hint={t("Ex : Chez Mami Nono")}><Input id="kn" value={kitchenName} onChange={(e) => setKitchenName(e.target.value)} maxLength={60} /></Field>
            <Field label={t("Présentez-vous")} htmlFor="bio" hint={t("Votre histoire, vos spécialités, d'où viennent vos recettes…")}><Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} /></Field>
            <div>
              <p className="mb-2 text-sm font-semibold">{t("Vos cuisines (5 max.)")}</p>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map((c) => {
                  const on = cuisines.includes(c.id);
                  return <button key={c.id} type="button" onClick={() => setCuisines(on ? cuisines.filter((x) => x !== c.id) : cuisines.length < 5 ? [...cuisines, c.id] : cuisines)}
                    className={cn("rounded-xl border px-3 py-2 text-sm", on ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border hover:bg-muted")}>{c.emoji} {t(c.label)}</button>;
                })}
              </div>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <Field label={t("Adresse de votre cuisine")} hint={t("Jamais affichée publiquement : les clients voient une position approximative. L'adresse exacte n'est donnée qu'aux clients dont vous acceptez la commande.")}>
              <AddressAutocomplete onSelect={setAddress} />
            </Field>
            {address && <p className="text-sm text-status-hot">✓ {address.label}</p>}
            <label className="flex items-center justify-between rounded-xl border border-border p-4"><span><b>{t("Retrait sur place")}</b><br /><span className="text-sm text-muted-foreground">{t("Les clients viennent chercher leur plat")}</span></span><Switch checked={offersPickup} onCheckedChange={setOffersPickup} /></label>
            <label className="flex items-center justify-between rounded-xl border border-border p-4"><span><b>{t("Livraison")}</b><br /><span className="text-sm text-muted-foreground">{t("Vous livrez dans votre quartier")}</span></span><Switch checked={offersDelivery} onCheckedChange={setOffersDelivery} /></label>
            {offersDelivery && (
              <div className="grid grid-cols-2 gap-4">
                <Field label={`Rayon : ${radius} km`}><input type="range" min={1} max={15} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" /></Field>
                <Field label={`Frais de livraison : ${formatEuros(fee)}`}><input type="range" min={0} max={800} step={50} value={fee} onChange={(e) => setFee(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" /></Field>
              </div>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <p className="flex items-center gap-2 font-bold"><ClipboardCheck className="h-5 w-5 text-primary" />{" "}{t("Vendre des plats faits maison en France")}</p>
            {LEGAL.map((l) => (
              <label key={l.id} className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" checked={legal.includes(l.id)} onChange={(e) => setLegal(e.target.checked ? [...legal, l.id] : legal.filter((x) => x !== l.id))} />
                {t(l.label)}
              </label>
            ))}
            <Field label={t("Numéro SIRET (facultatif pour l'instant)")} htmlFor="siret" hint={t("Obligatoire au-delà d'une activité occasionnelle")}><Input id="siret" value={siret} onChange={(e) => setSiret(e.target.value.replace(/\D/g, "").slice(0, 14))} inputMode="numeric" /></Field>
            <p className="text-xs text-muted-foreground">{t("Après validation, vous connecterez votre compte bancaire via Stripe (vérification d'identité sécurisée) pour recevoir vos paiements.")}{" "}<Link to="/aide/hygiene" className="text-primary">{t("En savoir plus sur les règles")}</Link></p>
          </div>
        )}
        <div className="mt-8 flex justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>{t("Retour")}</Button>
          {step < 2 ? <Button disabled={!canNext[step]} onClick={() => setStep(step + 1)}>{t("Continuer")}</Button>
            : <Button disabled={!canNext[2]} loading={loading} onClick={submit}>{user ? t("Envoyer ma candidature") : t("Créer mon compte pour continuer")}</Button>}
        </div>
      </Card>
    </div>
  );
}
