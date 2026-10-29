#!/usr/bin/env bash
# Télécharge les vraies photos des plats de démo depuis Unsplash (licence gratuite)
# et les enregistre en JPEG 1200 px dans apps/web/public/images/dishes/.
# Lancé par GitHub (.github/workflows/fetch-photos.yml) car l'environnement de développement n'a pas accès à Unsplash.
set -uo pipefail
cd "$(dirname "$0")/.."
OUT=apps/web/public/images/dishes
CREDITS=$OUT/CREDITS.md
echo "# Crédits photos (licence Unsplash)" > "$CREDITS"
LOG=$OUT/fetch-log.txt
: > "$LOG"
ok=0
for name in $(jq -r 'keys[] | select(startswith("_") | not)' scripts/photos.json); do
  done_one=""
  for id in $(jq -r --arg n "$name" '.[$n][]' scripts/photos.json); do
    tmp=$(mktemp)
    UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    # 1) Adresse de l'image lue dans la page de la photo (balise og:image)
    page=$(curl -fsSL --max-time 60 -A "$UA" "https://unsplash.com/photos/$id" 2>>"$LOG" || true)
    img=$(printf '%s' "$page" | grep -oE 'https://images\.unsplash\.com/photo-[^"?&]+' | head -1)
    echo "$name/$id : page ${#page} octets, image=${img:-aucune}" >> "$LOG"
    if [ -n "$img" ]; then
      curl -fsSL --max-time 60 -A "$UA" -o "$tmp" "$img?w=1200&q=80&fm=jpg" 2>>"$LOG" || true
    else
      # 2) Lien de téléchargement direct
      curl -fsSL --max-time 60 -A "$UA" -o "$tmp" "https://unsplash.com/photos/$id/download?force=true" 2>>"$LOG" || true
    fi
    echo "  fichier : $(file -b "$tmp" | cut -c1-60)" >> "$LOG"
    if file "$tmp" | grep -qiE 'jpeg|png|webp'; then
      convert "$tmp" -resize '1200x1200>' -strip -quality 80 "$OUT/$name.jpg"
      echo "- $name.jpg : https://unsplash.com/photos/$id" >> "$CREDITS"
      echo "✓ $name ← $id"; ok=$((ok + 1)); done_one=1; rm -f "$tmp"; break
    fi
    echo "  ✗ $name : $id indisponible"; rm -f "$tmp"
  done
  [ -n "$done_one" ] && sed -i "s#/images/dishes/$name.svg#/images/dishes/$name.jpg#g" packages/shared/src/demo-data.ts
done
echo "$ok photos téléchargées"
