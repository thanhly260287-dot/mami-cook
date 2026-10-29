---
name: safe-development
description: Liste de contrôle à suivre AVANT un changement important ou risqué (migration de base de données, paiements, sécurité, suppression, refonte, dépendances, déploiement, push, opérations Git qui réécrivent l'historique).
---

# Développement sûr

## Avant de commencer

1. **Point de retour** : le travail actuel est-il commité ? Si non, commiter ou créer une branche (`git switch -c <sujet>`). Noter le hash de départ.
2. **Portée** : quels fichiers, tables, fonctions ou écrans sont touchés ? Une fonctionnalité existante risque-t-elle de disparaître ? Si oui, **demander l'accord de l'utilisateur**.
3. **Secrets** : aucune clé secrète dans le code, le frontend, les docs ou les commits. Seules les clés publiques (`anon`, `pk_`) vont côté client. Les secrets vont dans `supabase secrets set` ou dans les variables de l'hébergeur.
4. **Base de données** :
   - toute nouvelle table a la RLS activée, des policies et des triggers de protection pour les champs sensibles ;
   - les fonctions sont en `security definer` avec `set search_path = ''`, revérifient `auth.uid()` et ont des `revoke` et `grant` explicites ;
   - avant la mise en production : on peut modifier les migrations existantes ;
   - après la mise en production : **nouvelle migration uniquement**, jamais de `drop` de données sans sauvegarde.
5. **Argent** : les montants sont recalculés côté serveur, les opérations sont idempotentes et le webhook est signé. Tester les cas d'attaque : montant modifié, double clic, accès aux données d'autrui.
6. **Permissions** : qui peut appeler quoi (anonyme, connecté, cuisinière, livreur, admin) ? Ajouter un test SQL pour chaque refus attendu.

## Pendant

- Petites étapes, avec un test après chacune : `bash supabase/tests/run.sh`, typecheck, lint, E2E.
- Ne pas désactiver un test pour le faire passer.

## Confirmation obligatoire de l'utilisateur

Demander **avant** de :
- supprimer des fichiers, des données, des tables, des colonnes, une branche ou un artifact ;
- lancer `git push --force`, `git reset --hard`, réécrire l'historique (rebase de commits publiés) ;
- déployer, publier sur les stores, toucher à la production ou aux clés live ;
- envoyer des e-mails ou des messages, créer des dépôts ou des comptes ;
- installer un serveur MCP ou un service tiers qui reçoit des données.

## Revenir en arrière

| Situation | Commande |
| --- | --- |
| Fichier pas encore commité | `git restore <fichier>`, après avoir vérifié son contenu |
| Commit | `git revert <hash>` (ne réécrit pas l'historique) |
| Base de production | Point-in-Time Recovery de Supabase |

## Après

Mettre à jour la mémoire avec le skill `project-memory` : décision, bug, test.
