# Tâches

Une tâche ne passe en « Terminées » qu'avec une preuve (test ou commit). Les numéros sont ceux utilisés dans les sessions.

## En cours

Rien en cours : tout le travail est commité. Prochaines étapes dans « À faire ».

## À faire

- **#14 — Stripe en conditions réelles** :
  - l'utilisateur crée le projet Supabase et donne son URL et sa clé `anon`, ainsi que la clé `pk_test` Stripe ;
  - il range lui-même la clé `sk_test` dans les secrets Supabase ;
  - il active Connect Express ;
  - puis test de paiement de bout en bout.
- **#8 — Vraies photos (Nano Banana)** : `scripts/generate-images.mjs` et l'action GitHub « Générer les photos » sont prêts. Il manque une clé `GEMINI_API_KEY` (gratuite sur aistudio.google.com) ; le réseau de ce conteneur bloque Google.
- **Mise en ligne** : Supabase, Vercel, EAS (voir [DEPLOIEMENT.md](DEPLOIEMENT.md)). Ajouter le secret `GEMINI_API_KEY` pour la fonction `ai-image`.
- **Avant le lancement** :
  - relecture des documents juridiques par un avocat et compléter les champs entre crochets ;
  - trouver une agence partenaire en Suisse ;
  - choisir un médiateur de la consommation.
- **Améliorations possibles** :
  - inscription livreur directement dans l'appli (aujourd'hui via le site) ;
  - position du livreur en arrière-plan sur mobile ;
  - carte intégrée dans l'appli ;
  - données de démo des livreurs dans `seed.sql`.

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
| 10 | Livraison : serveur + écrans | Tests SQL 120 ✓, `deno check` OK, typecheck web et mobile OK |
| 11 | Écrans : espace livreur (web + mobile), panier livreur + pourboire, suivi en direct, back-office complet, statistiques, mon espace, reçu, guide légal, retouche photo IA | Commits `414b689`, `727d738` ; 22 tests E2E, typecheck/lint web et mobile, export iOS/Android |
| 12 | Documents juridiques (11 pages) | Commit `a415b65` |
| 15 | Traduction des 404 nouveaux textes dans les 9 langues | `i18n-keys --missing` : 1152/1152 partout |
| 6 | Code publié sur GitHub | `git push -u origin main` OK, `origin/main` = `4decdc4` |
| 13 | Système de mémoire permanente | Ce dossier, `.claude/` ; vérifications dans [TESTS.md](TESTS.md) |
