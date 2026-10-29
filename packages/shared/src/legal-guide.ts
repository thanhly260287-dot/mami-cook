import { t } from "./i18n";

// Guide des démarches pour cuisiner ou livrer depuis chez soi, par pays.
// Synthèse de docs/LEGAL_RESEARCH.md : information générale, PAS un avis juridique.
// Les règles changent : relecture annuelle par un juriste nécessaire.

export interface LegalStep {
  title: string;
  detail: string;
  /** Obligatoire dès la première vente (sinon : selon la régularité de l'activité). */
  required: boolean;
  link?: string;
}

export interface CountryGuide {
  code: string;
  cook: LegalStep[];
  courier: LegalStep[];
  /** Règles valables dans toute l'UE (affichées en plus). */
  eu: boolean;
}

/** Démarches communes à toute l'Union européenne. */
export function euCommonSteps(): LegalStep[] {
  return [
    { required: true, title: t("Respecter les règles d'hygiène"), detail: t("Cuisine propre, chaîne du froid respectée, traçabilité des ingrédients (règlement européen 852/2004).") },
    { required: true, title: t("Déclarer les 14 allergènes"), detail: t("Chaque plat doit indiquer les allergènes avant l'achat (règlement 1169/2011). MAMI COOK vous le demande pour chaque plat.") },
    { required: true, title: t("Fournir vos informations d'identité"), detail: t("Nom, adresse, date de naissance et numéro fiscal : la loi oblige la plateforme à vérifier les vendeurs (DSA) et à déclarer leurs revenus aux impôts (DAC7).") },
    { required: false, title: t("Assurance responsabilité civile"), detail: t("Fortement conseillée : elle vous couvre en cas d'intoxication ou d'accident.") },
  ];
}

export function getCountryGuide(code: string): CountryGuide {
  switch (code) {
    case "FR":
      return {
        code, eu: true,
        cook: [
          { required: false, title: t("Déclarer votre activité à la DDPP"), detail: t("Formulaire Cerfa 13984, gratuit, dès que vous vendez régulièrement."), link: "https://www.service-public.fr/professionnels-entreprises/vosdroits/R17578" },
          { required: false, title: t("Formation hygiène alimentaire (14 h)"), detail: t("Obligatoire pour une activité régulière de restauration. Environ 200 à 400 €, souvent finançable.") },
          { required: false, title: t("Créer une micro-entreprise"), detail: t("Nécessaire dès que l'activité devient régulière. Plafond 2026 : 203 100 € de chiffre d'affaires pour la vente de repas. Gratuit sur le guichet unique."), link: "https://formalites.entreprises.gouv.fr" },
          { required: false, title: t("TVA"), detail: t("Pas de TVA à facturer sous 85 000 € de chiffre d'affaires par an (franchise en base).") },
        ],
        courier: [
          { required: true, title: t("Statut de micro-entrepreneur"), detail: t("Obligatoire pour livrer en indépendant. Activité « livraison à vélo / coursier ».") , link: "https://formalites.entreprises.gouv.fr" },
          { required: true, title: t("Assurance"), detail: t("Responsabilité civile professionnelle ; assurance du véhicule si scooter ou voiture.") },
          { required: false, title: t("Vos droits"), detail: t("Vous êtes libre de refuser une course sans pénalité et vous voyez le prix avant d'accepter.") },
        ],
      };
    case "BE":
      return {
        code, eu: true,
        cook: [
          { required: true, title: t("Enregistrement auprès de l'AFSCA"), detail: t("Obligatoire avant de vendre des repas. Une autorisation est nécessaire pour les plats non emballés."), link: "https://www.favv-afsca.be" },
          { required: false, title: t("Numéro d'entreprise (BCE)"), detail: t("Nécessaire dès que l'activité devient régulière, via un guichet d'entreprise.") },
        ],
        courier: [
          { required: true, title: t("Statut d'indépendant"), detail: t("Inscription à la BCE et à une caisse d'assurances sociales.") },
          { required: true, title: t("Assurance"), detail: t("Responsabilité civile ; assurance du véhicule si motorisé.") },
        ],
      };
    case "LU":
      return {
        code, eu: true,
        cook: [
          { required: true, title: t("Déclaration à la sécurité alimentaire"), detail: t("Enregistrement auprès de l'Agence luxembourgeoise pour la sécurité sanitaire de la chaîne alimentaire (ALVA).") },
          { required: false, title: t("Autorisation d'établissement"), detail: t("Nécessaire pour une activité commerciale régulière.") },
        ],
        courier: [
          { required: true, title: t("Statut d'indépendant"), detail: t("Autorisation d'établissement et affiliation au CCSS.") },
        ],
      };
    case "CH":
      return {
        code, eu: false,
        cook: [
          { required: true, title: t("Annonce au chimiste cantonal"), detail: t("Toute vente régulière de denrées doit être annoncée au laboratoire cantonal (ordonnance ODAlOUs, art. 20). Exception : vente occasionnelle (kermesse, bazar).") },
          { required: true, title: t("Autocontrôle et hygiène"), detail: t("Mêmes règles que tout établissement : hygiène, traçabilité, étiquetage des allergènes.") },
          { required: false, title: t("Inscription AVS comme indépendant"), detail: t("Nécessaire dès que l'activité devient régulière.") },
        ],
        courier: [
          { required: true, title: t("Livraison via une agence partenaire"), detail: t("En Suisse, les livreurs de plateforme sont considérés comme salariés (Tribunal fédéral, 2022). MAMI COOK travaille avec une agence qui vous emploie.") },
        ],
      };
    case "DE":
      return {
        code, eu: true,
        cook: [
          { required: true, title: t("Gewerbeanmeldung"), detail: t("Déclaration d'activité auprès de la mairie (Gewerbeamt).") },
          { required: true, title: t("Infektionsschutzbelehrung"), detail: t("Formation obligatoire auprès du service de santé (§ 43 IfSG).") },
          { required: true, title: t("Enregistrement à la Lebensmittelüberwachung"), detail: t("Le service de contrôle alimentaire peut inspecter votre cuisine.") },
        ],
        courier: [{ required: true, title: t("Gewerbeanmeldung"), detail: t("Déclaration d'activité indépendante.") }],
      };
    case "IT":
      return {
        code, eu: true,
        cook: [
          { required: true, title: t("Numéro de TVA (Partita IVA)"), detail: t("En Italie, il n'existe pas d'exception pour les particuliers : une entreprise individuelle est nécessaire.") },
          { required: true, title: t("SCIA et notification sanitaire"), detail: t("Déclaration via le SUAP de la commune et notification à l'ASL.") },
          { required: true, title: t("Formation et manuel HACCP"), detail: t("Attestation HACCP et plan d'autocontrôle écrit.") },
        ],
        courier: [{ required: true, title: t("Statut d'indépendant (Partita IVA)"), detail: t("Inscription à l'INPS et à l'INAIL.") }],
      };
    case "ES":
      return {
        code, eu: true,
        cook: [
          { required: true, title: t("Statut d'autónomo"), detail: t("Inscription au RETA (sécurité sociale) et à l'administration fiscale.") },
          { required: true, title: t("Registre sanitaire"), detail: t("Enregistrement ou déclaration responsable auprès de la communauté autonome.") },
          { required: true, title: t("Carnet de manipulador de alimentos"), detail: t("Formation courte à l'hygiène alimentaire.") },
        ],
        courier: [{ required: true, title: t("Livraison via une agence partenaire"), detail: t("La loi « Rider » présume que les livreurs sont salariés : MAMI COOK passe par une agence qui vous emploie.") }],
      };
    case "GB":
      return {
        code, eu: false,
        cook: [
          { required: true, title: t("Enregistrement auprès du council"), detail: t("Gratuit, au moins 28 jours avant de commencer. Une inspection peut avoir lieu."), link: "https://www.gov.uk/food-business-registration" },
          { required: false, title: t("Formation à l'hygiène alimentaire"), detail: t("Recommandée (Level 2 Food Hygiene).") },
          { required: false, title: t("Déclaration aux impôts (HMRC)"), detail: t("Au-delà de 1 000 £ de revenus par an (trading allowance).") },
        ],
        courier: [{ required: true, title: t("Statut de self-employed"), detail: t("Inscription auprès du HMRC.") }],
      };
    case "NL":
      return {
        code, eu: true,
        cook: [
          { required: false, title: t("Inscription à la KVK"), detail: t("Nécessaire si l'activité est celle d'une entreprise.") },
          { required: true, title: t("Enregistrement auprès de la NVWA"), detail: t("Et respect du code d'hygiène (hygiënecode) ; vérifiez aussi les règles de votre commune.") },
        ],
        courier: [{ required: true, title: t("Inscription à la KVK"), detail: t("Statut d'indépendant (zzp).") }],
      };
    case "US":
      return {
        code, eu: false,
        cook: [
          { required: true, title: t("Lois de chaque État (cottage food)"), detail: t("La plupart des États n'autorisent que des aliments non périssables. En Californie, la loi MEHKO (AB 626) permet de vendre des repas si votre comté l'a adoptée, avec un permis et un certificat de food manager.") },
        ],
        courier: [{ required: true, title: t("Livreurs non disponibles"), detail: t("La livraison par livreur n'est pas encore proposée dans ce pays.") }],
      };
    default:
      return {
        code, eu: ["AT", "PT", "IE"].includes(code),
        cook: [
          { required: true, title: t("Enregistrement auprès des autorités sanitaires"), detail: t("Toute vente de repas doit être déclarée aux autorités sanitaires locales. Renseignez-vous auprès de votre mairie.") },
          { required: false, title: t("Statut d'entreprise"), detail: t("Nécessaire dès que l'activité devient régulière.") },
        ],
        courier: [{ required: true, title: t("Statut d'indépendant"), detail: t("Renseignez-vous auprès de l'administration fiscale de votre pays.") }],
      };
  }
}
