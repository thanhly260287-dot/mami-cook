// Reçu imprimable (ou à enregistrer en PDF depuis le navigateur).
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { formatDate, formatMoney, t } from "@mami/shared";
import { fetchOrder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { Seo } from "@/components/Seo";

export default function Receipt() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ["order", id], queryFn: () => fetchOrder(id!) });
  if (q.isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  const o = q.data;
  if (!o || !o.paid_at) return <EmptyState icon="🧾" title={t("Reçu indisponible")}>{t("Le reçu est disponible une fois la commande payée.")}</EmptyState>;
  const cur = o.currency ?? "EUR";
  const m = (c: number) => formatMoney(c, cur);
  return (
    <div className="container max-w-2xl py-8 print:py-0">
      <Seo title={t("Reçu n°{n}", { n: o.number })} noindex />
      <div className="mb-4 flex justify-end print:hidden"><Button onClick={() => window.print()}><Printer />{t("Imprimer / PDF")}</Button></div>
      <article className="rounded-2xl border border-border bg-card p-8 text-sm print:border-0 print:p-0">
        <header className="flex items-start justify-between border-b border-border pb-4">
          <div><p className="text-2xl font-extrabold">MAMI COOK</p><p className="text-muted-foreground">{t("Reçu de commande")}</p></div>
          <div className="text-right"><p className="font-bold">n°{o.number}</p><p>{formatDate(o.paid_at, { day: "numeric", month: "long", year: "numeric" })}</p></div>
        </header>
        <p className="mt-4">{t("Vendu par :")} <b>{o.cooks?.kitchen_name}</b>{" "}{t("via la plateforme MAMI COOK")}</p>
        <table className="mt-4 w-full">
          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2">{t("Article")}</th><th className="py-2 text-right">{t("Qté")}</th><th className="py-2 text-right">{t("Montant")}</th></tr></thead>
          <tbody>{o.order_items?.map((it) => (
            <tr key={it.id} className="border-b border-border/50"><td className="py-2">{it.title}{it.extras.length > 0 && <span className="block text-xs text-muted-foreground">+ {it.extras.map((e) => e.name).join(", ")}</span>}</td><td className="py-2 text-right">{it.quantity}</td><td className="py-2 text-right tabular-nums">{m(it.line_total_cents)}</td></tr>
          ))}</tbody>
        </table>
        <dl className="ml-auto mt-4 w-64 space-y-1">
          <Line l={t("Sous-total")} v={m(o.subtotal_cents)} />
          {o.discount_cents > 0 && <Line l={t("Remise volume")} v={`−${m(o.discount_cents)}`} />}
          {o.promo_cents > 0 && <Line l={t("Code promo")} v={`−${m(o.promo_cents)}`} />}
          {o.delivery_fee_cents > 0 && <Line l={t("Livraison")} v={m(o.delivery_fee_cents)} />}
          {(o.tip_cents ?? 0) > 0 && <Line l={t("Pourboire livreur")} v={m(o.tip_cents!)} />}
          <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><dt>{t("Total payé")}</dt><dd className="tabular-nums">{m(o.total_cents)}</dd></div>
        </dl>
        <p className="mt-6 text-xs text-muted-foreground">{t("Les prix des plats incluent les frais de service de la plateforme. Ce reçu n'est pas une facture : si vous avez besoin d'une facture, demandez-la à la cuisinière via la messagerie de la commande.")}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("Paiement par carte via Stripe.")} · {t("Commande passée le {d}", { d: formatDate(o.created_at, { day: "numeric", month: "long", year: "numeric" }) })}</p>
      </article>
    </div>
  );
}

function Line({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between"><dt>{l}</dt><dd className="tabular-nums">{v}</dd></div>;
}
