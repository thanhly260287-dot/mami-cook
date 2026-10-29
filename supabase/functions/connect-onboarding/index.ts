// Crée (si besoin) le compte Stripe Connect Express du cuisinier et renvoie le lien d'inscription
// ou le lien vers son tableau de bord Stripe (versements, factures).
import { handler, HttpError, json, readJson } from "../_shared/cors.ts";
import { admin, SITE_URL, stripe, userClient } from "../_shared/clients.ts";

Deno.serve(handler(async (req) => {
  const { userId, email } = await userClient(req);
  const { mode = "onboarding", return_url } = await readJson<{ mode?: "onboarding" | "dashboard"; return_url?: string }>(req);

  const { data: cook } = await admin.from("cooks").select("id, status, stripe_account_id, kitchen_name, slug").eq("id", userId).maybeSingle();
  if (!cook) throw new HttpError(403, "Créez d'abord votre cuisine");
  if (cook.status === "suspended") throw new HttpError(403, "Compte suspendu");

  let accountId = cook.stripe_account_id as string | null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email,
      business_type: "individual",
      capabilities: { transfers: { requested: true } },
      business_profile: { mcc: "5812", product_description: "Plats faits maison vendus via MAMI COOK", url: `${SITE_URL}/cuisine/${cook.slug}` },
      metadata: { cook_id: userId },
    }, { idempotencyKey: `connect-${userId}` });
    accountId = account.id;
    await admin.from("cooks").update({ stripe_account_id: accountId }).eq("id", userId);
  }

  if (mode === "dashboard") {
    const link = await stripe.accounts.createLoginLink(accountId);
    return json(req, { url: link.url });
  }

  // N'autorise que des retours vers notre site ou l'appli (pas de redirection ouverte).
  const safeReturn = return_url && (return_url.startsWith(SITE_URL) || return_url.startsWith("mamicook://"))
    ? return_url : `${SITE_URL}/cuisine/tableau-de-bord/paiements`;
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: safeReturn,
    return_url: safeReturn,
    type: "account_onboarding",
  });
  return json(req, { url: link.url });
}));
