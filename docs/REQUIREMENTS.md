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

## Fonctionnalités

### Clients
- ✅ Recherche par position, carte, filtres (cuisine, régime, température, jour, rayon), recherche texte tolérante aux fautes.
- ✅ Fiche plat avec les 14 allergènes, suppléments et menus.
- ✅ Panier, remises volume, codes promo.
- ✅ Paiement Stripe (carte, Apple Pay, Google Pay).
- ✅ Suivi de commande en temps réel, code de retrait, messagerie avec la cuisinière, avis, favoris, notifications push, signalements.
- ✅ RGPD : export et suppression du compte, double authentification.
- 🟡 Livraison par un livreur MAMI, pourboire, suivi du livreur en direct.
- ⬜ Reçus et factures téléchargeables.
- ⬜ Choix du pays et de la devise.

### Cuisinières
- ✅ Candidature avec engagements d'hygiène ; plats, photos, ventes programmées, stock.
- ✅ Gestion des commandes, tableau de bord, versements Stripe Connect, réponses aux avis.
- ⬜ Informations légales DSA/DAC7 à l'inscription (identité, numéro fiscal, statut, enregistrement sanitaire), guide légal selon le pays, badge « professionnel / particulier ».

### Livreurs
- 🟡 Base de données et règles de sécurité (en cours).
- ⬜ Espace livreur web et mobile : inscription, en ligne / hors ligne, missions librement acceptées ou refusées, étapes, carte, gains, Stripe.

### Plateforme / équipe
- ✅ Modération des cuisines et des signalements, suspension, codes promo, journal d'audit.
- ⬜ Back-office complet : indicateurs, utilisateurs, validation des livreurs, commandes et remboursements, taux par pays, versements, export DAC7.

### Juridique
- ✅ Recherche réglementaire par pays : [LEGAL_RESEARCH.md](LEGAL_RESEARCH.md).
- 🟡 Modèles CGU, confidentialité, cookies et mentions légales (français uniquement, dans `apps/web/src/pages/legal/Legal.tsx`).
- ⬜ CGV, conditions vendeurs (P2B), conditions livreurs, politique de modération (DSA), transparence du classement, remboursements, charte d'hygiène, guide légal par pays dans l'appli.

### Transversal
- ✅ 10 langues sur le site et les applis.
- ⬜ Vraies photos des plats : bloqué, le réseau du conteneur refuse `images.unsplash.com`.
- ✅ Sécurité (RLS, CSP, limitation de débit…) : voir [SECURITE.md](SECURITE.md).
- ✅ Conception pour la montée en charge : voir [ARCHITECTURE.md](ARCHITECTURE.md).
