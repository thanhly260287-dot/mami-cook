# Recherche juridique : cuisiner chez soi et livrer

> **Ce n'est pas un avis juridique.** Synthèse de recherches web du 29/10/2026, à faire valider par un juriste et un expert-comptable dans chaque pays avant le lancement. Les montants changent chaque année.

Base de travail pour la tâche #12 (documents juridiques et guide par pays dans l'appli). Voir [TASKS.md](TASKS.md).

## Règles communes à l'Union européenne

| Texte | Ce que cela implique pour MAMI COOK |
| --- | --- |
| Règlement 852/2004 (hygiène) | Toute personne qui vend de la nourriture est un « exploitant du secteur alimentaire » : enregistrement auprès des autorités, bonnes pratiques d'hygiène, démarche HACCP simplifiée |
| Règlement 1169/2011 (INCO) | Les 14 allergènes doivent être affichés **avant l'achat**, y compris en vente à distance (déjà fait sur les fiches plats) |
| DSA, art. 30 (traçabilité des vendeurs) | Avant toute vente, collecter et vérifier : nom, adresse, téléphone, e-mail, pièce d'identité, numéro d'immatriculation pour les professionnels, et une attestation de conformité |
| DAC7 (directive 2021/514) | Déclaration fiscale annuelle des vendeurs : NIF, date de naissance, adresse, montants par trimestre. Vendeurs exclus s'ils ont moins de 30 ventes **et** au plus 2 000 € par an. Pas de seuil pour les services personnels (livreurs). Informer chaque vendeur |
| Directive Omnibus (2019/2161) | Indiquer si le vendeur est **professionnel ou particulier** ; expliquer les principaux critères de classement des résultats |
| Règlement P2B (2019/1150) | Conditions claires pour les vendeurs : classement, suspension motivée, réclamations, préavis de 15 jours avant un changement des conditions |
| Directive 2024/2831 (travail de plateforme) | Présomption de salariat des livreurs, à transposer **avant le 2 décembre 2026** ; transparence des algorithmes. Il faut une **indépendance réelle** : libre refus sans pénalité, pas d'horaires imposés, rémunération connue avant d'accepter |
| Droit de rétractation | Exclu pour les denrées périssables (art. 16 d de la directive 2011/83/UE) |
| RGPD | Registre des traitements, durées de conservation, hébergement dans l'UE, droits d'accès et de suppression (export et suppression déjà faits) |

## Par pays

### France
- **Déclaration** auprès de la DDPP (Cerfa 13984) pour une activité régulière.
- **Formation hygiène** de 14 h pour une activité régulière de restauration. Les sources divergent pour une activité occasionnelle.
- **Statut** : micro-entreprise dès qu'il y a une activité régulière. Plafonds 2026-2028 : 203 100 € (vente, restauration) et 83 600 € (services). Franchise de TVA : 85 000 € (vente) et 37 500 € (services).
- **Agrément sanitaire** si des plats à base de viande sont vendus à d'autres professionnels.
- **Livreurs** :
  - micro-entrepreneurs ;
  - loi LOM avec charte sociale facultative ;
  - dialogue social organisé par l'ARPE (revenu minimum par course négocié).

### Suisse
- **Annonce** au laboratoire cantonal ou chimiste cantonal (ODAlOUs, art. 20 ; loi sur les denrées alimentaires, LDAl).
- Mêmes règles d'hygiène et d'autocontrôle que tout établissement. Exception pour la vente occasionnelle (bazars).
- Un responsable avec une adresse en Suisse.
- **Livreurs** : le Tribunal fédéral a jugé les livreurs Uber Eats salariés (2C_575/2020 et 2C_34/2021, 30 mai 2022). D'où le mode `partner_agency` : les livreurs passent par une agence partenaire.

### Allemagne
- Gewerbeanmeldung (déclaration d'activité).
- Infektionsschutzbelehrung (§ 43 IfSG).
- Enregistrement auprès de la Lebensmittelüberwachung.

### Belgique
- Enregistrement ou autorisation de l'AFSCA. Une autorisation est requise pour les produits non préemballés.

### Italie
- Pas d'exception « hobby » : il faut une entreprise individuelle et un numéro de TVA.
- Démarches : SCIA via le SUAP, notification sanitaire à l'ASL.
- Manuel HACCP et attestation HACCP.

### Espagne
- Statut d'autónomo.
- Registre sanitaire ou déclaration responsable.
- Carnet de manipulador de alimentos.
- **Livreurs** : loi « Rider » (présomption de salariat), donc mode `partner_agency`.

### Royaume-Uni
- Enregistrement gratuit auprès du council au moins 28 jours avant de commencer.
- Inspection possible.
- Formation à l'hygiène recommandée.

### Pays-Bas
- Inscription à la KVK si l'activité est celle d'une entreprise.
- Enregistrement auprès de la NVWA.
- Respect de l'hygiënecode et des règles municipales.

### États-Unis
- **Cottage food laws** : selon les États, seulement des aliments non périssables.
- **Californie** :
  - loi AB 626 (MEHKO), qui permet des repas complets faits à la maison ;
  - opt-in comté par comté ;
  - certificat de food manager ;
  - plafond d'environ 100 000 $ par an.
- Pays désactivé dans l'appli : `courier_mode = disabled`.

## Ce que l'appli doit demander à une cuisinière (selon le pays)

Champs déjà prévus dans `cook_private` : nom légal, date de naissance, NIF, numéro de TVA, statut, numéro d'immatriculation, référence d'enregistrement sanitaire, date de formation à l'hygiène, déclaration d'assurance.

Fait : guide par pays, badge « particulier / professionnel », et **justificatifs obligatoires par pays** (table `compliance_requirements`, migration `20261029000008_compliance.sql`) vérifiés par l'équipe avant la première vente.

À vérifier par un juriste : la liste exacte des documents pour LU, AT, PT, IE (recherche moins approfondie) et les durées de validité.
