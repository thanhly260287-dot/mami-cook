// Tâche planifiée (toutes les heures) : vire leur part aux cuisinières et aux livreurs une fois le délai écoulé.
import { handler, json } from "../_shared/cors.ts";
import { admin, requireCronSecret, stripe } from "../_shared/clients.ts";

Deno.serve(handler(async (req) => {
  requireCronSecret(req);
  const { data: payouts, error } = await admin
    .from("payouts")
    .select("id, order_id, amount_cents, courier_id, cook:cooks(stripe_account_id, stripe_payouts_enabled), courier:couriers(stripe_account_id, stripe_payouts_enabled), order:orders!inner(stripe_charge_id, status, currency)")
    .eq("status", "pending")
    .lte("available_at", new Date().toISOString())
    .limit(200);
  if (error) throw error;

  let done = 0, skipped = 0;
  for (const p of payouts ?? []) {
    // deno-lint-ignore no-explicit-any
    const payee = (p.cook ?? p.courier) as any, order = p.order as any;
    // Commande terminée, ou dédommagement d'un livreur pour une commande annulée après son arrivée.
    const compensation = !!p.courier_id && (order.status === "cancelled" || order.status === "refunded");
    if (!payee?.stripe_account_id || !payee.stripe_payouts_enabled || !order.stripe_charge_id
        || (order.status !== "completed" && !compensation)) {
      skipped++;
      continue;
    }
    try {
      const transfer = await stripe.transfers.create({
        amount: p.amount_cents,
        currency: String(order.currency).toLowerCase(),
        destination: payee.stripe_account_id,
        transfer_group: p.order_id,
        // Un paiement remboursé ne peut plus financer un transfert : le dédommagement vient du solde de la plateforme.
        ...(compensation ? {} : { source_transaction: order.stripe_charge_id }),
        metadata: { order_id: p.order_id, payout_id: p.id },
      }, { idempotencyKey: `payout-${p.id}` });
      await admin.from("payouts").update({ status: "transferred", stripe_transfer_id: transfer.id }).eq("id", p.id);
      done++;
    } catch (e) {
      console.error("payout", p.id, e);
      await admin.from("payouts").update({ status: "failed" }).eq("id", p.id);
    }
  }
  return json(req, { transferred: done, skipped });
}));
