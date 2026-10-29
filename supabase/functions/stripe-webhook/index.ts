// Webhook Stripe : la SEULE source de vérité pour les paiements.
// Signature vérifiée, événements dédupliqués (idempotence).
import Stripe from "npm:stripe@16.12.0";
import { admin, stripe } from "../_shared/clients.ts";

const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret, undefined, cryptoProvider);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const { error: dupErr } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dupErr) {
    if (dupErr.code === "23505") return new Response("Already processed", { status: 200 });
    return new Response("DB error", { status: 500 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata.order_id;
        if (!orderId) break;
        await admin.from("orders").update({ stripe_charge_id: pi.latest_charge as string }).eq("id", orderId);
        const { data, error } = await admin.rpc("mark_order_paid", {
          _order_id: orderId, _payment_intent: pi.id, _amount_cents: pi.amount_received,
        }).single();
        if (error) throw error;
        const order = data as { status: string };
        if (order.status === "cancelled") {
          // Payé après expiration et stock épuisé : remboursement immédiat.
          await stripe.refunds.create({ payment_intent: pi.id }, { idempotencyKey: `refund-${orderId}` });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata.order_id) {
          await admin.from("notifications").insert({
            user_id: pi.metadata.customer_id, type: "payment_failed", title: "Paiement refusé",
            body: pi.last_payment_error?.message ?? "Réessayez avec un autre moyen de paiement",
            data: { order_id: pi.metadata.order_id },
          });
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId = charge.payment_intent as string;
        if (charge.refunded) {
          await admin.from("orders").update({ status: "refunded" }).eq("stripe_payment_intent_id", piId).in("status", ["cancelled", "paid", "completed"]);
        }
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const { data: o } = await admin.from("orders").select("id").eq("stripe_charge_id", dispute.charge as string).maybeSingle();
        await admin.from("audit_log").insert({ action: "stripe.dispute", target_type: "order", target_id: o?.id ?? null, data: { dispute: dispute.id, reason: dispute.reason, amount: dispute.amount } });
        // Bloque le versement au cuisinier tant que le litige n'est pas résolu.
        if (o) await admin.from("payouts").update({ status: "failed" }).eq("order_id", o.id).eq("status", "pending");
        break;
      }
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        await admin.from("cooks").update({
          stripe_charges_enabled: !!acct.charges_enabled && !!acct.details_submitted,
          stripe_payouts_enabled: !!acct.payouts_enabled,
        }).eq("stripe_account_id", acct.id);
        break;
      }
    }
  } catch (e) {
    console.error(event.type, e);
    // On supprime la trace pour que Stripe renvoie l'événement plus tard.
    await admin.from("stripe_events").delete().eq("id", event.id);
    return new Response("Handler error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
