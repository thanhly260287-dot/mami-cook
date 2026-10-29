#!/usr/bin/env bash
# Hook PreCompact : enregistre l'état Git et les tâches en cours avant la compression du contexte.
# Écrit uniquement dans .claude/state/ (ignoré par Git). Ne copie pas la conversation (risque de secrets).
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0
input=$(cat)
trigger=$(printf '%s' "$input" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("trigger","?"))
except Exception: print("?")' 2>/dev/null)
mkdir -p .claude/state
f=".claude/state/precompact-$(date +%Y%m%d-%H%M%S).md"
{
  echo "# Instantané avant compression ($(date '+%Y-%m-%d %H:%M'), déclenchement : $trigger)"
  echo
  echo "Branche : $(git branch --show-current 2>/dev/null)"
  echo
  echo "## Derniers commits"; git log --oneline -5 2>/dev/null
  echo; echo "## Fichiers modifiés non commités"; git status --short 2>/dev/null
  echo; echo "## Résumé des différences"; git diff --stat 2>/dev/null | tail -30
  echo; echo "## Tâches en cours (docs/TASKS.md)"
  awk '/^## En cours/{f=1;next} /^## /{f=0} f' docs/TASKS.md 2>/dev/null
} > "$f"
echo "Instantané enregistré : $f. Après la compression, mettre à jour docs/TASKS.md et docs/SESSION_LOG.md si nécessaire."
exit 0
