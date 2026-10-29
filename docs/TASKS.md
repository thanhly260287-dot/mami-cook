# Tâches

Une tâche ne passe en « Terminées » qu'avec une preuve (test ou commit). Les numéros sont ceux utilisés dans les sessions.

## En cours

### #10 — Livraison par livreurs, livreurs payés, commissions

**Partie serveur terminée et testée** le 29/10/2026 (`bash supabase/tests/run.sh` : 120 vérifications au vert, dont la suite `test_delivery.sql`) :
- tables `countries`, `couriers`, `courier_private`, `deliveries` et `delivery_declines`, avec RLS et protections ;
- migration `20261029000006_delivery.sql` :
  - `place_order` v2 : pourboire, taux et devise du pays, livreur ;
  - `transition_order` v2 ;
  - `feed` v2 : devise, livreur, badge professionnel ;
  - fonctions livreur : mise en ligne, courses disponibles, accepter, refuser, étapes, désistement, détails, suivi, tableau de bord ;
  - `delivery_quote`, `review_courier_application`, `dac7_report`, `platform_stats` ;
  - relances par cron ;
- fonctions Edge (`deno check` OK) :
  - `checkout` : devise et pourboire ;
  - `process-payouts` : livreurs et dédommagements ;
  - `connect-onboarding` : `role: "courier"` ;
  - `stripe-webhook` : comptes livreurs ;
  - `delete-account` : livreurs ;
- `packages/shared` : `FULFILLMENTS` avec `courier`, `formatMoney`, `TIP_PRESETS_CENTS`, `tipCents` dans `checkoutSchema`.

Reste pour #10 : données de démo livreurs dans `seed.sql`. Les écrans font partie de #11.

**Attention (#11)** : les écrans cuisinière ne gèrent pas encore le mode `courier`. Les boutons « Partir en livraison » et « Livrée » doivent être masqués pour ces commandes : `apps/web/src/pages/cook/Orders.tsx` et `apps/mobile/src/app/cuisinier/index.tsx`. Le serveur refuse déjà ces actions.

## À faire

- **#11 — Pages**
  - Espace livreur (web et mobile).
  - Option « livreur MAMI » avec pourboire et suivi en direct pour le client.
  - Back-office complet : indicateurs, utilisateurs, livreurs, remboursements, codes promo, taux par pays, versements, export DAC7.
  - Informations DSA/DAC7 à l'inscription des cuisinières et badge professionnel / particulier.
  - Reçus et factures ; choix du pays et de la devise.
  - Traduire les nouveaux textes dans les 9 langues.
- **#12 — Documents juridiques**
  - CGU, CGV, conditions vendeurs (P2B), conditions livreurs, confidentialité, cookies, mentions légales, modération (DSA), transparence du classement, remboursements, charte d'hygiène.
  - Guide légal par pays dans l'appli, affiché à l'inscription.
  - Base de travail : [LEGAL_RESEARCH.md](LEGAL_RESEARCH.md). Relecture par un juriste obligatoire.
- **#14 — Stripe en conditions réelles** (demande du 29/10/2026) : le code de paiement existe ; il faut que l'utilisateur crée le compte Stripe et active Connect, puis tester un paiement en mode test de bout en bout. Le versement aux livreurs fait partie de #10.
- **#6 — Publication du code** : pousser sur GitHub dès que le dépôt existe ; republier l'aperçu ; envoyer un nouveau zip.
- **#8 — Vraies photos** : en attente de l'autorisation réseau de `images.unsplash.com`.

## Terminées (avec preuve)

| # | Tâche | Preuve |
| --- | --- | --- |
| 1 | Monorepo et package partagé | Commit `ebd3a29` et suivants ; tests shared OK |
| 2 | Schéma Supabase, RLS, fonctions, tests | Commit `ebd3a29` ; tests SQL OK |
| 3 | Fonctions Edge Stripe Connect et webhooks | Commit `8ebf48a` ; `deno check` OK |
| 4 | Site web, toutes les pages | Commit `3273596` ; tests E2E OK |
| 5 | Appli mobile Expo | Commit `f669d8c` ; export iOS et Android OK |
| 7 | Traduction en 10 langues | Commit `c5cd31f` ; `i18n-keys --missing` OK |
| 9 | Recherche juridique par pays | [LEGAL_RESEARCH.md](LEGAL_RESEARCH.md) |
| 10 | Livraison : partie serveur (base, Stripe, shared) | Tests SQL 120 ✓, `deno check` OK, typecheck web et mobile OK |
| 13 | Système de mémoire permanente | Ce dossier, `.claude/` ; vérifications dans [TESTS.md](TESTS.md) |
