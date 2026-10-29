import { useParams, Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { EmptyState } from "@/components/ui/misc";

// ⚠️ Modèles à faire relire par un juriste et à compléter (champs entre crochets) avant le lancement.
const COMPANY = "[Raison sociale]";
const ADDRESS = "[Adresse du siège]";
const EMAIL = "contact@mamicook.fr";

const PAGES: Record<string, { title: string; body: React.ReactNode }> = {
  cgu: {
    title: "Conditions générales d'utilisation et de vente",
    body: (
      <>
        <p><i>Version du 29 octobre 2026.</i></p>
        <h2>1. Objet</h2>
        <p>MAMI COOK est une plateforme de mise en relation entre des particuliers ou professionnels qui préparent des plats faits maison (les « Cuisiniers ») et des personnes qui souhaitent les acheter (les « Clients »). {COMPANY} agit en qualité d'intermédiaire : le contrat de vente du plat est conclu directement entre le Cuisinier et le Client.</p>
        <h2>2. Inscription</h2>
        <p>L'inscription est réservée aux personnes majeures. Vous êtes responsable de la confidentialité de vos identifiants. La double authentification est recommandée.</p>
        <h2>3. Obligations des Cuisiniers</h2>
        <ul>
          <li>Respecter la réglementation en matière d'hygiène alimentaire (règlement CE n°852/2004), la chaîne du froid et les durées de conservation.</li>
          <li>Déclarer leur activité auprès de la DDPP lorsque celle-ci est régulière, et disposer d'un statut adapté (ex. micro-entreprise).</li>
          <li>Indiquer de manière exacte et complète les 14 allergènes réglementaires (règlement UE n°1169/2011).</li>
          <li>Ne pas vendre de boissons alcoolisées ni de produits interdits.</li>
          <li>Remettre les plats conformes à l'annonce, à la date et dans le créneau indiqués.</li>
        </ul>
        <h2>4. Prix et paiement</h2>
        <p>Le prix affiché au Client inclut des frais de service de 20 % au profit de MAMI COOK. Des remises automatiques s'appliquent dès 5 plats (−10 %) et 10 plats (−15 %). Le paiement est effectué en ligne via notre prestataire Stripe. Les fonds sont reversés au Cuisinier après la remise de la commande.</p>
        <h2>5. Annulation et remboursement</h2>
        <p>Le Client peut annuler gratuitement tant que le Cuisinier n'a pas accepté la commande. Si le Cuisinier refuse ou annule, le Client est intégralement remboursé. En cas de commande non conforme, le Client peut signaler le problème depuis sa commande ; MAMI COOK examine chaque réclamation. Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux denrées périssables.</p>
        <h2>6. Avis</h2>
        <p>Seuls les Clients ayant reçu une commande peuvent laisser un avis, dans les 30 jours. Les avis ne sont pas rémunérés et peuvent être modérés en cas de contenu illicite (article L111-7-2 du Code de la consommation).</p>
        <h2>7. Responsabilité</h2>
        <p>Chaque Cuisinier est seul responsable des plats qu'il prépare. MAMI COOK vérifie l'identité des Cuisiniers et retire tout contenu signalé comme dangereux ou illicite.</p>
        <h2>8. Suspension</h2>
        <p>MAMI COOK peut suspendre un compte en cas de manquement aux présentes conditions, notamment en matière de sécurité alimentaire.</p>
        <h2>9. Médiation et droit applicable</h2>
        <p>Droit français. En cas de litige, le Client consommateur peut recourir gratuitement au médiateur de la consommation : [Nom et coordonnées du médiateur].</p>
      </>
    ),
  },
  confidentialite: {
    title: "Politique de confidentialité",
    body: (
      <>
        <p>Responsable du traitement : {COMPANY}, {ADDRESS}. Contact : {EMAIL}.</p>
        <h2>Données collectées</h2>
        <ul>
          <li>Compte : nom affiché, e-mail, téléphone (facultatif), photo (facultative).</li>
          <li>Commandes : plats, adresse de livraison, messages échangés, avis.</li>
          <li>Cuisiniers : adresse de la cuisine, SIRET, données de vérification d'identité (traitées par Stripe).</li>
          <li>Paiement : traité exclusivement par Stripe ; nous ne stockons jamais vos numéros de carte.</li>
          <li>Localisation : utilisée uniquement pour afficher les cuisines proches, avec votre accord.</li>
        </ul>
        <h2>Finalités et bases légales</h2>
        <p>Exécution du contrat (commandes, paiements), obligation légale (comptabilité : 10 ans), intérêt légitime (sécurité, prévention de la fraude), consentement (e-mails promotionnels, notifications push).</p>
        <h2>Protection</h2>
        <p>Les adresses exactes des Cuisiniers ne sont jamais publiques : seule une position approximative (~400 m) est affichée, l'adresse exacte n'étant transmise qu'aux Clients dont la commande est acceptée. Les données sont hébergées dans l'Union européenne, chiffrées en transit et au repos, et protégées par un contrôle d'accès strict au niveau de chaque ligne de la base de données.</p>
        <h2>Vos droits</h2>
        <p>Accès, rectification, effacement, portabilité, opposition. Téléchargez ou supprimez vos données à tout moment depuis <Link to="/compte">Mon compte</Link>. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
        <h2>Sous-traitants</h2>
        <p>Supabase (hébergement, UE), Stripe (paiement), Expo (notifications push), OpenStreetMap (cartes), Base Adresse Nationale (adresses).</p>
      </>
    ),
  },
  cookies: {
    title: "Cookies",
    body: (
      <>
        <p>MAMI COOK n'utilise <b>aucun cookie publicitaire ni traceur tiers</b>.</p>
        <p>Nous utilisons uniquement le stockage local strictement nécessaire au fonctionnement : votre session de connexion, votre panier, votre position de recherche et votre préférence de thème. Ces éléments sont exemptés de consentement (article 82 de la loi Informatique et Libertés). Le module de paiement Stripe dépose ses propres cookies nécessaires à la lutte contre la fraude.</p>
      </>
    ),
  },
  mentions: {
    title: "Mentions légales",
    body: (
      <>
        <p>Éditeur : {COMPANY}, [forme juridique] au capital de [montant] €, RCS [ville] [numéro], {ADDRESS}. Directeur de la publication : [nom]. Contact : {EMAIL}.</p>
        <p>Hébergement : Supabase Inc. (base de données, région UE) et [hébergeur du site, ex. Vercel Inc. / Netlify Inc.].</p>
      </>
    ),
  },
};

export default function Legal() {
  const { page } = useParams();
  const p = page ? PAGES[page] : undefined;
  if (!p) return <EmptyState icon="📄" title="Page introuvable" />;
  return (
    <article className="container max-w-3xl py-10 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-xl [&_li]:mb-1 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:text-primary">
      <Seo title={`${p.title} — MAMI COOK`} path={`/legal/${page}`} />
      <h1 className="mb-6 text-3xl font-extrabold">{p.title}</h1>
      {p.body}
    </article>
  );
}
