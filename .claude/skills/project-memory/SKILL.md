---
name: project-memory
description: Lire ou mettre à jour la mémoire du projet (CLAUDE.md et docs/). À utiliser avant de répondre à « où en est-on », avant de modifier une décision, et chaque fois qu'une décision, un bug, un test ou une tâche doit être enregistré.
---

# Mémoire du projet

La mémoire de référence est **dans le dépôt**. Le conteneur cloud est effacé à chaque session, la mémoire native de Claude aussi.

## Quel fichier sert à quoi

| Fichier | Contenu | Quand l'écrire |
| --- | --- | --- |
| `CLAUDE.md` | Résumé court : projet, stack, commandes, règles. Chargé automatiquement | Seulement si une règle, une commande ou la stack change |
| `docs/PROJECT_OVERVIEW.md` | Vision, utilisateurs, modèle économique | Rarement |
| `docs/REQUIREMENTS.md` | Demandes de l'utilisateur (citées et datées) et statut de chaque fonctionnalité | Nouvelle demande ; fonctionnalité terminée |
| `docs/ARCHITECTURE.md` | Technique : tables, flux, montée en charge | Nouvelle table, nouveau flux, nouveau service |
| `docs/DECISIONS.md` | Décisions avec date et raison ; validées, techniques ou provisoires | Dès qu'une décision est prise |
| `docs/CURRENT_STATUS.md` | Ce qui marche vraiment (avec preuve), ce qui n'est pas vérifié, blocages | En fin de session ou après des tests |
| `docs/TASKS.md` | En cours, à faire, terminées (avec preuve) | Début et fin de tâche |
| `docs/BUGS_AND_SOLUTIONS.md` | Symptôme → cause → solution | Après chaque problème résolu qui a coûté du temps |
| `docs/TESTS.md` | Commandes de test, derniers résultats, tests manquants | Après chaque exécution de tests importante |
| `docs/CHANGELOG.md` | Changements importants par commit | À chaque commit notable |
| `docs/SESSION_LOG.md` | Une entrée par session : demandes, réalisé, arrêt, suite | En fin de session |
| `docs/LEGAL_RESEARCH.md` | Recherche juridique par pays | Nouvelle recherche juridique |
| `docs/SECURITE.md`, `docs/DEPLOIEMENT.md` | Guides de sécurité et de mise en ligne | Quand le sujet change |

## Règles

1. **Lire avant d'écrire.** Ouvrir le fichier, vérifier ce qui existe, puis modifier le passage concerné. Ne jamais réécrire un fichier entier sans raison.
2. **Ne jamais inventer.** Une décision absente reste absente : la noter dans « Provisoires / à confirmer » de `DECISIONS.md` et poser la question à l'utilisateur.
3. **Distinguer** ce que l'utilisateur a validé de ce que Claude a choisi (« Technique »).
4. **Dater** chaque entrée (AAAA-MM-JJ ou JJ/MM/AAAA, comme dans le fichier).
5. **Prouver** : « fait » seulement avec une commande de test et son résultat, ou un hash de commit.
6. **Pas de doublon** : écrire l'information à un seul endroit et mettre un lien relatif depuis les autres.
7. **Aucun secret** dans les docs (clés, mots de passe, jetons, données personnelles).
8. Après modification : `bash scripts/check-docs.sh`, puis commit ciblé, par exemple `git add docs CLAUDE.md && git commit -m "Docs : …"`.
