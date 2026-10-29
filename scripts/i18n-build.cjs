// Construit les fichiers de traduction à partir de scripts/i18n-src/<langue>.txt
// (une ligne « numéro=traduction » par phrase de la liste générée par i18n-keys.cjs).
const fs = require("fs");
const path = require("path");
const keys = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const lang = process.argv[3];
const src = fs.readFileSync(path.join(__dirname, "i18n-src", `${lang}.txt`), "utf8");
const out = {};
for (const line of src.split("\n")) {
  const m = line.match(/^(\d+)=(.*)$/);
  if (!m) continue;
  const k = keys[Number(m[1])];
  if (k === undefined) throw new Error(`${lang}: index inconnu ${m[1]}`);
  const v = m[2];
  const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  if (ph(k) !== ph(v)) throw new Error(`${lang} #${m[1]} : variables différentes (${k} → ${v})`);
  out[k] = v;
}
const missing = keys.filter((k) => !(k in out));
const file = path.join(__dirname, "../packages/shared/src/i18n/locales", `${lang}.json`);
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(file, JSON.stringify(sorted, null, 1) + "\n");
console.log(`${lang}: ${Object.keys(out).length}/${keys.length}${missing.length ? " — manquantes : " + missing.slice(0, 5).join(" | ") : ""}`);
