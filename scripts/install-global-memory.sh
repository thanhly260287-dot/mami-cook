#!/usr/bin/env bash
# Installe les préférences de travail communes dans ~/.claude/CLAUDE.md.
# Sans risque : si un fichier existe déjà et diffère, il est sauvegardé (CLAUDE.md.bak-DATE) avant remplacement.
set -euo pipefail
src="$(cd "$(dirname "$0")/.." && pwd)/docs/claude-global/CLAUDE.md"
dest="${HOME}/.claude/CLAUDE.md"
mkdir -p "${HOME}/.claude"
if [ -f "$dest" ] && ! cmp -s "$src" "$dest"; then
  cp "$dest" "$dest.bak-$(date +%Y%m%d-%H%M%S)"
  echo "Ancien fichier sauvegardé à côté de $dest"
fi
cp "$src" "$dest"
echo "Mémoire globale installée : $dest"
