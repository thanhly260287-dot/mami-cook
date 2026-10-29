#!/usr/bin/env python3
"""Vraies photos des plats de démo depuis Wikimedia Commons (licences libres).

  python3 scripts/fetch-photos.py candidates   → 4 propositions par plat dans photo-review/ (à trier)
  python3 scripts/fetch-photos.py final        → télécharge les photos choisies dans scripts/photos.json
  python3 scripts/fetch-photos.py hero         → propositions pour la bannière d'accueil (section « hero » :
                                                 Wikimedia Commons + Openverse/Flickr, licences commerciales)

Lancé par GitHub (.github/workflows/fetch-photos.yml) : l'environnement de développement n'a pas accès à internet.
Les crédits (auteur, licence) sont enregistrés dans apps/web/public/images/dishes/credits.json et affichés sur le site.
"""
import json, re, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://commons.wikimedia.org/w/api.php"
UA = "MamiCookPhotoBot/1.0 (https://github.com/thanhly260287-dot/mami-cook; contact@mamicook.fr)"
OK_LICENSES = re.compile(r"^(CC0|CC BY(-SA)? [0-9.]+|Public domain|PD)", re.I)

def get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json, image/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
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
            # « personality » : personne reconnaissable, son accord peut être nécessaire pour une publicité
            "restrictions": clean(meta.get("Restrictions", {}).get("value")),
        })
    return out

def search(q, width, limit=20):
    r = query({"generator": "search", "gsrsearch": f"{q} filetype:bitmap", "gsrnamespace": "6", "gsrlimit": str(limit),
               "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size", "iiurlwidth": str(width)})
    pages = sorted(r.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0))
    return [c for c in info(pages) if (c["width"] or 0) >= 800 and (c["height"] or 0) >= 500]

def by_title(title, width):
    r = query({"titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size", "iiurlwidth": str(width)})
    found = info(r.get("query", {}).get("pages", []))
    return found[0] if found else None

OPENVERSE = "https://api.openverse.org/v1/images/"

def ov_item(r):
    lic = f"CC {r.get('license', '').upper()} {r.get('license_version') or ''}".strip()
    if r.get("license") in ("cc0", "pdm"):
        lic = "CC0" if r.get("license") == "cc0" else "Public domain"
    return {"title": "openverse:" + r["id"], "thumb": r.get("url"), "page": r.get("foreign_landing_url"),
            "license": lic, "author": (r.get("creator") or "")[:120], "width": r.get("width"), "height": r.get("height"),
            "restrictions": "", "label": (r.get("title") or "")[:100], "source": r.get("source")}

def openverse_search(q):
    params = urllib.parse.urlencode({"q": q, "license_type": "commercial", "page_size": "20"})
    return [ov_item(r) for r in json.loads(get(OPENVERSE + "?" + params, 150)).get("results", [])]

def openverse_get(ident):
    return ov_item(json.loads(get(OPENVERSE + ident + "/", 150)))

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
elif mode == "hero":
    out = ROOT / "photo-review"
    out.mkdir(exist_ok=True)
    seen, cands, errors = set(), [], []
    for q in cfg["hero"]["queries"]:
        try:
            for c in search(q, 600, 30):
                if c["title"] not in seen and (c["width"] or 0) >= 1200 and c["width"] >= c["height"]:
                    seen.add(c["title"]); cands.append({**c, "query": q})
        except Exception as e:  # noqa: BLE001
            print(f"✗ {q} : {e}")
    for q in cfg["hero"].get("openverse", []):
        try:
            for c in openverse_search(q):
                if c["title"] not in seen and c["thumb"] and (c["width"] or 0) >= 1200:
                    seen.add(c["title"]); cands.append({**c, "query": "openverse: " + q})
        except Exception as e:  # noqa: BLE001
            print(f"✗ openverse {q} : {e}"); errors.append(f"openverse {q} : {e}")
    cands = cands[:48]
    ok = []
    for c in cands:
        try:
            jpeg(c["thumb"], out / f"hero-{len(ok)}.jpg", 600); ok.append(c)
        except Exception as e:  # noqa: BLE001
            print(f"✗ {c['title']} : {e}")
    cands = ok
    (out / "index.json").write_text(json.dumps({"hero": cands, "errors": errors}, ensure_ascii=False, indent=1))
    print(f"hero : {len(cands)} candidates")
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
    hero = cfg.get("hero", {})
    if hero.get("title"):
        if hero["title"].startswith("openverse:"):
            c = openverse_get(hero["title"].split(":", 1)[1])
        else:
            c = by_title(hero["title"], 1600)
        if c:
            jpeg(c["thumb"], ROOT / "apps/web/public/images/hero.jpg", 1600)
            credits["hero"] = {k: c[k] for k in ("title", "page", "license", "author")}
            print(f"✓ hero ← {c['title']} ({c['license']})")
        else:
            print(f"✗ hero : {hero['title']} introuvable ou licence non libre")
    (dishes / "credits.json").write_text(json.dumps(credits, ensure_ascii=False, indent=1))
    demo.write_text(src)
