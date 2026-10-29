#!/usr/bin/env node
// Génère de vraies photos pour les plats de démonstration avec Gemini (« Nano Banana »).
//
//   GEMINI_API_KEY=xxx node scripts/generate-images.mjs            → génère les photos manquantes
//   GEMINI_API_KEY=xxx node scripts/generate-images.mjs --force    → régénère tout
//   node scripts/generate-images.mjs --dry-run                     → affiche les descriptions sans rien appeler
//
// Les images sont enregistrées dans apps/web/public/images/dishes/<nom>.jpg, puis les données
// de démo (packages/shared/src/demo-data.ts) sont mises à jour pour les utiliser.
// La clé n'est jamais écrite dans un fichier : elle se passe uniquement en variable d'environnement.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DEMO = join(ROOT, "packages/shared/src/demo-data.ts");
const OUT = join(ROOT, "apps/web/public/images/dishes");
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const dry = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

const src = readFileSync(DEMO, "utf8");
// Chaque plat de démo : titre, description et photo actuelle.
const items = [...src.matchAll(/"title": "([^"]+)",\s*"description": "([^"]*)"[\s\S]*?"photos": \[\s*"\/images\/dishes\/([a-z0-9-]+)\.(svg|jpg)"/g)]
  .map((m) => ({ title: m[1], description: m[2], name: m[3] }));
if (!items.length) throw new Error("Aucun plat trouvé dans demo-data.ts");

const prompt = (it) =>
  `Photo culinaire réaliste et appétissante d'un plat fait maison : « ${it.title} ». ${it.description} ` +
  "Vue légèrement en plongée, lumière naturelle douce venant d'une fenêtre, assiette ou bol posé sur une table en bois, " +
  "décor de cuisine familiale discret, faible profondeur de champ. Aucun texte, aucun logo, aucune personne. Format paysage 4:3.";

if (dry) {
  for (const it of items) console.log(`${it.name}.jpg ← ${prompt(it)}\n`);
  process.exit(0);
}
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("Définissez GEMINI_API_KEY (clé gratuite sur https://aistudio.google.com/apikey).");
  process.exit(1);
}

let updated = src;
for (const it of items) {
  const file = join(OUT, `${it.name}.jpg`);
  if (existsSync(file) && !force) {
    console.log(`= ${it.name}.jpg existe déjà`);
  } else {
    process.stdout.write(`→ ${it.title}… `);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt(it) }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
    });
    if (!res.ok) {
      console.log(`échec (${res.status}) : ${(await res.text()).slice(0, 200)}`);
      continue;
    }
    const body = await res.json();
    const img = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.inlineData ?? p.inline_data).find(Boolean);
    if (!img?.data) {
      console.log("aucune image renvoyée");
      continue;
    }
    writeFileSync(file, Buffer.from(img.data, "base64"));
    console.log("OK");
  }
  updated = updated.replaceAll(`/images/dishes/${it.name}.svg`, `/images/dishes/${it.name}.jpg`);
}
writeFileSync(DEMO, updated);
console.log("Données de démo mises à jour. Vérifiez les images puis commitez-les.");
