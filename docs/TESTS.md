# Tests

## Suites de tests

| Suite | Commande | Contenu |
| --- | --- | --- |
| Prix | `pnpm --filter @mami/shared test` | 6 tests : majoration, remises volume, menus, minimum |
| Base de données | `bash supabase/tests/run.sh` | 120 vérifications (2 fichiers, une base neuve chacun) ; `test_delivery.sql` : livreurs, commissions, pourboire, CHF, DAC7. `test_security_and_orders.sql` : : lecture des données d'autrui, auto-promotion admin, commande à 0 €, survente, faux paiement, transitions de statut, flux d'accueil (12 plats de démo). Nécessite PostgreSQL 16 et PostGIS (`apt install postgresql-16-postgis-3`) |
| Site | `pnpm --filter @mami/web typecheck && pnpm --filter @mami/web lint && pnpm --filter @mami/web build` | Types, règles de code, compilation |
| Navigateur | `pnpm --filter @mami/web test:e2e` | 16 parcours en ordinateur et en mobile (locale fr-FR) : accueil, recherche, panier, limite de stock, langue… |
| Mobile | `cd apps/mobile && EXPO_OFFLINE=1 npx tsc --noEmit && npx expo lint && npx expo export --platform android --platform ios` | Types, lint, bundles |
| Fonctions Edge | `cd supabase/functions && deno check */index.ts` | Types Deno |
| Traductions | `node scripts/i18n-keys.cjs --missing` | Aucune clé manquante dans les 10 langues |
| Documentation | `bash scripts/check-docs.sh` | 10 docs présents, liens valides, date de vérification, pas de secret |

La CI GitHub (`.github/workflows/ci.yml`) lance tout cela à chaque push, plus CodeQL et gitleaks. Elle n'a **jamais tourné**, faute de dépôt distant.

## Derniers résultats

| Date | Suite | Résultat |
| --- | --- | --- |
| 29/10/2026 | SQL, shared, E2E, typecheck/lint web et mobile, export mobile, deno check, i18n | Tout au vert au commit `ed9b55e` |
| 29/10/2026 | Mémoire : `check-docs.sh`, hooks testés avec une entrée simulée, `settings.json` valide | Voir [SESSION_LOG.md](SESSION_LOG.md) |
| 29/10/2026 | SQL avec livraison (2 suites, une base neuve par suite) | **120 vérifications au vert** |
| 29/10/2026 | `deno check` des 7 fonctions Edge, typecheck shared, web et mobile, tests shared | Au vert |

## Tests à écrire

- ~~Parcours livreur complet en SQL~~ : fait (`supabase/tests/test_delivery.sql`).
- Acceptation réellement simultanée par deux connexions : à tester sous charge. Le verrou `for update` est en place.
- Tests E2E de l'espace livreur et du back-office.
- Test de bout en bout avec Stripe en mode test (après création du compte).
- Test de charge (k6) après la mise en ligne.
