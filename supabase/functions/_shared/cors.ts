// En-têtes CORS : seules les origines déclarées dans ALLOWED_ORIGINS sont acceptées.
const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:8080")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  // Les applis mobiles n'envoient pas d'en-tête Origin : pas de CORS nécessaire.
  const allow = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Enveloppe commune : CORS, méthode, gestion d'erreurs sans fuite d'informations internes. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, { error: "Méthode non autorisée" }, 405);
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return json(req, { error: e.message }, e.status);
      // Erreurs métier levées par Postgres (messages en français destinés à l'utilisateur)
      const pg = e as { code?: string; message?: string };
      if (pg?.code && ["22023", "P0409", "P0429", "42501"].includes(pg.code)) {
        const status = pg.code === "P0429" ? 429 : pg.code === "P0409" ? 409 : pg.code === "42501" ? 403 : 400;
        return json(req, { error: pg.message }, status);
      }
      console.error(e);
      return json(req, { error: "Erreur interne, réessayez plus tard" }, 500);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request, maxBytes = 32_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Requête trop volumineuse");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "JSON invalide");
  }
}
