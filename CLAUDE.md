# MAMI COOK — mémoire du projet

> Lu automatiquement par Claude Code à chaque session. Rester court : les détails sont dans `docs/`.
> En début de session : utiliser le skill **session-start**. En fin de session importante : **session-close**.

## Le projet

- **Quoi** : place de marché de plats faits maison. Des cuisinières et cuisiniers de quartier vendent leurs plats, en retrait, en livraison par eux-mêmes ou par un livreur MAMI COOK.
- **Pour qui** : clients, cuisinières/cuisiniers, livreurs, équipe (admin, modération, support).
- **Modèle économique** : majoration de 20 % payée par le client sur le prix de la cuisinière, plus une commission sur les frais de livraison des livreurs. Taux réglables par pays (table `countries`).
- **Livrables** : site web, applis iOS et Android, back-office. 10 langues.
- Origine : un prototype Lovable (« Home Plate Kitchens ») abandonné le 29/10/2026. **Tout se fait ici, plus rien dans Lovable.**

Pour en savoir plus : [vision](docs/PROJECT_OVERVIEW.md), [cahier des charges](docs/REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [décisions](docs/DECISIONS.md).

## État et tâches (chargés automatiquement)

@docs/CURRENT_STATUS.md
@docs/TASKS.md

## Technologies

Monorepo pnpm 10.28 (mode isolé), Node 22.

| Dossier | Contenu |
| --- | --- |
| `apps/web` | React 19.3, Vite 5, Tailwind 3, react-router 6, TanStack Query 5, Leaflet, PWA. **Mode démo** si les variables `VITE_SUPABASE_*` sont absentes |
| `apps/mobile` | Expo SDK 58, React Native 0.88.1, expo-router (`src/app`), Stripe PaymentSheet, notifications push |
| `packages/shared` | Prix (`pricing.ts`), schémas zod, types, i18n (`t()`), données de démo |
| `supabase/migrations` | PostgreSQL + PostGIS : schéma, RLS, logique métier en fonctions SQL, pg_cron |
| `supabase/functions` | Fonctions Edge Deno : Stripe (checkout, webhook, Connect, versements), push, suppression de compte |
| `supabase/tests` | Tests de sécurité SQL (`run.sh` lance un Postgres 16 local) |
| `scripts/` | Outils i18n et contrôle des docs (`check-docs.sh`) |

## Commandes

```bash
pnpm install                              # dépendances
pnpm dev                                  # site sur http://localhost:8080 (mode démo)
pnpm --filter @mami/shared test           # tests prix
bash supabase/tests/run.sh                # tests base de données (Postgres 16 + PostGIS requis)
pnpm --filter @mami/web typecheck && pnpm --filter @mami/web lint && pnpm --filter @mami/web build
pnpm --filter @mami/web test:e2e          # tests navigateur (Playwright)
node scripts/i18n-keys.cjs --missing      # traductions complètes ?
bash scripts/check-docs.sh                # cohérence de la documentation
```

Mobile : `cd apps/mobile && EXPO_OFFLINE=1 npx tsc --noEmit && npx expo lint`.

## Règles du projet (à respecter)

- **Sécurité d'abord.** RLS sur toutes les tables. Toute écriture sensible (commande, statut, paiement, livraison) passe par une fonction `SECURITY DEFINER` avec `set search_path = ''` qui revérifie `auth.uid()`. Le serveur recalcule tous les prix.
- **Aucun secret** dans le code, le frontend ou Git : seulement des clés publiques (`anon`, `pk_`). Les secrets vont dans `supabase secrets` ou dans les variables de l'hébergeur.
- Les adresses exactes des cuisinières restent privées (position publique floutée à environ 400 m).
- **i18n** : le texte français sert de clé, `t("…")`. Une nouvelle clé s'ajoute **à la fin** de `scripts/i18n-src/keys.json` (ne jamais trier), avec sa traduction dans les 9 fichiers `scripts/i18n-src/<langue>.txt`.
- Toute modification de migration se teste avec `bash supabase/tests/run.sh` avant d'être commitée.
- Les migrations sont encore modifiées sur place, car **rien n'est déployé**. Après la première mise en production, ne plus modifier une migration existante : en créer une nouvelle.
- Aucun nom ni identifiant de modèle d'IA dans le code, les commits ou les docs.
- Commits en français.

## Préférences de travail de l'utilisateur

(Copie de la mémoire globale, voir `docs/claude-global/CLAUDE.md`.)

- L'utilisateur n'est pas informaticien : expliquer simplement, en français, étape par étape.
- **Tout écrire en français**, sans exception : réponses, messages intermédiaires pendant le travail, descriptions des commandes et des outils (l'utilisateur voit tout dans Claude Code et ne lit pas l'anglais).
- Ne jamais dire qu'une fonctionnalité marche sans l'avoir réellement testée ; donner la preuve (commande et résultat).
- Ne pas supprimer de fonctionnalité sans son accord. Ne pas reconstruire ce qui fonctionne déjà.
- Enregistrer les décisions importantes (`docs/DECISIONS.md`) et tenir la documentation à jour.
- Demander confirmation avant toute action destructrice ou publique (suppression, push forcé, déploiement).

## Environnement

Les sessions tournent dans un **conteneur cloud éphémère** : tout ce qui n'est pas commité **et poussé** est perdu à la fin de la session. Dépôt : https://github.com/thanhly260287-dot/mami-cook (branche `main`). Toujours `git push` après un commit.
