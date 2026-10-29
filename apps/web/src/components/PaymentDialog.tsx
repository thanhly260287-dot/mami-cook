import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { formatEuros, t } from "@mami/shared";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CheckoutResult } from "@/lib/api";

export function PaymentDialog({ result, onClose, onPaid }: { result: CheckoutResult; onClose: () => void; onPaid: () => void }) {
  const stripePromise = useMemo(() => loadStripe(result.publishable_key ?? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY), [result.publishable_key]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("Paiement — commande n°{n}", { n: result.order_number ?? "" })} description={t("Vos plats sont réservés pendant 15 minutes.")}>
      <Elements stripe={stripePromise} options={{ clientSecret: result.client_secret!, locale: "fr", appearance: { theme: "stripe", variables: { colorPrimary: "#3fbef0", borderRadius: "12px", fontFamily: "Plus Jakarta Sans, system-ui, sans-serif" } } }}>
        <PayForm amount={result.total_cents ?? 0} orderId={result.order_id} onPaid={onPaid} />
      </Elements>
    </Dialog>
  );
}

function PayForm({ amount, orderId, onPaid }: { amount: number; orderId: string; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/commande/${orderId}?paye=1` },
      redirect: "if_required",
    });
    setLoading(false);
    if (error) toast.error(error.message ?? t("Paiement refusé"));
    else onPaid();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!stripe}><Lock />{" "}{t("Payer")}{" "}{formatEuros(amount)}</Button>
      <p className="text-center text-xs text-muted-foreground">{t("La cuisinière n'est payée qu'une fois votre commande remise. Annulation gratuite tant qu'elle n'est pas acceptée.")}</p>
    </form>
  );
}
