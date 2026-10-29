# Problèmes rencontrés et solutions

Lire avant de déboguer : beaucoup de ces pièges reviennent.

Format : **symptôme** → cause → solution.

## Outils et dépendances

- **React en double, ESLint « balanced is not a function »** → dépendances hissées par pnpm et versions de React différentes entre le site et l'appli → site passé en React 19, pnpm en mode isolé (fichier `.npmrc` supprimé), override `brace-expansion@1>balanced-match: ^1.0.2` dans `package.json`.
- **Le dépôt GitHub reste « not found »** → le dépôt n'existe pas ou l'appli Claude n'y a pas accès → voir les blocages de [CURRENT_STATUS.md](CURRENT_STATUS.md).
- **Photos et docs.expo.dev inaccessibles** → politique réseau du conteneur → illustrations générées ; vérifier les API Expo avec `tsc` plutôt que sur la documentation en ligne.
- **`pkill -f motif` tue sa propre commande** → le motif figure dans la ligne de commande du shell → tuer par PID.

## Base de données

- **`select (f()).*` appelle la fonction plusieurs fois** dans les tests SQL → utiliser `select * from f()`.
- **Alias `day` refusé** (mot réservé) → renommer l'alias.
- **Le serveur Postgres de test refuse de démarrer en root** → `supabase/tests/run.sh` relance en tant que `postgres` (binaires dans `/usr/lib/postgresql/16/bin`, port 54329).
- **`on conflict (order_id)` ne marche plus sur `payouts`** depuis que l'unicité est partielle (cuisinière **ou** livreur) → écrire `on conflict (order_id) where cook_id is not null`.

- **Les suites de tests SQL se gênaient** (plats et profils de l'une visibles dans l'autre) → `run.sh` crée une base neuve par fichier de test.
- **Un test lu « en tant que livreur » renvoie vide** → normal : un livreur n'accède ni aux commandes ni au code du client, seulement à sa course via `delivery_details`. Faire les vérifications en tant qu'administrateur.

- **Commit parti alors qu'un test échouait** → la commande enchaînait `grep … && git commit` : le `grep` réussit même si un test échoue. Toujours vérifier le résultat du test (« ✅ Tous les tests SQL passent ») avant de commiter.
- **Le badge Pro/Particulier ne correspondait pas au test** → il est calculé automatiquement depuis le statut déclaré dans `cook_private` (déclencheur `sync_cook_professional`).

## Site web

- **Routes du SPA en 404** sur le serveur de test statique → naviguer à l'intérieur de l'appli. L'aperçu artifact utilise le hash router (`VITE_HASH_ROUTER=1`).
- **Test E2E en échec : quantité refusée** → la démo n'a que 4 lasagnes en stock → test passé sur le ramen, et ajout d'un test dédié à la limite de stock.

## Mobile

- **Stripe React Native plante sur le web** → fichiers séparés par plateforme : `src/lib/stripe.tsx` et `stripe.web.tsx`.
- **Écarts avec l'API d'Expo SDK 58** → vérifier avec `tsc`, lancer avec `EXPO_OFFLINE=1`, importer `Tabs` depuis `expo-router/js-tabs`, utiliser le type `ColorValue`.
- **Règles de lint Expo** (`react-hooks/refs`, `purity`, `set-state-in-effect`) → clé d'idempotence gardée dans une ref ; apostrophes échappées dans le JSX.

## Traductions

- **L'outil d'enveloppement `scripts/i18n-wrap.cjs`** posait problème sur les fichiers TSX/TS, la fusion des imports, une variable `t` masquée et des faux positifs → corrigé. Toujours relancer `node scripts/i18n-keys.cjs --missing` après usage.
- **Nouvelles clés de traduction** : les ajouter **à la fin** de `keys.json`, sinon les numéros des fichiers `.txt` se décalent.
