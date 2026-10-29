# Journal des modifications

Les modifications importantes, de la plus récente à la plus ancienne. Le détail se trouve dans `git log`.

## Non publié

- Système de mémoire du projet : `CLAUDE.md`, `docs/` (10 fichiers et la recherche juridique), 5 skills, hooks, `scripts/check-docs.sh`.
- Livraison par livreurs (serveur) :
  - pays et devises (EUR, CHF…) ;
  - commission sur les plats et sur la livraison ;
  - pourboire ;
  - courses librement acceptées ou refusées ;
  - suivi en direct ;
  - versements Stripe aux livreurs ;
  - dédommagement en cas d'annulation ;
  - export DAC7 ;
  - statistiques de l'équipe.

- Écrans livreur (web et mobile), livreur et pourboire au panier, suivi en direct, reçu.
- Écosystème vendeurs : desserts et pâtisseries, statistiques détaillées, retouche photo IA (Gemini « Nano Banana »), page légale par pays.
- Mon espace : tableau de bord personnel pour tous.
- Back-office : tableau de bord, livreurs, commandes et remboursements, utilisateurs, codes promo, versements, pays et taux, export DAC7.
- Documents juridiques : CGU, CGV, vendeurs, livreurs, confidentialité, modération, classement, remboursements, charte d'hygiène.
- 404 nouveaux textes traduits dans les 9 langues.

## 29/10/2026

- `ed9b55e` Intégration continue (tests, CodeQL, gitleaks, Dependabot) et documentation de mise en ligne.
- `c5cd31f` Site et applis traduits en 10 langues, dont l'arabe avec mise en page de droite à gauche.
- `42726f0` Sécurité HTTP (CSP, HSTS…), tests de bout en bout, lint, aperçu cliquable, passage de pnpm en mode isolé.
- `f669d8c` Application mobile iOS et Android (Expo) : catalogue, panier, paiement natif, suivi, messagerie, notifications push, espace cuisinier.
- `3273596` Site web complet : catalogue, carte, panier, paiement Stripe, suivi de commande, espace cuisinier, administration, RGPD.
- `8ebf48a` Paiements Stripe Connect, webhooks, versements, RGPD, notifications push, données de démo.
- `ebd3a29` Base de données sécurisée : schéma, RLS, commandes, tests.
