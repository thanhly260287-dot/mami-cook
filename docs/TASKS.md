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
- **Photos générées par IA (Nano Banana)**, facultatif : prêt (`scripts/generate-images.mjs`, fonction `ai-image`), il manque la clé `GEMINI_API_KEY`.
- **Mise en ligne Supabase** : projet créé par l'utilisateur (`dxemjkfvaofijqptubfh`). Le déploiement automatique est prêt (`.github/workflows/deploy-supabase.yml`) ; il attend 2 secrets GitHub : `SUPABASE_ACCESS_TOKEN` et `SUPABASE_DB_PASSWORD`. Après déploiement, lire le rapport sur la branche `deploy-status` (`git fetch origin deploy-status && git show origin/deploy-status:STATUS.md`).
- **Mise en ligne du site et des applis** : Vercel (le build utilise `--mode supabase`), puis EAS (voir [DEPLOIEMENT.md](DEPLOIEMENT.md)).
- **Avant le lancement** :
  - relecture des documents juridiques par un avocat et compléter les champs entre crochets ;
  - trouver une agence partenaire en Suisse ;
  - choisir un médiateur de la consommation.
- **Justificatifs (#16), reste à faire** : dépôt des documents directement dans l'appli mobile (aujourd'hui via le site) ; écran testé seulement par typecheck, pas encore avec une vraie base ; liste des documents par pays à faire valider par un juriste.
- **Bannière d'accueil** : l'utilisateur veut idéalement une maman de ~40 ans, style italien/espagnol, qui cuisine des **spaghettis**. Pas de photo libre trouvée. Options : clé Pexels (secret GitHub `PEXELS_API_KEY`) ou image générée (clé `GEMINI_API_KEY`).
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
| 8 | Vraies photos des 12 plats de démo (Wikimedia Commons, licences libres, crédits affichés dans les mentions légales) | Commit `c40d068`, vérification visuelle des 12 photos, 22 tests E2E |
| 16 | Justificatifs légaux obligatoires par pays (vérification avant validation, expiration, livreurs selon le véhicule) | Commit `4fbb98e` ; 162 vérifications SQL, 22 E2E, typecheck/lint web et mobile, i18n 1191/1191 |
| 17 | Tableau de bord v2 : ventes, commandes, panier moyen, commissions plats / livraison, plats et desserts vendus, top ventes et vendeurs, installations iOS / Android ; visible en démo | 169 vérifications SQL, 24 E2E, typecheck/lint web et mobile, i18n 1215/1215, capture d'écran |
| 18 | Filtre par ville du tableau de bord (ventes, commandes, vendeurs, plats, livreurs) + classement des villes | 174 vérifications SQL, 24 E2E (filtre Lyon), i18n 1219/1219, capture d'écran |
| 19 | Accueil : bannière plein écran, photo lumineuse d'une maman souriante en cuisine moderne, titre et texte dessus (téléphone : photo en haut, texte dessous) | 24 E2E, captures ordinateur et téléphone, i18n 1221/1221 |
| 20 | Carrousel de 4 photos sur l'accueil (fondu, points, pause au survol, accessibilité) | 26 E2E (dont carrousel), captures des 4 photos ordinateur et téléphone |
| 21 | Animations modernes site (framer-motion, `components/motion.tsx`) et appli (Animated, `components/motion.tsx`), respect de « réduire les animations » | 26 E2E, 0 élément resté invisible après défilement, typecheck/lint web et mobile, export iOS/Android, i18n 1222/1222 |
| 22 | Ingrédients obligatoires, saveurs, conservation/réchauffage (base, formulaire, fiche plat site et appli, 12 plats d'exemple) | 178 vérifications SQL, 26 E2E (fiche plat), typecheck/lint web et mobile, i18n 1244/1244 |
| 13 | Système de mémoire permanente | Ce dossier, `.claude/` ; vérifications dans [TESTS.md](TESTS.md) |
