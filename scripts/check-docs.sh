#!/usr/bin/env bash
# Vérifie la cohérence de la mémoire du projet. Lecture seule. Code de sortie 1 en cas de problème.
set -uo pipefail
cd "$(dirname "$0")/.."
err=0
fail() { echo "ERREUR : $*"; err=1; }

for f in CLAUDE.md docs/PROJECT_OVERVIEW.md docs/REQUIREMENTS.md docs/ARCHITECTURE.md docs/DECISIONS.md \
         docs/CURRENT_STATUS.md docs/TASKS.md docs/BUGS_AND_SOLUTIONS.md docs/TESTS.md docs/CHANGELOG.md \
         docs/SESSION_LOG.md docs/claude-global/CLAUDE.md; do
  [ -s "$f" ] || fail "fichier manquant ou vide : $f"
done
for s in project-memory session-start session-close project-audit safe-development; do
  f=".claude/skills/$s/SKILL.md"
  [ -s "$f" ] || { fail "skill manquant : $f"; continue; }
  grep -q "^name: $s$" "$f" || fail "en-tête name absent dans $f"
  grep -q "^description: " "$f" || fail "en-tête description absent dans $f"
done

grep -qE "Dernière vérification : [0-9]{4}-[0-9]{2}-[0-9]{2}" docs/CURRENT_STATUS.md \
  || fail "docs/CURRENT_STATUS.md : ligne « Dernière vérification : AAAA-MM-JJ » absente"
for sec in "## En cours" "## À faire" "## Terminées"; do
  grep -q "^$sec" docs/TASKS.md || fail "docs/TASKS.md : section « $sec » absente"
done

# Liens relatifs [texte](chemin) et imports @chemin
for f in CLAUDE.md docs/*.md; do
  dir=$(dirname "$f")
  while IFS= read -r link; do
    target="${link%%#*}"
    [ -z "$target" ] && continue
    case "$target" in http*|mailto:*) continue ;; esac
    [ -e "$dir/$target" ] || fail "$f : lien cassé vers $link"
  done < <(grep -oE '\]\([^)]+\)' "$f" | sed -E 's/^\]\((.*)\)$/\1/')
done
while IFS= read -r imp; do
  [ -e "$imp" ] || fail "CLAUDE.md : import @$imp introuvable"
done < <(grep -oE '^@[^ ]+' CLAUDE.md | sed 's/^@//')

# Aucun secret dans la mémoire
if grep -rnE "sk_live_[A-Za-z0-9]|sk_test_[A-Za-z0-9]{10}|whsec_[A-Za-z0-9]{10}|eyJhbGciOi[A-Za-z0-9_-]{20}|-----BEGIN [A-Z ]*PRIVATE KEY" \
     CLAUDE.md docs .claude/skills .claude/hooks 2>/dev/null; then
  fail "motif de secret trouvé dans la documentation"
fi

[ $err -eq 0 ] && echo "Documentation OK"
exit $err
