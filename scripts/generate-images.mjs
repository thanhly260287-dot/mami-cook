#!/usr/bin/env node
// Génère de vraies photos pour les plats de démonstration avec Gemini (« Nano Banana »).
//
//   GEMINI_API_KEY=xxx node scripts/generate-images.mjs            → génère les photos manquantes
//   GEMINI_API_KEY=xxx node scripts/generate-images.mjs --force    → régénère tout
//   node scripts/generate-images.mjs --dry-run                     → affiche les descriptions sans rien appeler
//   GEMINI_API_KEY=xxx node scripts/generate-images.mjs --hero     → scènes du carrousel d'accueil (scripts/hero-scenes.json)
//
// Les images sont enregistrées dans apps/web/public/images/dishes/<nom>.jpg, puis les données
// de démo (packages/shared/src/demo-data.ts) sont mises à jour pour les utiliser.
// La clé n'est jamais écrite dans un fichier : elle se passe uniquement en variable d'environnement.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Messages visibles dans le résumé GitHub (annotations), sans jamais afficher la clé
const gh = (level, msg) => console.log(process.env.GITHUB_ACTIONS ? `::${level}::${msg}` : msg);
const ROOT = new URL("..", import.meta.url).pathname;
const DEMO = join(ROOT, "packages/shared/src/demo-data.ts");
const OUT = join(ROOT, "apps/web/public/images/dishes");
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const dry = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

// ------------------------------------------------------------------ carrousel d'accueil
// Une scène par plat, personnes fictives de toutes origines dans des maisons modernes.
// Écrit apps/web/public/images/hero/<id>.png (converties en JPEG par le workflow) et scenes.json.
if (process.argv.includes("--hero")) {
  const { mkdirSync } = await import("node:fs");
  const cfg = JSON.parse(readFileSync(join(ROOT, "scripts/hero-scenes.json"), "utf8"));
  const dir = join(ROOT, "apps/web/public/images/hero");
  mkdirSync(dir, { recursive: true });
  const heroPrompt = (sc) => `${sc.prompt} ${cfg.style}`;
  if (dry) {
    for (const sc of cfg.scenes) console.log(`${sc.id} ← ${heroPrompt(sc)}\n`);
    process.exit(0);
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { gh("error", "Secret GEMINI_API_KEY absent : ajoutez-le dans GitHub (Settings → Secrets and variables → Actions)."); process.exit(1); }
  const done = [];
  for (const sc of cfg.scenes) {
    const jpg = join(dir, `${sc.id}.jpg`);
    if (existsSync(jpg) && !force) { console.log(`= ${sc.id}.jpg existe déjà`); done.push(sc); continue; }
    process.stdout.write(`→ ${sc.id}… `);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: heroPrompt(sc) }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:2" } } }),
    });
    if (!res.ok) { const err = (await res.text()).replace(/\s+/g, " ").slice(0, 220); gh("warning", `${sc.id} : refus de Google (${res.status}) ${err}`); continue; }
    const body = await res.json();
    const img = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.inlineData ?? p.inline_data).find(Boolean);
    if (!img?.data) { gh("warning", `${sc.id} : aucune image renvoyée (${body.candidates?.[0]?.finishReason ?? body.promptFeedback?.blockReason ?? "raison inconnue"})`); continue; }
    writeFileSync(join(dir, `${sc.id}.png`), Buffer.from(img.data, "base64"));
    done.push(sc);
    console.log("OK");
  }
  // Manifeste lu par le carrousel : seules les scènes réussies y figurent.
  writeFileSync(join(dir, "scenes.json"), JSON.stringify(done.map((sc) => ({ file: `hero/${sc.id}.jpg`, alt: sc.alt, dish: sc.dish })), null, 1) + "\n");
  gh(done.length === cfg.scenes.length ? "notice" : "warning", `${done.length}/${cfg.scenes.length} scènes prêtes.`);
  process.exit(done.length ? 0 : 1);
}

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
