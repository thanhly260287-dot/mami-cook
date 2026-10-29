---
name: session-close
description: Clôturer une session de travail importante ou une grosse tâche. Met à jour toute la mémoire du projet (statut, tâches, décisions, bugs, tests, journal) à partir de preuves réelles, puis commite la documentation.
---

# Fin de session

À faire aussi avant une longue pause, quand le hook Stop le rappelle, ou quand l'utilisateur dit « on s'arrête là ».

## 1. Rassembler les faits (sans rien supposer)

```bash
git status --short
git diff --stat
git log --oneline -15
```

Relire ce qui a été fait dans la conversation : commandes de test lancées et **leurs résultats réels**.

## 2. Mettre à jour la documentation

Lire chaque fichier avant de le modifier (voir le skill `project-memory`).

| Fichier | Mise à jour |
| --- | --- |
| `docs/TASKS.md` | Déplacer en « Terminées » **uniquement** ce qui a une preuve (test au vert ou commit). Mettre à jour « En cours » avec le **détail exact de ce qui reste**, pour qu'une autre session puisse reprendre sans contexte. Ajouter les nouvelles tâches |
| `docs/CURRENT_STATUS.md` | Date de dernière vérification, ce qui fonctionne (avec preuve), ce qui n'est pas vérifié, blocages |
| `docs/DECISIONS.md` | Décisions prises pendant la session, avec date et raison ; préciser si l'utilisateur les a validées |
| `docs/BUGS_AND_SOLUTIONS.md` | Problèmes rencontrés : symptôme → cause → solution |
| `docs/TESTS.md` | Tests lancés, avec date et résultat ; tests encore à écrire |
| `docs/CHANGELOG.md` | Changements importants |
| `docs/REQUIREMENTS.md` | Nouvelles demandes de l'utilisateur, citées ; statuts des fonctionnalités |
| `docs/SESSION_LOG.md` | Nouvelle entrée **en haut** : date, demandes, réalisé (fichiers principaux modifiés), problèmes, point d'arrêt, prochaine étape |

## 3. Vérifier

```bash
bash scripts/check-docs.sh
```

## 4. Sauvegarder

1. Ne commiter le code que si ses tests passent. Du travail inachevé reste non commité ; il est décrit dans `TASKS.md`.
   Exception : si la session va se terminer (conteneur effacé), le commiter sur une branche `wip/<sujet>`, en le disant à l'utilisateur.
2. Commit de la documentation :
   ```bash
   git add CLAUDE.md docs .claude/skills .claude/settings.json .claude/hooks
   git commit -m "Docs : fin de session AAAA-MM-JJ"
   ```
3. Si `git remote -v` montre un dépôt : `git push -u origin <branche>`. Sinon, rappeler à l'utilisateur que **rien n'est sauvegardé en ligne**.

## 5. Résumé pour l'utilisateur

Cinq lignes au plus :
- ce qui a été fait ;
- ce qui est prouvé ;
- ce qui reste ;
- la prochaine étape ;
- les actions qu'il doit faire lui-même.

Ne jamais présenter une tâche comme terminée sans preuve.
