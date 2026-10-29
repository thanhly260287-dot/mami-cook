# État actuel du projet

**Dernière vérification : 2026-10-29** (session cloud, voir [SESSION_LOG.md](SESSION_LOG.md))

## En bref

- Le site, les applis iOS et Android, la base de données et les paiements sont écrits et testés **en local, en mode démo**.
- **Rien n'est encore en ligne** : pas de projet Supabase, d'hébergement ni de publication sur les stores ; le compte Stripe existe mais n'est pas branché. La procédure est dans [DEPLOIEMENT.md](DEPLOIEMENT.md).
- **Livraison par livreurs** : partie serveur terminée et testée (120 tests SQL). **Les écrans (espace livreur, choix du livreur au panier, back-office) restent à faire** (#11).
- **Stripe** : compte de l'utilisateur fourni (`acct_1UNYJHArjF3GfFcv`), mais **pas encore branché**. Il faut d'abord le projet Supabase et l'hébergement, voir [TASKS.md](TASKS.md) #14.

## Ce qui fonctionne (vérifié le 29/10/2026)

Voir [TESTS.md](TESTS.md) pour les commandes et les résultats.

| Partie | Preuve |
| --- | --- |
| Base de données : sécurité, commandes, stock, paiements, livraison, commissions | 120 tests SQL au vert (`bash supabase/tests/run.sh`) |
| Calcul des prix | 6 tests au vert (`pnpm --filter @mami/shared test`) |
| Site web | Typecheck, lint et build OK ; 16 tests navigateur au vert |
| Applis mobiles | Typecheck et lint OK ; bundles iOS et Android exportés (`expo export`) |
| Fonctions serveur Stripe | `deno check` OK (pas de test réel avec Stripe) |
| Traductions | 10 langues complètes (`node scripts/i18n-keys.cjs --missing`) |
| Aperçu en ligne du site (démo) | https://claude.ai/artifact/Qb8Cw4VCfGKUv2T65ikACR |

## Ce qui n'est pas vérifié

- Paiements Stripe réels (aucune clé configurée).
- Applis sur un vrai téléphone (seule la compilation des bundles a été faite).
- Notifications push réelles et envoi d'e-mails.
- Montée en charge : non mesurée, seulement prévue dans la conception.

## Blocages

| Blocage | Conséquence | Qui peut le lever |
| --- | --- | --- |
| **Le dépôt GitHub `mami-cook` n'est pas visible** (seuls `organiz` et `organiz-life` apparaissent) ; le jeton `gh` du conteneur est invalide | **Aucune sauvegarde en ligne du code.** Il n'existe que dans ce conteneur et dans les zip envoyés | L'utilisateur : suivre [GITHUB.md](GITHUB.md) |
| Le réseau du conteneur refuse `images.unsplash.com` | Pas de vraies photos de plats (illustrations générées à la place) | L'utilisateur : autoriser ce domaine dans les réglages réseau de l'environnement |
| Le registre Docker est refusé | Impossible de lancer Supabase en local ; les tests SQL utilisent un Postgres 16 installé à part | Sans gravité |

## Mémoire et outils

- Mémoire du projet : `CLAUDE.md` et ce dossier `docs/`.
- Skills : `.claude/skills/`. Hooks : `.claude/settings.json`.
- Mémoire globale : `~/.claude/CLAUDE.md`, installée par `scripts/install-global-memory.sh`. Le conteneur étant éphémère, elle doit être **réinstallée à chaque session**.
- Aucun serveur MCP configuré. GitHub passe par l'appli Claude de claude.ai. Google Drive ou Notion seront ajoutés seulement si l'utilisateur y range ses documents.
