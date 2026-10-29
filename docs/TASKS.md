# Tâches

Une tâche ne passe en « Terminées » qu'avec une preuve (test ou commit). Les numéros sont ceux utilisés dans les sessions.

## En cours

### #10 — Livraison par livreurs, livreurs payés, commissions

Fait (non commité, **non testé**) :
- `supabase/migrations/20261029000001_schema.sql` :
  - enums `fulfillment` (avec `courier`), `delivery_status`, `business_status` ;
  - table `countries` (devise, taux, frais de livraison, `courier_mode`) ;
  - `cooks.country`, `is_professional` et `offers_courier` ; champs DSA/DAC7 dans `cook_private` ;
  - `orders.tip_cents` et `courier_payout_cents` ;
  - `payouts` pour une cuisinière **ou** un livreur ;
  - tables `couriers`, `courier_private`, `deliveries` et `delivery_declines` ; `reviews.courier_rating`.
- Les réglages `service_rate`, `min_order_cents` et `payout_delay_hours` ne sont plus dans `platform_settings` : ils passent dans `countries`.
- `supabase/migrations/20261029000002_security.sql` : RLS, triggers de protection des livreurs, note moyenne des livreurs, policy des versements pour les livreurs.

Reste à faire :
1. Nouvelle migration `20261029000006_delivery.sql` :
   - `place_order` : nouvelle signature avec `p_tip_cents` ; taux, minimum et devise selon le pays ; mode `courier` avec frais = base + km, bornés ; part livreur = frais × (1 − commission) + pourboire ; création de la ligne `deliveries`.
   - `transition_order` : à l'acceptation, recherche d'un livreur et notification des livreurs proches ; la cuisinière ne termine pas elle-même une commande `courier` ; une annulation annule la course et dédommage le livreur s'il était déjà sur place.
   - `feed` : devise et taux du pays, `offers_courier` et `is_professional`.
   - Versements : délai pris dans `countries` ; `on conflict` avec index partiel.
   - Fonctions livreur : `courier_set_online`, `available_deliveries`, `accept_delivery`, `decline_delivery`, `delivery_step` (`at_pickup`, `picked_up`, `delivered` avec le code du client), `courier_cancel`, `delivery_details`, `courier_dashboard`.
   - `delivery_tracking` (client), `delivery_quote` (panier), `review_courier_application`, `dac7_report`, `platform_stats`.
   - Tâches cron : relance de la recherche après 20 min, passage hors ligne après 10 min d'inactivité.
2. Mettre à jour `seed.sql`, puis tester le parcours livreur dans `supabase/tests/test_security_and_orders.sql` jusqu'au vert.
3. Fonctions Edge :
   - `checkout` : devise et pourboire ;
   - `process-payouts` : versements aux livreurs ;
   - `connect-onboarding` : rôle livreur ;
   - `stripe-webhook` : `account.updated` pour les livreurs.
4. `packages/shared` : `FULFILLMENTS` avec `courier`, `formatMoney` multi-devises.

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
| 13 | Système de mémoire permanente | Ce dossier, `.claude/` ; vérifications dans [TESTS.md](TESTS.md) |
