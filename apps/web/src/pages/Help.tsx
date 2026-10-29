import { useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Mail } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Card } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const FAQ = [
  { q: "Comment fonctionne MAMI COOK ?", a: "Des cuisinières et cuisiniers de votre quartier publient les plats qu'ils préparent chaque jour, en quantité limitée. Vous commandez et payez en ligne, puis vous récupérez votre plat chez eux ou vous vous faites livrer." },
  { q: "Les cuisiniers sont-ils vérifiés ?", a: "Oui. Chaque cuisine est validée par notre équipe avant sa première vente, s'engage à respecter les règles d'hygiène et passe une vérification d'identité via Stripe pour recevoir ses paiements. Les avis ne peuvent être laissés que par des clients ayant réellement commandé." },
  { q: "Comment sont affichés les allergènes ?", a: "Les 14 allergènes réglementaires sont obligatoires sur chaque plat. Les plats étant préparés dans des cuisines familiales, des traces d'autres allergènes sont possibles : en cas d'allergie sévère, contactez la cuisinière via la messagerie avant de commander." },
  { q: "Puis-je annuler ma commande ?", a: "Oui, gratuitement, tant que la cuisinière ne l'a pas acceptée. Vous êtes alors remboursé intégralement sous 5 à 10 jours sur votre moyen de paiement." },
  { q: "Où récupérer ma commande ?", a: "L'adresse exacte s'affiche sur votre commande dès que la cuisinière l'accepte. Donnez-lui votre code à 4 chiffres lors du retrait." },
  { q: "Combien coûte le service ?", a: "Les prix affichés incluent nos frais de service. Dès 5 plats dans votre commande, vous profitez automatiquement de −10 % (−15 % dès 10 plats)." },
  { q: "Je suis cuisinier : quand suis-je payé ?", a: "Votre part est virée sur votre compte Stripe 24 h après la remise de chaque commande, puis sur votre compte bancaire selon votre calendrier de virement Stripe.", id: "paiements" },
  { q: "J'ai eu un problème avec une commande", a: "Depuis votre commande, cliquez sur « Signaler un problème ». Notre équipe vous répond sous 24 h. En cas de malaise ou de réaction allergique grave, appelez immédiatement le 15 ou le 112.", id: "signaler" },
];

const HYGIENE = [
  "Lavez-vous les mains avant et pendant la préparation ; attachez vos cheveux.",
  "Respectez la chaîne du froid : réfrigérateur ≤ 4 °C, congélateur ≤ −18 °C.",
  "Refroidissez rapidement les plats cuisinés (moins de 2 h pour passer de 63 °C à 10 °C).",
  "Les plats chauds doivent être maintenus au-dessus de 63 °C jusqu'à la remise.",
  "Étiquetez chaque barquette : nom du plat, date de préparation, allergènes, « à consommer dans les 24 h ».",
  "Utilisez des emballages alimentaires propres et fermés.",
  "Ne vendez pas de plats à base d'œufs crus non pasteurisés ni de préparations à risque.",
  "Pour une activité régulière : déclaration à la DDPP (Cerfa 13984), formation hygiène (HACCP, 14 h) et statut d'entreprise.",
];

export default function Help() {
  const { topic } = useParams();
  const [open, setOpen] = useState<number | null>(0);
  if (topic === "hygiene") {
    return (
      <div className="container max-w-3xl py-10">
        <Seo title="Règles d'hygiène pour les Mami Cooks" path="/aide/hygiene" />
        <h1 className="mb-6 text-3xl font-extrabold">Règles d'hygiène essentielles</h1>
        <Card className="p-6"><ol className="list-decimal space-y-3 pl-5">{HYGIENE.map((h) => <li key={h}>{h}</li>)}</ol></Card>
        <p className="mt-4 text-sm text-muted-foreground">Sources : règlement (CE) n°852/2004, arrêté du 21 décembre 2009, guide des bonnes pratiques d'hygiène. Plus d'infos sur economie.gouv.fr/dgccrf et agriculture.gouv.fr.</p>
      </div>
    );
  }
  return (
    <div className="container max-w-3xl py-10">
      <Seo title="Aide — MAMI COOK" path="/aide" />
      <h1 className="mb-6 text-3xl font-extrabold">Centre d'aide</h1>
      <div className="space-y-2">
        {FAQ.map((f, i) => (
          <Card key={f.q} id={f.id} className="overflow-hidden">
            <button className="flex w-full items-center justify-between gap-3 p-5 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              {f.q}<ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i && <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>}
          </Card>
        ))}
      </div>
      <Card id="contact" className="mt-8 flex items-center gap-4 p-6">
        <Mail className="h-8 w-8 text-primary" />
        <div><p className="font-bold">Une autre question ?</p><a href="mailto:contact@mamicook.fr" className="text-sm text-primary">contact@mamicook.fr</a> — réponse sous 24 h.</div>
      </Card>
    </div>
  );
}
