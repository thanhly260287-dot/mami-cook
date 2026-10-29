# MAMI COOK

**Manger comme à la maison, partout.** Une place de marché où les cuisinières et cuisiniers de quartier vendent leurs plats faits maison, en retrait ou en livraison.

Le projet comprend :

| Dossier | Contenu |
| --- | --- |
| `apps/web` | Site web (React 19, Vite, Tailwind) — clients, espace cuisinier, administration |
| `apps/mobile` | Applis iOS et Android (Expo / React Native) |
| `packages/shared` | Code commun : calcul des prix, validation, types, **traductions (10 langues)**, données de démo |
| `supabase/` | Base de données PostgreSQL + PostGIS, règles de sécurité, logique métier, fonctions serveur (Stripe, notifications, RGPD) |
| `docs/` | Guides : [mise en ligne](docs/DEPLOIEMENT.md), [sécurité](docs/SECURITE.md), [architecture](docs/ARCHITECTURE.md) |

![Accueil](docs/captures/site-accueil.png)

## Fonctionnalités

**Clients** : recherche par position, carte, filtres (cuisine, régime, température, jour, rayon), fiche plat avec les 14 allergènes réglementaires, suppléments et menus, panier, paiement Stripe (carte, Apple Pay, Google Pay), suivi de commande en temps réel, code de retrait, messagerie avec la cuisinière, avis, favoris, notifications push, signalements.

**Cuisiniers** : candidature avec engagements d'hygiène, plats (photos, allergènes, suppléments, menus), ventes programmées avec stock limité, gestion des commandes (accepter, préparer, remettre avec le code du client), tableau de bord des revenus, versements automatiques via Stripe Connect, réponses aux avis.

**Plateforme** : modération (validation des cuisines, signalements, suspension), remises automatiques par volume, codes promo, export et suppression des données (RGPD), 10 langues (FR, EN, ES, PT, IT, DE, AR avec mise en page de droite à gauche, ZH, VI, TR), mode sombre, appli web installable (PWA).

## Démarrer en local (mode démo)

Sans aucune configuration, le site et l'appli démarrent en **mode démo** avec des données d'exemple.

```bash
pnpm install
```

```bash
pnpm dev
```

Le site est sur http://localhost:8080. Pour l'appli mobile :

```bash
pnpm dev:mobile
```

## Tests

```bash
pnpm test
```

```bash
pnpm test:db
```

```bash
pnpm --filter @mami/web test:e2e
```

- `pnpm test` : calcul des prix et validation.
- `pnpm test:db` : plus de 50 tests de sécurité de la base (nécessite PostgreSQL 16 + PostGIS).
- `test:e2e` : parcours complets dans un navigateur, ordinateur et mobile.

## Mise en ligne

Suivez [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) : Supabase, Stripe, hébergement du site, publication sur l'App Store et Google Play.
