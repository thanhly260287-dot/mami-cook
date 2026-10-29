// Tâche planifiée (toutes les heures) : vire leur part aux cuisiniers une fois le délai écoulé.
import { handler, json } from "../_shared/cors.ts";
import { admin, requireCronSecret, stripe } from "../_shared/clients.ts";

Deno.serve(handler(async (req) => {
  requireCronSecret(req);
  const { data: payouts, error } = await admin
    .from("payouts")
    .select("id, order_id, amount_cents, cook:cooks!inner(stripe_account_id, stripe_payouts_enabled), order:orders!inner(stripe_charge_id, status)")
    .eq("status", "pending")
    .lte("available_at", new Date().toISOString())
    .limit(200);
  if (error) throw error;

  let done = 0, skipped = 0;
  for (const p of payouts ?? []) {
    // deno-lint-ignore no-explicit-any
    const cook = p.cook as any, order = p.order as any;
    if (!cook.stripe_account_id || !cook.stripe_payouts_enabled || order.status !== "completed" || !order.stripe_charge_id) {
      skipped++;
      continue;
    }
    try {
      const transfer = await stripe.transfers.create({
        amount: p.amount_cents,
        currency: "eur",
        destination: cook.stripe_account_id,
        transfer_group: p.order_id,
        source_transaction: order.stripe_charge_id,
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
