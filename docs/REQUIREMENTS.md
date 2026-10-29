# Cahier des charges

Les demandes de l'utilisateur sont citées telles qu'il les a écrites. Elles ont été reconstituées à partir de la conversation du 29/10/2026 ; la première partie de cette conversation n'est disponible qu'en résumé.

Statuts : ✅ fait et testé · 🟡 en cours · ⬜ à faire. Le détail des tâches est dans [TASKS.md](TASKS.md).

## Demandes de l'utilisateur

| Date | Demande (citation) |
| --- | --- |
| 29/10/2026 | « je veux que tu fasses tout ici, on fait plus rien avec lovable, que tu me termines mon site internet et applications iOS et Android et crée de la sécurité et une application prête à accueillir des millions d'utilisateurs, rends-la robuste en sécurité et scalable et un maximum de fonctionnalités, pense à tout » |
| 29/10/2026 | « crée-toi des images s'il le faut », puis « mets-moi des vraies images » |
| 29/10/2026 | « mets le site et les apps dans toutes les langues » |
| 29/10/2026 | « fais en sorte que mon application et mon SaaS soient extrêmement complets, fais toutes les pages qu'il faut, pense au système de livraison, fais en sorte que les livreurs soient payés, […] qu'on gagne un pourcentage sur les plats, sur chaque vente et aussi sur les livreurs […] regarde aussi au niveau des lois en Suisse, en France, dans toute l'Europe pour chaque pays et même pour le monde entier. Qu'est-ce que les gens doivent faire pour pouvoir cuisiner depuis chez eux ? Formation hygiène ? Micro-entrepreneur ? […] Et fais les CGU, les conditions générales, la politique de l'application, etc. » |
| 29/10/2026 | « Ajoute-moi le système de moyen de paiement via Stripe » → déjà en place (paiement client, Apple/Google Pay, Stripe Connect pour les cuisinières) ; reste : versements aux livreurs (#10) et activation avec les vraies clés |
| 29/10/2026 | « termine le SaaS, c'est-à-dire le site et applications, et d'avoir quelque chose de bien complet ; mets Nano Banana pour les images » |
| 29/10/2026 | « crée un système pour ceux qui veulent vendre des plats et desserts, crée un écosystème où on pense à tout : les stats, dashboard personnel pour tous, ajout d'images et modification IA si nécessaire, etc. » |
| 29/10/2026 | Système de mémoire permanente : CLAUDE.md, docs, skills, hooks, Git (voir [SESSION_LOG.md](SESSION_LOG.md)) |
| 29/10/2026 | « met des vrai image stp » → ✅ 12 photos Wikimedia Commons |
| 29/10/2026 | « je veux atteindre le 100% au niveau des fonctionnalités […] que tu te souviennes bien de tout ce que je te dis […] Faut s'occuper de la base de données, moyen de paiement, surtout que tu mettes de vraies photos, de vrais plats, et […] un vrai site avec une vraie démo, et puis qu'on le mette en ligne […] la livraison, qu'il y ait le GPS en temps réel, qu'on prenne notre commission sur la livraison, qu'on prenne notre commission sur chaque vente de chaque plat, avoir un vrai business model. Et surtout qu'au niveau des conditions, que les gens, par exemple en France, ils doivent suivre une formation par rapport à l'hygiène. Etc. Vraiment regarder toutes les lois par rapport à chaque pays. […] termine-moi cette application aujourd'hui. » |
| 29/10/2026 | « total des vente ca va dans le dashboard on veut le nombre de vendeur, de plats ou de dessert vendu, nombre de commande, etc », puis « nombre de telechargement » → ✅ tableau de bord v2 (#17) |
| 29/10/2026 | « met aussi filtre par ville » → ✅ filtre par ville dans le tableau de bord + classement des villes (#18) |
| 29/10/2026 | « met une image dans au debut dans la landing page en haut » → ✅ 3 vraies photos de plats en haut de l'accueil, visibles aussi sur téléphone (#19) |
| 29/10/2026 | « non je veux une image dune maman qui est contente de faire a manger » → ✅ photo d'une femme souriante qui cuisine (Wikimedia Commons, CC BY 2.0, auteur Shixart1985) en bannière d'accueil (#19) |
| 29/10/2026 | « je veux une image et marquer un itre et du texte faut que se soit jolie et met une autre image » → ✅ bannière plein écran : photo d'une maman souriante qui prépare des gâteaux de fête (Wikimedia Commons, CC BY-SA 4.0, Hbegzee), titre et texte posés dessus (#19) |
| 29/10/2026 | « non je veux une belle image propre dans une cuisine moderne qui donne envie la limage est sale » → ✅ maman souriante en tablier dans une cuisine blanche lumineuse (Wikimedia Commons, CC BY 2.0, Shixart1985), fondu blanc et texte foncé (#19) |
| 29/10/2026 | « une belle image d'une maman jolie 40 ans italienne ou espagnole qui cuisine des spaghettis qui sourit et mettre les textes un peu sur l'image » → 🟡 maman brune souriante d'environ 40 ans en cuisine moderne (CC BY 2.0, Shixart1985), texte qui déborde sur la photo ; **aucune photo libre de spaghettis trouvée** (Wikimedia : rien ; Openverse en panne) → options proposées : clé Pexels gratuite ou image IA (clé Gemini) |

## Fonctionnalités

### Clients
- ✅ Recherche par position, carte, filtres (cuisine, régime, température, jour, rayon), recherche texte tolérante aux fautes.
- ✅ Fiche plat avec les 14 allergènes, suppléments et menus.
- ✅ Panier, remises volume, codes promo.
- ✅ Paiement Stripe (carte, Apple Pay, Google Pay).
- ✅ Suivi de commande en temps réel, code de retrait, messagerie avec la cuisinière, avis, favoris, notifications push, signalements.
- ✅ RGPD : export et suppression du compte, double authentification.
- ✅ Livraison par un livreur MAMI, pourboire, suivi GPS du livreur en direct (tâches #10, #11).
- ✅ Reçus téléchargeables (page reçu, #11).
- 🟡 Devise automatique selon le pays de la cuisine (table `countries`) ; pas de sélecteur de pays pour le client.

### Cuisinières
- ✅ Candidature avec engagements d'hygiène ; plats, photos, ventes programmées, stock.
- ✅ Gestion des commandes, tableau de bord, versements Stripe Connect, réponses aux avis.
- ✅ Informations légales DSA/DAC7, guide légal selon le pays, badge « professionnel / particulier ».
- ✅ **Justificatifs obligatoires par pays** (29/10/2026) : formation hygiène, déclaration sanitaire, identité, assurance… vérifiés par l'équipe avant la première vente ; suspension automatique à l'expiration (migration `0008_compliance`, 162 vérifications SQL).

### Livreurs
- ✅ Base de données, sécurité, commission sur la livraison (#10).
- ✅ Espace livreur web et mobile : inscription, en ligne / hors ligne, missions librement acceptées ou refusées, étapes, carte, GPS, gains, Stripe (#11).
- ✅ Justificatifs par pays (identité, statut, assurance ; permis et assurance du véhicule en scooter ou voiture). Mise en ligne refusée si le dossier est incomplet.

### Plateforme / équipe
- ✅ Modération des cuisines et des signalements, suspension, codes promo, journal d'audit.
- ✅ Tableau de bord de l'équipe : total des ventes, nombre de commandes, panier moyen, revenus (commission plats et commission livraison séparées), plats / desserts vendus, meilleures ventes et meilleurs vendeurs, vendeurs ayant vendu, utilisateurs, installations de l'appli (iPhone / Android), **filtre par ville** et classement des villes. Visible dans la démo avec des chiffres d'exemple (`/admin`).
- ✅ Back-office complet : indicateurs, utilisateurs, validation des livreurs, commandes et remboursements, taux par pays, versements, export DAC7 (#11), vérification des justificatifs.

### Juridique
- ✅ Recherche réglementaire par pays : [LEGAL_RESEARCH.md](LEGAL_RESEARCH.md).
- ✅ 11 documents : CGU, CGV, conditions vendeurs (P2B), conditions livreurs, confidentialité, cookies, modération (DSA), classement, remboursements, charte d'hygiène, mentions légales (#12). **À faire relire par un avocat.**
- ✅ Guide légal par pays dans le site.

### Transversal
- ✅ 10 langues sur le site et les applis.
- ✅ Vraies photos des 12 plats de démo (Wikimedia Commons, #8).
- ✅ Sécurité (RLS, CSP, limitation de débit…) : voir [SECURITE.md](SECURITE.md).
- ✅ Conception pour la montée en charge : voir [ARCHITECTURE.md](ARCHITECTURE.md).
