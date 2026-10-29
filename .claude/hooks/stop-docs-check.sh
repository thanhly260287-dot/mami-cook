#!/usr/bin/env bash
# Hook Stop : si du code a changé sans mise à jour de docs/TASKS.md ni de docs/CURRENT_STATUS.md,
# rappelle UNE SEULE FOIS par session de mettre la mémoire à jour.
# Anti-boucle : stop_hook_active + fichier témoin par session. Aucune commande destructrice.
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0
input=$(cat)
read -r active session < <(printf '%s' "$input" | python3 -c 'import json,sys
try: d=json.load(sys.stdin)
except Exception: d={}
print(str(d.get("stop_hook_active",False)).lower(), d.get("session_id","inconnue"))' 2>/dev/null)
[ "$active" = "true" ] && exit 0

changed=$(git status --porcelain 2>/dev/null | awk '{print $NF}')
[ -z "$changed" ] && exit 0
code=$(echo "$changed" | grep -vE '^(docs/|CLAUDE\.md|\.claude/)' || true)
[ -z "$code" ] && exit 0
echo "$changed" | grep -qE '^docs/(TASKS|CURRENT_STATUS)\.md$' && exit 0

safe_session=$(printf '%s' "$session" | tr -c 'A-Za-z0-9_-' '_')
marker=".claude/state/stop-reminded-$safe_session"
[ -f "$marker" ] && exit 0
mkdir -p .claude/state && touch "$marker"

n=$(echo "$code" | wc -l)
cat <<JSON
{"decision": "block", "reason": "Rappel mémoire (une seule fois par session) : $n fichier(s) de code modifié(s) sans mise à jour de docs/TASKS.md ni de docs/CURRENT_STATUS.md. Si une tâche importante vient d'avancer, mettre à jour la section « En cours » de docs/TASKS.md (ce qui reste exactement) ou lancer le skill session-close. Sinon, terminer normalement."}
JSON
exit 0
