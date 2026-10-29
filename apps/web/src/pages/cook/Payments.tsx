import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Landmark } from "lucide-react";
import { formatEuros, t, intlLocale } from "@mami/shared";
import { fetchMyPayouts } from "@/lib/api";
import { callFunction } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, Spinner } from "@/components/ui/misc";

export default function Payments() {
  const { cook } = useAuth();
  const payouts = useQuery({ queryKey: ["payouts", cook!.id], queryFn: () => fetchMyPayouts(cook!.id) });
  const [loading, setLoading] = useState(false);
  const go = async (mode: "onboarding" | "dashboard") => {
    setLoading(true);
    try {
      const { url } = await callFunction<{ url: string }>("connect-onboarding", { mode, return_url: window.location.href });
      window.location.assign(url);
    } catch (e) {
      toast.error(errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Landmark className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="font-bold">{t("Compte de versement Stripe")}</p>
              {cook!.stripe_charges_enabled ? (
                <p className="flex items-center gap-1 text-sm text-status-hot"><CheckCircle2 className="h-4 w-4" />{" "}{t("Actif — vous pouvez recevoir des commandes")}{cook!.stripe_payouts_enabled ? "" : t(" (virements en attente de vérification)")}</p>
              ) : <p className="text-sm text-muted-foreground">{t("Vérification d'identité et IBAN, sécurisés par Stripe (5 min).")}</p>}
            </div>
          </div>
          {cook!.stripe_charges_enabled
            ? <Button variant="secondary" loading={loading} onClick={() => go("dashboard")}><ExternalLink />{" "}{t("Mon espace Stripe")}</Button>
            : <Button loading={loading} onClick={() => go("onboarding")}>{cook!.stripe_account_id ? t("Terminer la configuration") : t("Connecter mon compte bancaire")}</Button>}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 font-bold">{t("Comment suis-je payé ?")}</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>{t("Le client paie à la commande ; l'argent est sécurisé.")}</li>
          <li>{t("Une fois la commande remise, votre part est virée sur votre compte Stripe sous 24 h, puis sur votre compte bancaire selon votre calendrier Stripe.")}</li>
          <li>{t("Vous touchez le prix que vous avez fixé. Les remises volume (−10 % / −15 %) sont partagées au prorata avec la plateforme. Les codes promo sont à notre charge.")}</li>
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-bold">{t("Historique des versements")}</h2>
        {payouts.isLoading ? <Spinner /> : !payouts.data?.length ? <p className="text-sm text-muted-foreground">{t("Aucun versement pour l'instant.")}</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-2">{t("Commande")}</th><th className="pb-2">{t("Date")}</th><th className="pb-2">{t("Statut")}</th><th className="pb-2 text-right">{t("Montant")}</th></tr></thead>
            <tbody className="divide-y divide-border">
              {payouts.data.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">n°{p.orders?.number}</td>
                  <td className="py-2">{new Date(p.created_at).toLocaleDateString(intlLocale())}</td>
                  <td className="py-2"><Badge tone={p.status === "transferred" ? "success" : p.status === "pending" ? "warn" : "danger"}>{{ pending: t("En attente"), transferred: t("Versé"), failed: t("Bloqué"), reversed: t("Annulé") }[p.status] ?? p.status}</Badge></td>
                  <td className="py-2 text-right font-semibold tabular-nums">{formatEuros(p.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
