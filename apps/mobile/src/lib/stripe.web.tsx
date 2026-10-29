// Le SDK Stripe natif n'existe pas sur le web : on renvoie vers le site pour payer.
import type { ReactNode } from "react";

export function StripeProvider({ children }: { children: ReactNode; publishableKey: string; merchantIdentifier?: string; urlScheme?: string }) {
  return <>{children}</>;
}

const unavailable = { error: { code: "Unavailable", message: "Paiement disponible dans l'application mobile ou sur le site." } };
export function useStripe() {
  return {
    initPaymentSheet: async (_p: unknown) => unavailable,
    presentPaymentSheet: async () => unavailable,
  };
}
