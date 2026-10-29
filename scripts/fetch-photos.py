#!/usr/bin/env python3
"""Vraies photos des plats de démo depuis Wikimedia Commons (licences libres).

  python3 scripts/fetch-photos.py candidates   → 4 propositions par plat dans photo-review/ (à trier)
  python3 scripts/fetch-photos.py final        → télécharge les photos choisies dans scripts/photos.json

Lancé par GitHub (.github/workflows/fetch-photos.yml) : l'environnement de développement n'a pas accès à internet.
Les crédits (auteur, licence) sont enregistrés dans apps/web/public/images/dishes/credits.json et affichés sur le site.
"""
import json, re, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://commons.wikimedia.org/w/api.php"
UA = "MamiCookPhotoBot/1.0 (https://github.com/thanhly260287-dot/mami-cook; contact@mamicook.fr)"
OK_LICENSES = re.compile(r"^(CC0|CC BY(-SA)? [0-9.]+|Public domain|PD)", re.I)

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def clean(html):
    return re.sub(r"<[^>]+>", "", html or "").strip()

def query(params):
    params = {"format": "json", "formatversion": "2", "action": "query", **params}
    return json.loads(get(API + "?" + urllib.parse.urlencode(params)))

def info(pages):
    out = []
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata", {})
        lic = clean(meta.get("LicenseShortName", {}).get("value"))
        if ii.get("mime") not in ("image/jpeg", "image/png") or not OK_LICENSES.match(lic or ""):
            continue
        out.append({
            "title": p["title"], "thumb": ii.get("thumburl"), "page": ii.get("descriptionurl"),
            "license": lic, "author": clean(meta.get("Artist", {}).get("value"))[:120],
            "width": ii.get("width"), "height": ii.get("height"),
        })
    return out

def search(q, width):
    r = query({"generator": "search", "gsrsearch": f"{q} filetype:bitmap", "gsrnamespace": "6", "gsrlimit": "20",
               "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size", "iiurlwidth": str(width)})
    pages = sorted(r.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0))
    return [c for c in info(pages) if (c["width"] or 0) >= 800 and (c["height"] or 0) >= 500]

def by_title(title, width):
    r = query({"titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size", "iiurlwidth": str(width)})
    found = info(r.get("query", {}).get("pages", []))
    return found[0] if found else None

def jpeg(src, dest, size):
    tmp = dest.with_suffix(".tmp")
    tmp.write_bytes(get(src))
    subprocess.run(["convert", str(tmp), "-resize", f"{size}x{size}>", "-strip", "-quality", "80", str(dest)], check=True)
    tmp.unlink()

cfg = json.loads((ROOT / "scripts/photos.json").read_text())
mode = sys.argv[1] if len(sys.argv) > 1 else "final"
if mode == "candidates":
    out = ROOT / "photo-review"
    out.mkdir(exist_ok=True)
    index = {}
    for name, spec in cfg["dishes"].items():
        try:
            cands = search(spec["query"], 400)[:4]
        except Exception as e:  # noqa: BLE001
            print(f"✗ {name} : {e}"); cands = []
        index[name] = cands
        for i, c in enumerate(cands):
            jpeg(c["thumb"], out / f"{name}-{i}.jpg", 400)
        print(f"{name} : {len(cands)} candidates")
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))
else:
    dishes = ROOT / "apps/web/public/images/dishes"
    demo = ROOT / "packages/shared/src/demo-data.ts"
    credits, src = {}, demo.read_text()
    for name, spec in cfg["dishes"].items():
        if not spec.get("title"):
            continue
        c = by_title(spec["title"], 1200)
        if not c:
            print(f"✗ {name} : {spec['title']} introuvable ou licence non libre"); continue
        jpeg(c["thumb"], dishes / f"{name}.jpg", 1200)
        credits[name] = {k: c[k] for k in ("title", "page", "license", "author")}
        src = src.replace(f"/images/dishes/{name}.svg", f"/images/dishes/{name}.jpg")
        print(f"✓ {name} ← {c['title']} ({c['license']})")
    (dishes / "credits.json").write_text(json.dumps(credits, ensure_ascii=False, indent=1))
    demo.write_text(src)
