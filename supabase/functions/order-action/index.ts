// Change le statut d'une commande (droits vérifiés par la base) et rembourse si besoin.
import { handler, HttpError, json, readJson } from "../_shared/cors.ts";
import { admin, stripe, userClient } from "../_shared/clients.ts";

const STATUSES = ["accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled"];

Deno.serve(handler(async (req) => {
  const { client } = await userClient(req);
  const body = await readJson<{ order_id: string; to: string; note?: string; pickup_code?: string }>(req);
  if (!STATUSES.includes(body.to)) throw new HttpError(400, "Statut invalide");

  const { data, error } = await client.rpc("transition_order", {
    _order_id: body.order_id, _to: body.to, _note: body.note ?? null, _pickup_code: body.pickup_code ?? null,
  }).single();
  if (error) throw error;
  const { order_row: order, needs_refund } = data as { order_row: { id: string; stripe_payment_intent_id: string | null }; needs_refund: boolean };

  if (needs_refund && order.stripe_payment_intent_id) {
    await stripe.refunds.create(
      { payment_intent: order.stripe_payment_intent_id, reason: "requested_by_customer", metadata: { order_id: order.id } },
      { idempotencyKey: `refund-${order.id}` },
    );
    await admin.from("orders").update({ status: "refunded" }).eq("id", order.id);
  } else if (body.to === "cancelled" && order.stripe_payment_intent_id) {
    // Paiement jamais abouti : on annule l'intention pour éviter un débit tardif.
    try { await stripe.paymentIntents.cancel(order.stripe_payment_intent_id); } catch { /* déjà finalisé */ }
  }
  return json(req, { ok: true, refunded: needs_refund });
}));
