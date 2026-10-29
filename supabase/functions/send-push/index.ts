// Appelée par un "Database Webhook" Supabase à chaque nouvelle notification :
// envoie la notification push (Expo) sur les téléphones de la personne.
import { handler, json, readJson } from "../_shared/cors.ts";
import { admin, requireCronSecret } from "../_shared/clients.ts";

interface Payload {
  type: "INSERT";
  table: "notifications";
  record: { user_id: string; title: string; body: string | null; data: Record<string, unknown> };
}

Deno.serve(handler(async (req) => {
  requireCronSecret(req);
  const { record } = await readJson<Payload>(req);
  const { data: tokens } = await admin.from("push_tokens").select("token").eq("user_id", record.user_id).in("platform", ["ios", "android"]);
  if (!tokens?.length) return json(req, { sent: 0 });

  const messages = tokens.map((t) => ({
    to: t.token, sound: "default", title: record.title, body: record.body ?? "", data: record.data,
  }));
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(Deno.env.get("EXPO_ACCESS_TOKEN") ? { Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  const result = await res.json();
  // Nettoie les jetons invalides (appli désinstallée)
  // deno-lint-ignore no-explicit-any
  const invalid = (result.data ?? []).map((r: any, i: number) => r.details?.error === "DeviceNotRegistered" ? tokens[i].token : null).filter(Boolean);
  if (invalid.length) await admin.from("push_tokens").delete().in("token", invalid);
  return json(req, { sent: messages.length - invalid.length });
}));
