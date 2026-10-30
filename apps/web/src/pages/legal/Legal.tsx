import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { t } from "@mami/shared";
import { Seo } from "@/components/Seo";
import { Card, EmptyState } from "@/components/ui/misc";

// ⚠️ MODÈLES à faire relire par un avocat avant le lancement, puis à compléter (champs entre crochets).
// Rédigés pour le droit français et européen ; adaptations nécessaires pour la Suisse et les pays hors UE.
// Sources et analyse : docs/LEGAL_RESEARCH.md. Toute modification des conditions vendeurs ou livreurs
// doit être notifiée 15 jours à l'avance (règlement P2B 2019/1150, art. 3).
const COMPANY = "[Raison sociale de la société]";
const ADDRESS = "[Adresse du siège]";
const EMAIL = "contact@mamicook.fr";
const LEGAL_EMAIL = "legal@mamicook.fr";
const DSA_EMAIL = "signalement@mamicook.fr";
const VERSION = "Version du 29 octobre 2026";

type Doc = { title: string; summary: string; body: React.ReactNode };

const PAGES: Record<string, Doc> = {
  cgu: {
    title: "Conditions générales d'utilisation",
    summary: "Les règles pour utiliser MAMI COOK : comptes, rôles, contenus, sécurité.",
    body: (
      <>
        <p><i>{VERSION}.</i> Les présentes conditions s'appliquent à toute personne qui utilise le site ou les applications MAMI COOK (la « Plateforme »), éditée par {COMPANY}, {ADDRESS} (« MAMI COOK », « nous »).</p>
        <h2>1. Ce qu'est MAMI COOK</h2>
        <p>MAMI COOK est une place de marché en ligne qui met en relation :</p>
        <ul>
          <li>des personnes qui préparent chez elles des plats, desserts et boissons faits maison (les « Cuisiniers ») ;</li>
          <li>des personnes qui les achètent (les « Clients ») ;</li>
          <li>des livreurs indépendants qui peuvent les livrer (les « Livreurs »).</li>
        </ul>
        <p>MAMI COOK agit en tant qu'<b>intermédiaire</b> : la vente d'un plat est conclue entre le Cuisinier et le Client, et la prestation de livraison entre le Livreur et la Plateforme. Les règles propres à chaque rôle sont précisées dans les <Link to="/legal/cgv">conditions de vente</Link>, les <Link to="/legal/vendeurs">conditions des vendeurs</Link> et les <Link to="/legal/livreurs">conditions des livreurs</Link>.</p>
        <h2>2. Compte</h2>
        <ul>
          <li>L'inscription est réservée aux personnes âgées d'au moins 18 ans.</li>
          <li>Les informations fournies doivent être exactes et tenues à jour.</li>
          <li>Vous êtes responsable de la confidentialité de vos identifiants. Nous recommandons d'activer la double authentification.</li>
          <li>Un même compte peut être client, cuisinier et livreur ; chaque rôle suppose l'acceptation des conditions correspondantes.</li>
        </ul>
        <h2>3. Comportements interdits</h2>
        <ul>
          <li>Publier des informations fausses ou trompeuses, notamment sur les ingrédients, les allergènes ou l'origine d'un plat.</li>
          <li>Vendre de l'alcool, des médicaments, des produits à base de viande crue ou tout produit interdit, ou des plats préparés dans des conditions d'hygiène non conformes.</li>
          <li>Contourner la Plateforme pour payer en dehors de celle-ci une commande initiée sur MAMI COOK.</li>
          <li>Publier des avis faux ou rémunérés, harceler, discriminer ou menacer un autre utilisateur.</li>
          <li>Tenter de porter atteinte à la sécurité de la Plateforme ou d'accéder aux données d'autrui.</li>
        </ul>
        <h2>4. Contenus et photos</h2>
        <p>Vous restez propriétaire des contenus que vous publiez (photos, descriptions, avis) et nous accordez une licence gratuite et mondiale pour les afficher sur la Plateforme et dans sa promotion, pendant la durée de leur publication. Les outils de retouche par intelligence artificielle ne doivent pas modifier l'apparence réelle d'un plat ; une image entièrement générée est signalée comme « illustration ».</p>
        <h2>5. Signalements et modération</h2>
        <p>Tout utilisateur peut signaler un contenu ou un comportement illicite. Le traitement des signalements, les sanctions possibles et les recours sont décrits dans la <Link to="/legal/moderation">politique de modération</Link>.</p>
        <h2>6. Disponibilité</h2>
        <p>Nous faisons nos meilleurs efforts pour que la Plateforme fonctionne en continu, sans pouvoir le garantir. Des interruptions peuvent avoir lieu pour maintenance.</p>
        <h2>7. Responsabilité</h2>
        <p>Chaque Cuisinier est responsable des plats qu'il prépare et de leur conformité à la réglementation. Chaque Livreur est responsable de sa conduite pendant la livraison. MAMI COOK est responsable du bon fonctionnement de la Plateforme et de ses propres obligations d'intermédiaire, notamment la vérification des vendeurs et le retrait des contenus illicites signalés.</p>
        <h2>8. Données personnelles</h2>
        <p>Voir la <Link to="/legal/confidentialite">politique de confidentialité</Link>.</p>
        <h2>9. Suspension et clôture</h2>
        <p>Vous pouvez supprimer votre compte à tout moment depuis <Link to="/compte">Mon compte</Link>. Nous pouvons suspendre ou clôturer un compte en cas de manquement grave, dans les conditions de la politique de modération.</p>
        <h2>10. Modification</h2>
        <p>Nous vous informerons de toute modification importante au moins 15 jours avant son entrée en vigueur.</p>
        <h2>11. Droit applicable et litiges</h2>
        <p>Droit français, sous réserve des dispositions impératives du pays de résidence du consommateur. Les consommateurs peuvent recourir gratuitement au médiateur de la consommation : [nom et coordonnées du médiateur]. Plateforme européenne de règlement des litiges : ec.europa.eu/consumers/odr.</p>
      </>
    ),
  },

  cgv: {
    title: "Conditions générales de vente (clients)",
    summary: "Prix, paiement, livraison, annulation, remboursement et réclamations.",
    body: (
      <>
        <p><i>{VERSION}.</i></p>
        <h2>1. Qui vous vend</h2>
        <p>Chaque plat est vendu par le Cuisinier indiqué sur sa fiche. La fiche précise s'il s'agit d'un <b>vendeur professionnel</b> ou d'un <b>particulier</b>. Lorsque le vendeur est un particulier, les droits des consommateurs issus du droit européen ne s'appliquent pas à la vente elle-même ; MAMI COOK applique néanmoins la politique de remboursement décrite ci-dessous.</p>
        <h2>2. Prix</h2>
        <ul>
          <li>Les prix affichés sont toutes taxes comprises et incluent des <b>frais de service</b> perçus par MAMI COOK (20 % du prix fixé par le Cuisinier en France, taux affiché par pays).</li>
          <li>Remises automatiques : −10 % dès 5 plats et −15 % dès 10 plats (hors menus), prises en charge par MAMI COOK et par le Cuisinier au prorata.</li>
          <li>Les codes promo sont à la charge de MAMI COOK et soumis à leurs conditions.</li>
          <li>Livraison par un livreur MAMI COOK : les frais dépendent de la distance et sont affichés avant le paiement.</li>
          <li>Le pourboire est facultatif et reversé intégralement au livreur.</li>
        </ul>
        <h2>3. Commande et paiement</h2>
        <p>La commande est ferme après le paiement en ligne par carte, Apple Pay ou Google Pay, via notre prestataire Stripe. Le montant est débité immédiatement ; il est remboursé si la commande n'est pas acceptée.</p>
        <h2>4. Remise de la commande</h2>
        <ul>
          <li><b>Retrait</b> : l'adresse exacte est communiquée après l'acceptation de la commande ; la remise se fait contre le code à 4 chiffres affiché dans votre commande.</li>
          <li><b>Livraison par le Cuisinier</b> : dans la zone et au tarif indiqués.</li>
          <li><b>Livreur MAMI COOK</b> : suivi en direct ; la remise se fait contre votre code à 4 chiffres. Ne communiquez ce code qu'à la personne qui vous remet la commande.</li>
        </ul>
        <h2>5. Annulation et remboursement</h2>
        <p>Voir le détail dans la <Link to="/legal/remboursements">politique de remboursement</Link>. En résumé : annulation gratuite avant acceptation ; remboursement intégral si le Cuisinier refuse ou annule ; examen de chaque réclamation en cas de problème.</p>
        <h2>6. Droit de rétractation</h2>
        <p>Conformément à l'article L221-28 du Code de la consommation (article 16 de la directive 2011/83/UE), le droit de rétractation ne s'applique pas aux denrées alimentaires susceptibles de se détériorer rapidement.</p>
        <h2>7. Allergènes et sécurité</h2>
        <p>Les 14 allergènes réglementaires sont indiqués sur chaque fiche avant l'achat. En cas d'allergie sévère, contactez le Cuisinier via la messagerie avant de commander. Les plats faits maison peuvent contenir des traces d'autres allergènes.</p>
        <h2>8. Réclamations</h2>
        <p>Depuis votre commande (« Signaler un problème ») ou à {EMAIL}. Réponse sous 48 heures ouvrées. Médiateur de la consommation : [nom et coordonnées].</p>
        <h2>9. Garanties</h2>
        <p>Lorsque le vendeur est un professionnel, vous bénéficiez de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation).</p>
      </>
    ),
  },

  vendeurs: {
    title: "Conditions des vendeurs (cuisinières et cuisiniers)",
    summary: "Inscription, obligations, commissions, versements, classement, suspension et recours.",
    body: (
      <>
        <p><i>{VERSION}.</i> Ces conditions sont conformes au règlement (UE) 2019/1150 « P2B » sur l'équité envers les entreprises utilisatrices des plateformes.</p>
        <h2>1. Inscription et vérification</h2>
        <p>Avant votre première vente, nous devons collecter et vérifier les informations suivantes (règlement sur les services numériques, art. 30) : nom, adresse, coordonnées, pièce d'identité (vérifiée par Stripe), numéro d'immatriculation si vous êtes professionnel. La fiscalité européenne (directive DAC7) nous impose aussi votre numéro fiscal et votre date de naissance. Nous pouvons refuser une candidature incomplète ou non conforme.</p>
        <h2>2. Vos obligations</h2>
        <ul>
          <li>Respecter la réglementation de votre pays : déclaration ou enregistrement sanitaire, formation à l'hygiène, statut (voir le <Link to="/guide-legal">guide par pays</Link>).</li>
          <li>Respecter la <Link to="/legal/hygiene">charte d'hygiène</Link>, la chaîne du froid et les dates de consommation.</li>
          <li>Indiquer avec exactitude les ingrédients et les 14 allergènes.</li>
          <li>Publier des photos fidèles. Les outils de retouche par IA servent à améliorer la lumière ou le fond, jamais à changer le plat.</li>
          <li>Honorer les commandes acceptées et prévenir le client en cas d'imprévu.</li>
          <li>Déclarer vos revenus aux impôts et à la sécurité sociale de votre pays.</li>
          <li>Disposer d'une assurance responsabilité civile adaptée (fortement recommandée).</li>
        </ul>
        <h2>3. Prix, commissions et versements</h2>
        <ul>
          <li>Vous fixez librement votre prix. Le client paie ce prix majoré des frais de service de la plateforme (20 % en France).</li>
          <li>Une commission sur votre part peut s'appliquer selon le pays (0 % en France à ce jour) ; elle est indiquée dans votre espace.</li>
          <li>Les remises volume sont partagées au prorata ; les codes promo sont entièrement payés par MAMI COOK.</li>
          <li>Votre part est versée sur votre compte bancaire via Stripe Connect, environ 24 heures après la remise de la commande. Un litige en cours peut suspendre le versement de la commande concernée.</li>
        </ul>
        <h2>4. Classement des plats</h2>
        <p>Les principaux paramètres de classement sont décrits dans la page <Link to="/legal/classement">transparence du classement</Link>. Aucun vendeur ne peut payer pour être mieux classé.</p>
        <h2>5. Restriction, suspension, résiliation</h2>
        <ul>
          <li>Toute restriction ou suspension vous est notifiée avec ses <b>motifs</b>, au plus tard au moment où elle prend effet.</li>
          <li>Une résiliation définitive est notifiée au moins <b>30 jours</b> à l'avance, sauf manquement grave (sécurité alimentaire, fraude, violence), obligation légale ou manquements répétés.</li>
          <li>Vous pouvez contester toute décision via le système de réclamation ci-dessous.</li>
        </ul>
        <h2>6. Réclamations et médiation</h2>
        <p>Système interne de traitement des réclamations, gratuit, à {LEGAL_EMAIL}, avec une réponse motivée dans un délai raisonnable. Médiateurs désignés pour les litiges avec la plateforme : [nom de deux médiateurs, art. 12 P2B].</p>
        <h2>7. Données</h2>
        <p>Vous avez accès aux données de vos ventes (statistiques, commandes, avis) depuis votre espace. Les coordonnées des clients ne vous sont transmises que dans la mesure nécessaire à la commande ; vous ne pouvez pas les utiliser à d'autres fins.</p>
        <h2>8. Déclaration fiscale (DAC7)</h2>
        <p>Chaque année avant le 31 janvier, MAMI COOK transmet à l'administration fiscale les montants que vous avez perçus, sauf si vous avez réalisé moins de 30 ventes pour moins de 2 000 € dans l'année. Vous recevez une copie de ces informations.</p>
        <h2>9. Modification des conditions</h2>
        <p>Toute modification vous est notifiée au moins 15 jours à l'avance. Vous pouvez résilier avant son entrée en vigueur.</p>
      </>
    ),
  },

  livreurs: {
    title: "Conditions des livreurs",
    summary: "Indépendance, libre choix des courses, rémunération transparente, assurance, recours.",
    body: (
      <>
        <p><i>{VERSION}.</i> Ces conditions s'appliquent aux livreurs indépendants. Dans les pays où la livraison passe par une agence partenaire (Suisse, Espagne), votre contrat est conclu avec l'agence.</p>
        <h2>1. Indépendance</h2>
        <ul>
          <li>Vous exercez en indépendant (ex. micro-entreprise), avec votre propre véhicule et votre propre organisation.</li>
          <li>Vous vous connectez quand vous le souhaitez, sans minimum d'heures ni planning imposé.</li>
          <li>Vous êtes <b>libre de refuser toute course</b>, sans pénalité, sans baisse de visibilité et sans conséquence sur les courses proposées ensuite.</li>
          <li>Vous pouvez travailler pour d'autres plateformes ou clients. Aucune exclusivité.</li>
          <li>Aucune tenue ni signe distinctif n'est imposé.</li>
        </ul>
        <h2>2. Rémunération</h2>
        <ul>
          <li>Prix d'une course payé par le client = base fixe + prix au kilomètre, dans les limites minimum et maximum du pays.</li>
          <li>Vous recevez <b>80 %</b> de ce prix (taux affiché dans votre espace pour votre pays) et <b>100 %</b> du pourboire.</li>
          <li>Le gain, la distance et la zone de livraison sont affichés <b>avant</b> que vous acceptiez.</li>
          <li>Si la commande est annulée après votre arrivée à la cuisine, vous êtes dédommagé de votre part des frais de livraison.</li>
          <li>Versement automatique via Stripe, environ 24 heures après la livraison.</li>
        </ul>
        <h2>3. Transparence de l'attribution des courses</h2>
        <p>Les courses sont proposées aux livreurs en ligne, ayant envoyé leur position dans les 10 dernières minutes, les plus proches de la cuisine (5 km, élargi à 8 km après 10 minutes). La première personne qui accepte obtient la course. Votre note, votre historique ou vos refus <b>n'influencent pas</b> cet ordre. Aucune décision vous concernant n'est prise uniquement par un algorithme : une personne de l'équipe examine toute suspension.</p>
        <h2>4. Vos engagements</h2>
        <ul>
          <li>Disposer des autorisations et du statut requis dans votre pays, et d'une assurance responsabilité civile (et de l'assurance du véhicule s'il est motorisé).</li>
          <li>Respecter le code de la route et l'hygiène du transport alimentaire (sac isotherme propre, plats chauds et froids séparés).</li>
          <li>Remettre la commande uniquement contre le code à 4 chiffres du client.</li>
          <li>Respecter les clients et les cuisinières, ne pas conserver leurs coordonnées.</li>
        </ul>
        <h2>5. Désistement</h2>
        <p>Vous pouvez vous désister d'une course avant d'avoir récupéré la commande. Elle est alors proposée à un autre livreur, sans pénalité.</p>
        <h2>6. Données de localisation</h2>
        <p>Votre position n'est collectée que lorsque vous êtes en ligne. Elle sert à vous proposer des courses proches et n'est montrée au client et à la cuisinière que pendant une course que vous avez acceptée.</p>
        <h2>7. Suspension et recours</h2>
        <p>Toute suspension est motivée par écrit. Vous pouvez la contester auprès de {LEGAL_EMAIL} : une personne vous répond et réexamine la décision.</p>
        <h2>8. Déclarations</h2>
        <p>Vous déclarez vous-même vos revenus. MAMI COOK transmet chaque année aux impôts les montants versés (directive DAC7) et vous en envoie une copie.</p>
      </>
    ),
  },

  confidentialite: {
    title: "Politique de confidentialité",
    summary: "Quelles données nous collectons, pourquoi, combien de temps, et vos droits.",
    body: (
      <>
        <p><i>{VERSION}.</i> Responsable du traitement : {COMPANY}, {ADDRESS}. Contact : {EMAIL}. Délégué à la protection des données : [nom ou prestataire], [e-mail].</p>
        <h2>Données collectées</h2>
        <ul>
          <li><b>Compte</b> : nom affiché, e-mail, téléphone (facultatif), photo (facultative).</li>
          <li><b>Commandes</b> : plats, adresse de livraison, messages, avis.</li>
          <li><b>Cuisiniers et livreurs</b> : identité, date de naissance, numéro fiscal, statut, numéro d'entreprise, adresse (obligations DSA et DAC7) ; vérification d'identité par Stripe ; justificatifs exigés par la loi du pays (pièce d'identité, attestation de formation à l'hygiène, déclaration sanitaire, assurance, permis…), conservés dans un espace privé consultable uniquement par l'équipe de vérification.</li>
          <li><b>Livreurs</b> : position géographique, uniquement quand ils sont en ligne.</li>
          <li><b>Paiement</b> : traité exclusivement par Stripe ; nous ne voyons jamais vos numéros de carte.</li>
          <li><b>Localisation des clients</b> : uniquement pour afficher les plats proches, avec votre accord.</li>
          <li><b>Appli mobile</b> : un identifiant anonyme créé à l'installation, le type de téléphone (iPhone ou Android) et la version de l'appli, pour compter les installations.</li>
        </ul>
        <h2>Finalités et bases légales</h2>
        <ul>
          <li>Exécution du contrat : commandes, livraison, paiements, versements.</li>
          <li>Obligations légales : comptabilité, vérification des vendeurs (DSA), déclaration fiscale (DAC7).</li>
          <li>Intérêt légitime : sécurité, prévention de la fraude, amélioration du service.</li>
          <li>Consentement : notifications push, e-mails promotionnels (retirable à tout moment).</li>
        </ul>
        <h2>Durées de conservation</h2>
        <ul>
          <li>Compte : jusqu'à sa suppression.</li>
          <li>Commandes et factures : 10 ans (obligation comptable), sous forme anonymisée après suppression du compte.</li>
          <li>Données DAC7 : 10 ans après l'année déclarée.</li>
          <li>Positions des livreurs : uniquement la dernière position connue, effacée à la suppression du compte.</li>
          <li>Journaux de sécurité : 1 an.</li>
        </ul>
        <h2>Protection</h2>
        <p>L'adresse exacte des cuisiniers n'est jamais publique : seule une position approximative (environ 400 m) est affichée. Elle n'est transmise qu'au client ou au livreur d'une commande acceptée. Les données sont hébergées dans l'Union européenne, chiffrées, et protégées par un contrôle d'accès ligne par ligne.</p>
        <h2>Destinataires et sous-traitants</h2>
        <ul>
          <li>Supabase : hébergement, région UE.</li>
          <li>Stripe : paiement et vérification d'identité.</li>
          <li>Expo : notifications push.</li>
          <li>Google : retouche des photos de plats par IA, uniquement à la demande du cuisinier ; seule la photo est transmise.</li>
          <li>OpenStreetMap : cartes.</li>
          <li>Base Adresse Nationale : autocomplétion des adresses.</li>
          <li>Administration fiscale : DAC7.</li>
        </ul>
        <p>Les transferts hors UE sont encadrés par des clauses contractuelles types.</p>
        <h2>Vos droits</h2>
        <p>Accès, rectification, effacement, portabilité, limitation, opposition. Téléchargez ou supprimez vos données à tout moment depuis <Link to="/compte">Mon compte</Link>. Réclamation possible auprès de la CNIL (cnil.fr), ou de l'autorité de votre pays (PFPDT en Suisse).</p>
      </>
    ),
  },

  cookies: {
    title: "Cookies",
    summary: "Aucun traceur publicitaire. Seulement le strict nécessaire.",
    body: (
      <>
        <p>MAMI COOK n'utilise <b>aucun cookie publicitaire ni traceur tiers</b>.</p>
        <p>Nous utilisons uniquement le stockage local strictement nécessaire au fonctionnement, exempté de consentement (article 82 de la loi Informatique et Libertés) :</p>
        <ul>
          <li>votre session de connexion ;</li>
          <li>votre panier ;</li>
          <li>votre position de recherche ;</li>
          <li>votre langue ;</li>
          <li>votre préférence de thème.</li>
        </ul>
        <p>Le module de paiement Stripe dépose ses propres cookies, nécessaires à la lutte contre la fraude.</p>
      </>
    ),
  },

  moderation: {
    title: "Politique de modération et signalements",
    summary: "Comment signaler, comment nous décidons, et comment contester (DSA).",
    body: (
      <>
        <p><i>{VERSION}.</i> Conforme au règlement (UE) 2022/2065 sur les services numériques (DSA).</p>
        <h2>1. Signaler un contenu ou un comportement</h2>
        <p>Depuis chaque plat, cuisine, avis ou commande (bouton « Signaler »), ou à {DSA_EMAIL}. Indiquez la raison, l'emplacement exact et, si possible, des explications. Vous recevez un accusé de réception puis notre décision.</p>
        <h2>2. Ce qui est interdit</h2>
        <ul>
          <li>Plats dangereux ou préparés sans respect de l'hygiène.</li>
          <li>Allergènes non déclarés.</li>
          <li>Produits interdits : alcool, médicaments…</li>
          <li>Annonces trompeuses, faux avis, fraude.</li>
          <li>Contenus haineux, violents ou discriminatoires.</li>
          <li>Atteintes à la vie privée.</li>
        </ul>
        <h2>3. Nos décisions</h2>
        <ul>
          <li>Selon la gravité : retrait d'un contenu, masquage d'un plat ou d'un avis, avertissement, suspension temporaire, clôture du compte.</li>
          <li>Risque pour la santé (intoxication, allergène) : la cuisine peut être suspendue immédiatement, à titre conservatoire.</li>
          <li>Chaque décision est <b>motivée</b> et notifiée à la personne concernée (art. 17 DSA), avec les voies de recours.</li>
          <li>Les décisions sont prises par une personne de l'équipe. Aucune n'est prise uniquement de manière automatisée.</li>
        </ul>
        <h2>4. Contester une décision</h2>
        <p>Vous pouvez contester gratuitement une décision dans les 6 mois, à {LEGAL_EMAIL} (art. 20 DSA). Une autre personne réexamine votre dossier. Vous pouvez aussi saisir un organisme de règlement extrajudiciaire certifié (art. 21 DSA) ou la justice.</p>
        <h2>5. Signalements abusifs</h2>
        <p>Les personnes qui envoient fréquemment des signalements manifestement infondés peuvent voir leurs signalements suspendus après avertissement.</p>
        <h2>6. Autorités</h2>
        <p>Point de contact unique pour les autorités : {LEGAL_EMAIL}. Point de contact pour les utilisateurs : {DSA_EMAIL}. Nous coopérons avec les autorités sanitaires et judiciaires.</p>
        <h2>7. Transparence</h2>
        <p>Nous publions chaque année un rapport sur le nombre de signalements, de décisions et de recours.</p>
      </>
    ),
  },

  classement: {
    title: "Transparence du classement",
    summary: "Pourquoi un plat apparaît avant un autre.",
    body: (
      <>
        <p>Conformément au règlement P2B (art. 5) et au Code de la consommation (art. L111-7), voici les principaux paramètres qui déterminent l'ordre des plats sur MAMI COOK :</p>
        <ol className="mb-3 list-decimal space-y-1 pl-6">
          <li><b>Disponibilité</b> : les plats encore en stock passent avant les plats épuisés.</li>
          <li><b>Date</b> : les plats du jour choisi, puis les jours suivants.</li>
          <li><b>Distance</b> entre vous et la position approximative de la cuisine.</li>
          <li><b>Note moyenne du plat</b>, en cas d'égalité.</li>
        </ol>
        <p>Les filtres que vous choisissez (cuisine, type de plat, régime, température, rayon) restreignent les résultats. <b>Aucun vendeur ne paie pour être mieux classé</b> : il n'existe pas de placement sponsorisé. Si cela change un jour, les annonces payantes seront clairement signalées comme « sponsorisées ».</p>
        <p>Les avis sont publiés par ordre chronologique. Seuls les clients ayant reçu une commande peuvent laisser un avis ; nous ne vérifions pas autrement leur contenu, mais retirons les avis illicites signalés.</p>
      </>
    ),
  },

  remboursements: {
    title: "Politique d'annulation et de remboursement",
    summary: "Qui rembourse quoi, et dans quel délai.",
    body: (
      <>
        <p>Le remboursement se fait sur le moyen de paiement utilisé, sous 5 à 10 jours ouvrés selon votre banque.</p>
        <ul>
          <li><b>Avant que la cuisine accepte</b> : vous annulez gratuitement, en un clic. Remboursement intégral.</li>
          <li><b>La cuisine refuse ou annule</b> : remboursement intégral automatique.</li>
          <li><b>Aucun livreur trouvé</b> : notre équipe vous propose le retrait ou vous rembourse intégralement.</li>
          <li><b>Commande non reçue</b> : remboursement intégral après vérification (suivi, code de remise).</li>
          <li><b>Plat non conforme</b> (erreur, quantité manquante, allergène non déclaré, problème d'hygiène) : signalez-le dans les 24 h avec une photo ; remboursement total ou partiel selon le cas.</li>
          <li><b>Après la remise</b>, pour une simple question de goût : pas de remboursement. Le droit de rétractation ne s'applique pas aux denrées périssables.</li>
        </ul>
        <p>Les remboursements liés à une faute du cuisinier peuvent être déduits de ses versements. Ceux liés à une faute du livreur sont examinés au cas par cas.</p>
      </>
    ),
  },

  hygiene: {
    title: "Charte d'hygiène des cuisinières et cuisiniers",
    summary: "Les règles concrètes pour cuisiner en toute sécurité.",
    body: (
      <>
        <p>Cette charte résume les bonnes pratiques du règlement (CE) n°852/2004 et du guide de bonnes pratiques d'hygiène de la restauration. Elle ne remplace pas une formation.</p>
        <h2>Cuisine et matériel</h2>
        <ul>
          <li>Plan de travail, ustensiles et réfrigérateur propres.</li>
          <li>Pas d'animaux sur les plans de travail.</li>
          <li>Planches séparées pour le cru et le cuit.</li>
          <li>Réfrigérateur à 4 °C maximum, avec un thermomètre.</li>
        </ul>
        <h2>Hygiène personnelle</h2>
        <ul>
          <li>Lavage des mains avant de cuisiner, après être allé aux toilettes et après avoir manipulé du cru.</li>
          <li>Cheveux attachés.</li>
          <li>Pas de bijoux aux mains.</li>
          <li>Pas de cuisine en cas de gastro-entérite ou de plaie infectée.</li>
        </ul>
        <h2>Températures</h2>
        <ul>
          <li>Cuisson à cœur : 63 °C minimum (75 °C pour les volailles et les plats réchauffés).</li>
          <li>Refroidissement rapide : passer de 63 °C à 10 °C en moins de 2 heures, puis conserver au réfrigérateur.</li>
          <li>Plats chauds maintenus au-dessus de 63 °C ; plats froids en dessous de 4 °C.</li>
          <li>Plats surgelés à −18 °C ; ne jamais recongeler un produit décongelé.</li>
        </ul>
        <h2>Ingrédients et traçabilité</h2>
        <ul>
          <li>Produits achetés chez des fournisseurs identifiables, dans leur date de validité.</li>
          <li>Conservation des tickets ou étiquettes.</li>
          <li>Pas d'œufs crus pour les préparations non cuites, sauf œufs pasteurisés.</li>
        </ul>
        <h2>Vente</h2>
        <ul>
          <li>Plats préparés le jour même ou la veille, et consommés dans les délais indiqués.</li>
          <li>Contenants alimentaires propres et fermés.</li>
          <li>Étiquette avec le nom du plat, la date de préparation et les allergènes, si possible.</li>
          <li>Allergènes déclarés sans exception sur la fiche du plat.</li>
        </ul>
      </>
    ),
  },

  mentions: {
    title: "Mentions légales",
    summary: "Éditeur, hébergeurs, contacts.",
    body: (
      <>
        <p>Éditeur : {COMPANY}, [forme juridique] au capital de [montant] €, RCS [ville] [numéro], TVA [numéro], {ADDRESS}. Directeur de la publication : [nom]. Contact : {EMAIL}.</p>
        <p>Hébergement : Supabase Inc. (base de données, région UE) et [hébergeur du site, ex. Vercel Inc. / Netlify Inc.].</p>
        <p>Point de contact DSA : {DSA_EMAIL}. Signalement d'une faille de sécurité : security@mamicook.fr.</p>
        <h2>Crédits photos</h2>
        <PhotoCredits />
      </>
    ),
  },
};

const ORDER = ["cgu", "cgv", "vendeurs", "livreurs", "confidentialite", "cookies", "moderation", "classement", "remboursements", "hygiene", "mentions"];

export default function Legal() {
  const { page } = useParams();
  if (!page) {
    return (
      <div className="container max-w-4xl py-10">
        <Seo title={t("Informations légales — MAMI COOK")} path="/legal" />
        <h1 className="mb-6 text-3xl font-extrabold">{t("Informations légales")}</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          {ORDER.map((k) => (
            <Link key={k} to={`/legal/${k}`}><Card className="h-full p-5 hover:bg-muted/50"><p className="font-bold">{PAGES[k].title}</p><p className="text-sm text-muted-foreground">{PAGES[k].summary}</p></Card></Link>
          ))}
        </div>
        <Link to="/guide-legal" className="mt-6 inline-block font-semibold text-primary">{t("Règles pour cuisiner et livrer, pays par pays →")}</Link>
      </div>
    );
  }
  const p = PAGES[page];
  if (!p) return <EmptyState icon="📄" title={t("Page introuvable")} />;
  return (
    <article className="container max-w-3xl py-10 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-xl [&_li]:mb-1 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:text-primary">
      <Seo title={`${p.title} — MAMI COOK`} path={`/legal/${page}`} />
      <p className="mb-2 text-sm"><Link to="/legal">← {t("Informations légales")}</Link></p>
      <h1 className="mb-2 text-3xl font-extrabold">{p.title}</h1>
      <p className="mb-6 rounded-xl bg-muted p-3 text-xs text-muted-foreground">{t("Document rédigé en français, version qui fait foi.")}</p>
      {p.body}
    </article>
  );
}

/** Photos des plats de démonstration : auteurs et licences (Wikimedia Commons). */
function PhotoCredits() {
  const [credits, setCredits] = useState<Record<string, { title: string; page: string; license: string; author: string }>>({});
  const [aiScenes, setAiScenes] = useState(false);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}images/dishes/credits.json`).then((r) => (r.ok ? r.json() : {})).then(setCredits).catch(() => undefined);
    fetch(`${import.meta.env.BASE_URL}images/hero/scenes.json`).then((r) => (r.ok ? r.json() : [])).then((x) => setAiScenes(Array.isArray(x) && x.length > 0)).catch(() => undefined);
  }, []);
  const rows = Object.values(credits);
  if (!rows.length) return <p>{t("Illustrations : MAMI COOK.")}</p>;
  return (
    <>
      <ul>{rows.map((c) => (
        <li key={c.page}><a href={c.page} target="_blank" rel="noopener noreferrer">{c.title.replace(/^File:/, "")}</a> — {c.author || t("auteur inconnu")}, {c.license}</li>
      ))}</ul>
      {aiScenes && <p>{t("Les images d'ambiance de la page d'accueil sont créées par intelligence artificielle : les personnes représentées n'existent pas.")}</p>}
    </>
  );
}
