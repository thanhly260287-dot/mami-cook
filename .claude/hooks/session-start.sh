#!/usr/bin/env bash
# Hook SessionStart : affiche un résumé de reprise (lecture seule).
# Seule écriture possible : installer ~/.claude/CLAUDE.md s'il est absent (conteneur neuf).
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0

if [ ! -f "$HOME/.claude/CLAUDE.md" ] && [ -f docs/claude-global/CLAUDE.md ]; then
  mkdir -p "$HOME/.claude" && cp docs/claude-global/CLAUDE.md "$HOME/.claude/CLAUDE.md" \
    && echo "Mémoire globale installée dans ~/.claude/CLAUDE.md (conteneur neuf)."
fi

echo "=== Reprise MAMI COOK — lancer le skill session-start pour le résumé complet ==="
grep -m1 "Dernière vérification" docs/CURRENT_STATUS.md 2>/dev/null
echo
echo "--- Tâches en cours (docs/TASKS.md) ---"
awk '/^## En cours/{f=1;next} /^## /{f=0} f && /^### /' docs/TASKS.md 2>/dev/null
echo
echo "--- 5 derniers commits ---"
git log --oneline -5 2>/dev/null
changes=$(git status --porcelain 2>/dev/null)
if [ -n "$changes" ]; then
  echo
  echo "--- Modifications NON commitées ($(echo "$changes" | wc -l) fichiers) ---"
  echo "$changes" | head -20
fi
if [ -z "$(git remote 2>/dev/null)" ]; then
  echo
  echo "ATTENTION : aucun dépôt distant. Le code n'est sauvegardé nulle part en ligne (voir docs/CURRENT_STATUS.md, Blocages)."
fi
latest=$(ls -t .claude/state/precompact-*.md 2>/dev/null | head -1)
[ -n "$latest" ] && echo && echo "Dernier instantané avant compression : $latest"
exit 0
