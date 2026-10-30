# État actuel du projet

**Dernière vérification : 2026-10-29** (session cloud, voir [SESSION_LOG.md](SESSION_LOG.md))

## En bref

- Le site, les applis iOS et Android, la base de données et les paiements sont écrits et testés **en local, en mode démo**.
- **Rien n'est encore en ligne** : base Supabase pas encore installée, pas d'hébergement ni de publication sur les stores ; le compte Stripe existe mais n'est pas branché. La procédure est dans [DEPLOIEMENT.md](DEPLOIEMENT.md).
- **Fonctionnellement complet en mode démo** : clients, cuisinières (plats et desserts, statistiques, retouche photo IA), livreurs, administration, documents juridiques, 10 langues. Aperçu : https://claude.ai/artifact/Qb8Cw4VCfGKUv2T65ikACR (version 12 : bannière avec photo d'une maman qui cuisine, vraies photos des plats, tableau de bord de l'équipe sur `#/admin` avec chiffres d'exemple et filtre par ville).
- **Supabase** : projet créé (`https://dxemjkfvaofijqptubfh.supabase.co`, clé publique dans `apps/web/.env.supabase` et `apps/mobile/eas.json`). **Base pas encore installée** : il manque les secrets GitHub (voir [TASKS.md](TASKS.md)).
- **Lois par pays** : justificatifs obligatoires (ex. France : formation hygiène 14 h, déclaration DDPP, identité, assurance) vérifiés par l'équipe avant la première vente ; suspension automatique si un document expire.
- **Photos** : 12 vraies photos de plats (Wikimedia Commons, licences libres).
- **Stripe** : compte de l'utilisateur fourni (`acct_1UNYJHArjF3GfFcv`), mais **pas encore branché**. Il faut d'abord le projet Supabase et l'hébergement, voir [TASKS.md](TASKS.md) #14.

## Ce qui fonctionne (vérifié le 29/10/2026)

Voir [TESTS.md](TESTS.md) pour les commandes et les résultats.

| Partie | Preuve |
| --- | --- |
| Base de données : sécurité, commandes, stock, paiements, livraison, commissions, statistiques (tableau de bord v2, filtre par ville), installations de l'appli, quota IA, justificatifs par pays | 178 vérifications SQL au vert (`bash supabase/tests/run.sh`) |
| Calcul des prix | 6 tests au vert (`pnpm --filter @mami/shared test`) |
| Site web | Typecheck, lint et build OK ; 26 tests navigateur au vert |
| Applis mobiles | Typecheck et lint OK ; bundles iOS et Android exportés (`expo export`) |
| Fonctions serveur Stripe | `deno check` OK (pas de test réel avec Stripe) |
| Traductions | 10 langues complètes, 1244 textes (`node scripts/i18n-keys.cjs --missing`) |
| Aperçu en ligne du site (démo) | https://claude.ai/artifact/Qb8Cw4VCfGKUv2T65ikACR |

## Ce qui n'est pas vérifié

- Paiements Stripe réels (aucune clé configurée).
- Retouche photo IA réelle (pas de clé Gemini ; le réseau du conteneur bloque Google).
- Mode livreur sur un vrai téléphone (géolocalisation).
- Les textes des documents juridiques et la liste des justificatifs par pays n'ont pas été relus par un juriste.
- Écrans « Mes justificatifs » et vérification par l'équipe : compilés et contrôlés, mais pas encore essayés avec une vraie base (Supabase pas encore installée).
- Applis sur un vrai téléphone (seule la compilation des bundles a été faite).
- Notifications push réelles et envoi d'e-mails.
- Montée en charge : non mesurée, seulement prévue dans la conception.

## Blocages

| Blocage | Conséquence | Qui peut le lever |
| --- | --- | --- |
| Le réseau du conteneur bloque Supabase, Unsplash, Google | Impossible de déployer ou de tester Supabase d'ici | Contourné : déploiement et téléchargement de photos par GitHub Actions |
| Le registre Docker est refusé | Impossible de lancer Supabase en local ; les tests SQL utilisent un Postgres 16 installé à part | Sans gravité |

## Mémoire et outils

- **Code sauvegardé sur GitHub** : https://github.com/thanhly260287-dot/mami-cook (branche `main`, premier envoi le 29/10/2026, vérifié : même commit en ligne et en local).
- Mémoire du projet : `CLAUDE.md` et ce dossier `docs/`.
- Skills : `.claude/skills/`. Hooks : `.claude/settings.json`.
- Mémoire globale : `~/.claude/CLAUDE.md`, installée par `scripts/install-global-memory.sh`. Le conteneur étant éphémère, elle doit être **réinstallée à chaque session**.
- Aucun serveur MCP configuré. GitHub passe par l'appli Claude de claude.ai. Google Drive ou Notion seront ajoutés seulement si l'utilisateur y range ses documents.
