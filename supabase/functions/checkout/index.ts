// Crée la commande (validation + réservation du stock côté base) puis le paiement Stripe.
import { handler, HttpError, json, readJson } from "../_shared/cors.ts";
import { admin, stripe, userClient } from "../_shared/clients.ts";

interface Body {
  lines: { drop_id: string; quantity: number; extra_ids?: string[]; menu_deal_id?: string | null }[];
  fulfillment: "delivery" | "pickup" | "courier";
  tip_cents?: number;
  address_id?: string | null;
  note?: string | null;
  promo_code?: string | null;
  idempotency_key?: string;
}

Deno.serve(handler(async (req) => {
  const { client, userId, email } = await userClient(req);
  const body = await readJson<Body>(req);
  if (!Array.isArray(body.lines)) throw new HttpError(400, "Panier invalide");

  // 1. La base calcule les prix et réserve le stock (cf. place_order).
  const { data: order, error } = await client.rpc("place_order", {
    p_lines: body.lines,
    p_fulfillment: body.fulfillment,
    p_address_id: body.address_id ?? null,
    p_note: body.note ?? null,
    p_promo_code: body.promo_code ?? null,
    p_idempotency_key: body.idempotency_key ?? null,
    p_tip_cents: Number.isInteger(body.tip_cents) ? body.tip_cents : 0,
  }).single();
  if (error) throw error;
  const o = order as { id: string; number: number; total_cents: number; currency: string; cook_id: string; status: string; stripe_payment_intent_id: string | null };

  if (o.status !== "pending_payment") return json(req, { order_id: o.id, status: o.status });

  // 2. La cuisine doit pouvoir recevoir des paiements.
  const { data: cook } = await admin.from("cooks").select("stripe_charges_enabled, kitchen_name").eq("id", o.cook_id).single();
  if (!cook?.stripe_charges_enabled) {
    await client.rpc("transition_order", { _order_id: o.id, _to: "cancelled", _note: "Paiements non activés pour cette cuisine" });
    throw new HttpError(409, "Cette cuisine ne peut pas encore recevoir de paiements");
  }

  // 3. PaymentIntent (réutilisé si l'utilisateur relance le paiement).
  let pi;
  if (o.stripe_payment_intent_id) {
    pi = await stripe.paymentIntents.retrieve(o.stripe_payment_intent_id);
  } else {
    pi = await stripe.paymentIntents.create(
      {
        amount: o.total_cents,
        currency: o.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        receipt_email: email,
        transfer_group: o.id,
        description: `MAMI COOK — commande n°${o.number} (${cook.kitchen_name})`,
        metadata: { order_id: o.id, customer_id: userId },
      },
      { idempotencyKey: `order-${o.id}` },
    );
    const { error: upErr } = await admin.from("orders").update({ stripe_payment_intent_id: pi.id }).eq("id", o.id);
    if (upErr) throw upErr;
  }

  return json(req, {
    order_id: o.id,
    order_number: o.number,
    total_cents: o.total_cents,
    currency: o.currency,
    client_secret: pi.client_secret,
    publishable_key: Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
  });
}));
