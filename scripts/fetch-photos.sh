#!/usr/bin/env bash
# Télécharge les vraies photos des plats de démo depuis Unsplash (licence gratuite)
# et les enregistre en JPEG 1200 px dans apps/web/public/images/dishes/.
# Lancé par GitHub (.github/workflows/fetch-photos.yml) car l'environnement de développement n'a pas accès à Unsplash.
set -uo pipefail
cd "$(dirname "$0")/.."
OUT=apps/web/public/images/dishes
CREDITS=$OUT/CREDITS.md
echo "# Crédits photos (licence Unsplash)" > "$CREDITS"
ok=0
for name in $(jq -r 'keys[] | select(startswith("_") | not)' scripts/photos.json); do
  done_one=""
  for id in $(jq -r --arg n "$name" '.[$n][]' scripts/photos.json); do
    tmp=$(mktemp)
    if curl -fsSL --max-time 60 -o "$tmp" "https://unsplash.com/photos/$id/download?force=true" && file "$tmp" | grep -qiE 'jpeg|png|webp'; then
      convert "$tmp" -resize '1200x1200>' -strip -quality 80 "$OUT/$name.jpg"
      echo "- $name.jpg : https://unsplash.com/photos/$id" >> "$CREDITS"
      echo "✓ $name ← $id"; ok=$((ok + 1)); done_one=1; rm -f "$tmp"; break
    fi
    echo "  ✗ $name : $id indisponible"; rm -f "$tmp"
  done
  [ -n "$done_one" ] && sed -i "s#/images/dishes/$name.svg#/images/dishes/$name.jpg#g" packages/shared/src/demo-data.ts
done
echo "$ok photos téléchargées"
