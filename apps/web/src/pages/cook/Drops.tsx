import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, Copy, Lock, Minus, Plus } from "lucide-react";
import { dropSchema, formatTime, relativeDay, t, intlLocale } from "@mami/shared";
import { fetchMyDishes, fetchMyDrops } from "@/lib/api";
import { requireSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage, photoUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";

const today = () => new Date().toISOString().slice(0, 10);

export default function Drops() {
  const { cook } = useAuth();
  const qc = useQueryClient();
  const drops = useQuery({ queryKey: ["my-drops", cook!.id], queryFn: () => fetchMyDrops(cook!.id) });
  const dishes = useQuery({ queryKey: ["my-dishes", cook!.id], queryFn: () => fetchMyDishes(cook!.id) });
  const [open, setOpen] = useState(false);
  const [republish, setRepublish] = useState<string | null>(null);
  const [repDate, setRepDate] = useState(today());
  const approved = cook!.status === "approved";

  const update = useMutation({
    mutationFn: async (v: { id: string; quantity_total?: number; status?: string }) => {
      const { id, ...patch } = v;
      const r = await requireSupabase().from("drops").update(patch).eq("id", id);
      if (r.error) throw r.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-drops"] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const rep = useMutation({
    mutationFn: async () => {
      const r = await requireSupabase().rpc("republish_drop", { _drop_id: republish, _date: repDate });
      if (r.error) throw r.error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-drops"] }); setRepublish(null); toast.success(t("Vente republiée")); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const upcoming = (drops.data ?? []).filter((d) => d.available_on >= today());
  const past = (drops.data ?? []).filter((d) => d.available_on < today());

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("Une « vente » = un plat proposé un jour précis, en quantité limitée.")}</p>
        <Button disabled={!approved || !dishes.data?.length} onClick={() => setOpen(true)}><CalendarPlus />{" "}{t("Programmer une vente")}</Button>
      </div>
      {!approved && <p className="mb-4 text-sm text-status-warn">{t("Vous pourrez programmer des ventes dès que votre cuisine sera validée.")}</p>}
      {drops.isLoading ? <Spinner /> : !upcoming.length && !past.length ? (
        <EmptyState icon="📅" title={t("Aucune vente programmée")}>{t("Créez d'abord un plat, puis programmez-le pour aujourd'hui ou les jours suivants.")}</EmptyState>
      ) : (
        <>
          <h2 className="mb-3 font-bold">{t("À venir")}</h2>
          <div className="mb-8 grid gap-3 md:grid-cols-2">
            {upcoming.map((d) => {
              const sold = d.quantity_total - d.quantity_remaining;
              return (
                <Card key={d.id} className="flex gap-4 p-4">
                  <img src={photoUrl(d.dishes?.photos[0])} alt="" className="h-20 w-20 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold">{d.dishes?.title}</p>
                      <Badge tone={d.status === "open" ? "success" : d.status === "sold_out" ? "warn" : "muted"}>{{ open: t("En vente"), sold_out: t("Épuisé"), closed: t("Fermée"), cancelled: t("Annulée"), scheduled: t("Programmée") }[d.status]}</Badge>
                    </div>
                    <p className="text-sm capitalize text-muted-foreground">{relativeDay(d.available_on)} · {formatTime(d.ready_from)}–{formatTime(d.ready_until)}</p>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span>{sold}{" "}{t("vendu(s) /")}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" disabled={d.quantity_total <= Math.max(1, sold)} onClick={() => update.mutate({ id: d.id, quantity_total: d.quantity_total - 1 })} aria-label={t("Diminuer")}><Minus /></Button>
                      <b className="w-6 text-center tabular-nums">{d.quantity_total}</b>
                      <Button size="icon" variant="outline" className="h-7 w-7" disabled={d.quantity_total >= 200} onClick={() => update.mutate({ id: d.id, quantity_total: d.quantity_total + 1 })} aria-label={t("Augmenter")}><Plus /></Button>
                      {["open", "sold_out"].includes(d.status) && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => update.mutate({ id: d.id, status: "closed" })}><Lock />{" "}{t("Fermer")}</Button>}
                      {d.status === "closed" && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => update.mutate({ id: d.id, status: "open" })}>{t("Rouvrir")}</Button>}
                    </div>
                  </div>
                </Card>
              );
            })}
            {!upcoming.length && <p className="text-sm text-muted-foreground">{t("Rien de programmé.")}</p>}
          </div>
          {past.length > 0 && (
            <>
              <h2 className="mb-3 font-bold">{t("Ventes passées")}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {past.map((d) => (
                  <Card key={d.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span><b>{d.dishes?.title}</b> · {new Date(d.available_on).toLocaleDateString(intlLocale())} · {d.quantity_total - d.quantity_remaining}/{d.quantity_total} vendus</span>
                    <Button size="sm" variant="secondary" disabled={!approved} onClick={() => { setRepublish(d.id); setRepDate(today()); }}><Copy />{" "}{t("Republier")}</Button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {open && <NewDrop dishes={(dishes.data ?? []).filter((d) => d.is_active)} onClose={() => setOpen(false)} />}
      <Dialog open={!!republish} onOpenChange={(o) => !o && setRepublish(null)} title={t("Republier cette vente")}>
        <Field label={t("Jour")} htmlFor="rd"><Input id="rd" type="date" min={today()} value={repDate} onChange={(e) => setRepDate(e.target.value)} /></Field>
        <Button className="mt-4 w-full" loading={rep.isPending} onClick={() => rep.mutate()}>{t("Republier")}</Button>
      </Dialog>
    </div>
  );
}

function NewDrop({ dishes, onClose }: { dishes: { id: string; title: string }[]; onClose: () => void }) {
  const { cook } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ dishId: dishes[0]?.id ?? "", dates: [today()], readyFrom: "11:30", readyUntil: "20:30", quantity: "10" });
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() + i * 86400000).toISOString().slice(0, 10));
  const save = useMutation({
    mutationFn: async () => {
      if (!f.dates.length) throw new Error(t("Choisissez au moins un jour"));
      const rows = f.dates.map((date) => {
        const p = dropSchema.safeParse({ dishId: f.dishId, availableOn: date, readyFrom: f.readyFrom, readyUntil: f.readyUntil, quantity: Number(f.quantity) });
        if (!p.success) throw new Error(p.error.issues[0].message);
        return { dish_id: f.dishId, cook_id: cook!.id, available_on: date, ready_from: f.readyFrom, ready_until: f.readyUntil, quantity_total: p.data.quantity, quantity_remaining: p.data.quantity };
      });
      const r = await requireSupabase().from("drops").insert(rows);
      if (r.error) throw r.error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-drops"] }); toast.success(t("Vente programmée 🎉")); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("Programmer une vente")}>
      <div className="space-y-4">
        <Field label={t("Plat")} htmlFor="dish"><Select id="dish" value={f.dishId} onChange={(e) => setF({ ...f, dishId: e.target.value })}>{dishes.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</Select></Field>
        <div>
          <p className="mb-2 text-sm font-semibold">{t("Jours (plusieurs possibles)")}</p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {days.map((d) => {
              const on = f.dates.includes(d);
              return <button key={d} type="button" onClick={() => setF({ ...f, dates: on ? f.dates.filter((x) => x !== d) : [...f.dates, d] })}
                className={`rounded-lg border px-1 py-2 text-xs capitalize ${on ? "border-primary bg-primary/10 font-bold text-primary" : "border-border"}`}>
                {new Date(d).toLocaleDateString(intlLocale(), { weekday: "short" })}<br />{d.slice(8)}
              </button>;
            })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("Prêt dès")} htmlFor="rf"><Input id="rf" type="time" value={f.readyFrom} onChange={(e) => setF({ ...f, readyFrom: e.target.value })} /></Field>
          <Field label={t("Jusqu'à")} htmlFor="ru"><Input id="ru" type="time" value={f.readyUntil} onChange={(e) => setF({ ...f, readyUntil: e.target.value })} /></Field>
          <Field label={t("Portions")} htmlFor="qt"><Input id="qt" type="number" min={1} max={200} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></Field>
        </div>
        <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>{t("Mettre en vente")}</Button>
      </div>
    </Dialog>
  );
}
