// Suppression de compte (RGPD, art. 17). Les commandes sont conservées de façon
// anonymisée pour les obligations comptables (10 ans), le reste est effacé.
import { handler, HttpError, json } from "../_shared/cors.ts";
import { admin, userClient } from "../_shared/clients.ts";

Deno.serve(handler(async (req) => {
  const { userId } = await userClient(req);

  const { count } = await admin.from("orders").select("id", { count: "exact", head: true })
    .or(`customer_id.eq.${userId},cook_id.eq.${userId}`)
    .in("status", ["pending_payment", "paid", "accepted", "preparing", "ready", "out_for_delivery"]);
  if ((count ?? 0) > 0) throw new HttpError(409, "Vous avez des commandes en cours. Réessayez une fois terminées.");

  const { count: activeDeliveries } = await admin.from("deliveries").select("id", { count: "exact", head: true })
    .eq("courier_id", userId).in("status", ["assigned", "at_pickup", "picked_up"]);
  if ((activeDeliveries ?? 0) > 0) throw new HttpError(409, "Vous avez une course en cours. Réessayez une fois terminée.");

  const { data: pendingPayout } = await admin.from("payouts").select("id")
    .or(`cook_id.eq.${userId},courier_id.eq.${userId}`).eq("status", "pending").limit(1);
  if (pendingPayout?.length) throw new HttpError(409, "Un versement est en attente. Réessayez dans 24 h.");

  await admin.from("addresses").delete().eq("user_id", userId);
  await admin.from("push_tokens").delete().eq("user_id", userId);
  await admin.from("favorites").delete().eq("user_id", userId);
  await admin.from("notifications").delete().eq("user_id", userId);
  await admin.from("messages").update({ body: "[message supprimé]" }).eq("sender_id", userId);
  await admin.from("reviews").update({ comment: null }).eq("customer_id", userId);
  await admin.from("profile_private").update({ phone: null, marketing_consent: false, deletion_requested_at: new Date().toISOString() }).eq("user_id", userId);
  await admin.from("profiles").update({ display_name: "Utilisateur supprimé", avatar_url: null }).eq("id", userId);
  await admin.from("cooks").update({ status: "suspended", status_reason: "Compte supprimé", bio: null, cover_url: null }).eq("id", userId);
  await admin.from("dishes").update({ is_active: false }).eq("cook_id", userId);
  await admin.from("cook_private").update({ exact_location: null, siret: null, address_id: null }).eq("cook_id", userId);
  // Livreur : compte désactivé, position effacée. L'identité fiscale reste conservée le temps légal (DAC7, 10 ans).
  await admin.from("couriers").update({ status: "suspended", status_reason: "Compte supprimé", is_online: false, last_location: null }).eq("id", userId);
  await admin.from("orders").update({ delivery_address: null, delivery_location: null, note: null }).eq("customer_id", userId);

  for (const bucket of ["avatars", "dish-photos", "covers"]) {
    const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
  }

  // Suppression "douce" : l'identifiant reste pour l'intégrité comptable, l'e-mail est effacé.
  const { error } = await admin.auth.admin.deleteUser(userId, true);
  if (error) throw error;
  await admin.from("audit_log").insert({ actor_id: userId, action: "account.delete", target_type: "user", target_id: userId });
  return json(req, { ok: true });
}));
