// Génération et retouche d'images avec Gemini (« Nano Banana »). La clé reste côté serveur.
const MODEL = Deno.env.get("GEMINI_IMAGE_MODEL") ?? "gemini-2.5-flash-image";

export interface GeminiImage { data: Uint8Array; mimeType: string }

export async function geminiImage(prompt: string, input?: GeminiImage): Promise<GeminiImage> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY manquante");
  const parts: unknown[] = [{ text: prompt }];
  if (input) parts.push({ inline_data: { mime_type: input.mimeType, data: toBase64(input.data) } });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"] } }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const body = await res.json();
  // deno-lint-ignore no-explicit-any
  const out = (body.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.inlineData ?? p.inline_data).find(Boolean);
  if (!out?.data) throw new Error("Aucune image renvoyée");
  return { data: fromBase64(out.data), mimeType: out.mimeType ?? out.mime_type ?? "image/png" };
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
