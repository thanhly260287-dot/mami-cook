// Crée (si besoin) le compte Stripe Connect Express de la cuisinière ou du livreur et renvoie
// le lien d'inscription ou le lien vers son tableau de bord Stripe (versements, factures).
import { handler, HttpError, json, readJson } from "../_shared/cors.ts";
import { admin, SITE_URL, stripe, userClient } from "../_shared/clients.ts";

Deno.serve(handler(async (req) => {
  const { userId, email } = await userClient(req);
  const { mode = "onboarding", return_url, role = "cook" } = await readJson<{
    mode?: "onboarding" | "dashboard"; return_url?: string; role?: "cook" | "courier";
  }>(req);
  if (role !== "cook" && role !== "courier") throw new HttpError(400, "Rôle invalide");
  const table = role === "cook" ? "cooks" : "couriers";

  const { data: row } = await admin.from(table).select("*").eq("id", userId).maybeSingle();
  if (!row) throw new HttpError(403, role === "cook" ? "Créez d'abord votre cuisine" : "Créez d'abord votre profil livreur");
  if (row.status === "suspended") throw new HttpError(403, "Compte suspendu");

  let accountId = row.stripe_account_id as string | null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: row.country ?? "FR",
      email,
      business_type: "individual",
      capabilities: { transfers: { requested: true } },
      business_profile: role === "cook"
        ? { mcc: "5812", product_description: "Plats faits maison vendus via MAMI COOK", url: `${SITE_URL}/cuisine/${row.slug}` }
        : { mcc: "4215", product_description: "Livraison de repas pour MAMI COOK", url: SITE_URL },
      metadata: role === "cook" ? { cook_id: userId } : { courier_id: userId },
    }, { idempotencyKey: `connect-${role}-${userId}` });
    accountId = account.id;
    await admin.from(table).update({ stripe_account_id: accountId }).eq("id", userId);
  }

  if (mode === "dashboard") {
    const link = await stripe.accounts.createLoginLink(accountId);
    return json(req, { url: link.url });
  }

  // N'autorise que des retours vers notre site ou l'appli (pas de redirection ouverte).
  const safeReturn = return_url && (return_url.startsWith(SITE_URL) || return_url.startsWith("mamicook://"))
    ? return_url : role === "cook" ? `${SITE_URL}/cuisine/tableau-de-bord/paiements` : `${SITE_URL}/livreur/gains`;
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: safeReturn,
    return_url: safeReturn,
    type: "account_onboarding",
  });
  return json(req, { url: link.url });
}));
