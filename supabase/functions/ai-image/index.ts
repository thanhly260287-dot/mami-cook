// Retouche ou création de photo de plat par IA (Gemini « Nano Banana »).
// Réservé aux cuisinières, quota de 20 par jour. La photo d'origine n'est jamais modifiée :
// le résultat est enregistré comme une nouvelle photo dans le dossier de la cuisinière.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { handler, HttpError, json, readJson } from "../_shared/cors.ts";
import { geminiImage } from "../_shared/gemini.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const PROMPTS = {
  enhance:
    "Améliore cette photo de plat fait maison pour une application de vente : lumière naturelle douce, couleurs appétissantes mais fidèles, " +
    "netteté, cadrage soigné. Ne change PAS le plat, ses ingrédients, sa quantité ni sa présentation : le client doit recevoir exactement ce qu'il voit.",
  background:
    "Garde exactement le même plat (mêmes ingrédients, même portion) et remplace seulement l'arrière-plan par une table en bois clair " +
    "avec une lumière naturelle douce, style photo culinaire. Aucun texte, aucun logo.",
  generate:
    "Photo culinaire réaliste, vue légèrement en plongée, lumière naturelle douce, assiette sur une table en bois, style fait maison et appétissant, " +
    "sans texte ni logo. Le plat : ",
} as const;
type Mode = keyof typeof PROMPTS;

Deno.serve(handler(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new HttpError(401, "Connexion requise");
  const { data: u, error: authErr } = await admin.auth.getUser(auth.slice(7));
  if (authErr || !u.user) throw new HttpError(401, "Session expirée, reconnectez-vous");
  const userId = u.user.id;

  const { mode, path, description } = await readJson<{ mode: Mode; path?: string; description?: string }>(req);
  if (!(mode in PROMPTS)) throw new HttpError(400, "Mode invalide");
  if (mode !== "generate" && (!path || !path.startsWith(`dish-photos/${userId}/`) || path.includes(".."))) {
    throw new HttpError(403, "Photo introuvable");
  }
  if (mode === "generate" && (!description || description.trim().length < 3 || description.length > 300)) {
    throw new HttpError(400, "Décrivez le plat (3 à 300 caractères)");
  }

  const { data: left, error: quotaErr } = await admin.rpc("consume_ai_quota", { _user: userId, _mode: mode });
  if (quotaErr) throw new HttpError(429, quotaErr.message);

  let input;
  if (mode !== "generate") {
    const { data: file, error } = await admin.storage.from("dish-photos").download(path!.slice("dish-photos/".length));
    if (error || !file) throw new HttpError(404, "Photo introuvable");
    if (file.size > 8 * 1024 * 1024) throw new HttpError(413, "Photo trop lourde");
    input = { data: new Uint8Array(await file.arrayBuffer()), mimeType: file.type || "image/webp" };
  }

  let out;
  try {
    out = await geminiImage(mode === "generate" ? PROMPTS.generate + description!.trim() : PROMPTS[mode], input);
  } catch (e) {
    console.error("ai-image", e);
    throw new HttpError(502, "La retouche n'a pas abouti, réessayez dans un instant");
  }
  const ext = out.mimeType.includes("png") ? "png" : out.mimeType.includes("webp") ? "webp" : "jpg";
  const newPath = `${userId}/ia-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage.from("dish-photos").upload(newPath, out.data, { contentType: out.mimeType, cacheControl: "31536000" });
  if (upErr) throw upErr;
  return json(req, { path: `dish-photos/${newPath}`, remaining_today: left, ai_generated: true });
}));
