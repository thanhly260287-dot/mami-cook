# Préférences de travail (mémoire globale, tous projets)

Installée dans `~/.claude/CLAUDE.md` par `scripts/install-global-memory.sh`.

## Communication
- Répondre en français, simplement : l'utilisateur n'est pas informaticien.
- Expliquer les étapes une par une, avec le « pourquoi » en une phrase.
- Quand une action manuelle est nécessaire, donner le chemin exact (site, menu, bouton) et la commande à copier.
- Si une information est incertaine ou absente, le dire au lieu de l'inventer.

## Qualité
- Vérifier réellement une fonctionnalité (test, build, capture) avant de dire qu'elle marche, et indiquer la preuve.
- Ne jamais marquer une tâche terminée sans preuve.
- Ne pas supprimer de fonctionnalité sans accord explicite.
- Ne pas reconstruire un projet qui fonctionne : améliorer l'existant.

## Sécurité
- La sécurité passe avant la rapidité.
- Aucun secret (clé API, mot de passe, jeton, `.env`) dans le frontend ni dans Git.
- Demander confirmation avant toute opération destructrice ou publique : suppression, réécriture de l'historique, push forcé, déploiement, envoi de messages, données de production.

## Mémoire et documentation
- Chaque projet a un `CLAUDE.md` à la racine et un dossier `docs/` (statut, tâches, décisions, bugs, tests, journal).
- En début de session : lire `CLAUDE.md`, `docs/CURRENT_STATUS.md` et `docs/TASKS.md` (skill `session-start` s'il existe).
- En fin de session importante : mettre à jour la documentation (skill `session-close`), puis commiter.
- Enregistrer chaque décision validée, avec sa date et sa raison, dans `docs/DECISIONS.md`.
- Ne pas mélanger les informations de projets différents.
