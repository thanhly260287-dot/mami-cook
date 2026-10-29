---
name: session-start
description: Reprendre le travail au début d'une session (ou après une longue pause, ou quand l'utilisateur demande « où en est-on ? »). Lit la mémoire du projet et Git, puis résume l'état et propose la prochaine action.
---

# Début de session

Ne rien modifier pendant ces étapes : c'est une lecture.

1. **Mémoire globale** : si `~/.claude/CLAUDE.md` est absent (conteneur neuf), lancer `bash scripts/install-global-memory.sh`. Le script est sans risque : il sauvegarde un fichier existant avant de le remplacer.
2. **Lire** `CLAUDE.md`, `docs/CURRENT_STATUS.md` et `docs/TASKS.md`, puis la dernière entrée de `docs/SESSION_LOG.md`.
3. **Git** :
   ```bash
   git log --oneline -10
   git status --short
   git diff --stat
   git remote -v
   ```
   Du travail non commité est-il décrit dans `TASKS.md` (section « En cours ») ? Sinon, le signaler.
   Si `git remote -v` est vide : rappeler que le code n'est sauvegardé nulle part en ligne.
4. **Instantanés** : s'il existe des fichiers dans `.claude/state/` (créés avant une compression du contexte), lire le plus récent.
5. **Problèmes en cours** : section « Blocages » de `CURRENT_STATUS.md`, et `docs/BUGS_AND_SOLUTIONS.md` si le travail touche un sujet déjà rencontré.
6. **Optionnel, si le temps le permet** : vérifier que l'état décrit est toujours vrai, avec un test rapide (`pnpm --filter @mami/shared test`, `node scripts/i18n-keys.cjs --missing`). Les tests SQL et E2E prennent plus de temps : seulement s'ils sont utiles.

## Réponse à donner à l'utilisateur (en français simple)

Répondre à ces 7 questions en quelques lignes chacune. Écrire « inconnu » ou « non vérifié » si l'information manque, sans jamais inventer.

1. Quel est l'objectif du projet ?
2. Où en sommes-nous ?
3. Qu'avons-nous déjà réalisé ?
4. Quelles décisions ont été prises ? (les principales, avec un lien vers `DECISIONS.md`)
5. Quels problèmes restent à résoudre ?
6. Qu'est-ce qui fonctionne réellement ? (avec la preuve)
7. Quelle est la prochaine étape ? Proposer **une** action concrète et demander si l'utilisateur veut la lancer.
