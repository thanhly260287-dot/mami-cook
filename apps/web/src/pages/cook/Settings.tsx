import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { CUISINES, formatEuros, t } from "@mami/shared";
import { requireSupabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn, errorMessage, photoUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, Switch } from "@/components/ui/misc";
import { Field, Input, Textarea } from "@/components/ui/input";

export default function CookSettings() {
  const { cook, user, refreshCook } = useAuth();
  const c = cook!;
  const [f, setF] = useState({
    kitchen_name: c.kitchen_name, bio: c.bio ?? "", cuisines: c.cuisines, offers_pickup: c.offers_pickup, offers_delivery: c.offers_delivery,
    delivery_radius_km: Number(c.delivery_radius_km), delivery_fee_cents: c.delivery_fee_cents, cover_url: c.cover_url,
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!f.offers_pickup && !f.offers_delivery) throw new Error(t("Proposez au moins le retrait ou la livraison"));
      const r = await requireSupabase().from("cooks").update({ ...f, bio: f.bio.trim() || null, kitchen_name: f.kitchen_name.trim() }).eq("id", c.id);
      if (r.error) throw r.error;
    },
    onSuccess: () => { refreshCook(); toast.success(t("Modifications enregistrées")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cover = async (file: File) => {
    try { setF({ ...f, cover_url: await uploadImage("covers", user!.id, file) }); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Card className="space-y-5 p-6">
        <div>
          <p className="mb-2 text-sm font-semibold">{t("Bannière")}</p>
          <label className="block h-32 cursor-pointer overflow-hidden rounded-2xl gradient-primary" style={f.cover_url ? { background: `url(${photoUrl(f.cover_url)}) center/cover` } : undefined}>
            <span className="flex h-full items-center justify-center bg-black/20 text-sm font-semibold text-white">{t("Changer la bannière")}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && cover(e.target.files[0])} />
          </label>
        </div>
        <Field label={t("Nom de la cuisine")} htmlFor="kn"><Input id="kn" value={f.kitchen_name} onChange={(e) => setF({ ...f, kitchen_name: e.target.value })} maxLength={60} /></Field>
        <Field label={t("Présentation")} htmlFor="bio"><Textarea id="bio" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={1000} /></Field>
        <div>
          <p className="mb-2 text-sm font-semibold">{t("Cuisines")}</p>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((x) => {
              const on = f.cuisines.includes(x.id);
              return <button key={x.id} type="button" onClick={() => setF({ ...f, cuisines: on ? f.cuisines.filter((y) => y !== x.id) : f.cuisines.length < 5 ? [...f.cuisines, x.id] : f.cuisines })}
                className={cn("rounded-xl border px-3 py-1.5 text-sm", on ? "border-primary bg-primary/10 text-primary" : "border-border")}>{x.emoji} {t(x.label)}</button>;
            })}
          </div>
        </div>
        <label className="flex items-center justify-between"><b>{t("Retrait sur place")}</b><Switch checked={f.offers_pickup} onCheckedChange={(v) => setF({ ...f, offers_pickup: v })} /></label>
        <label className="flex items-center justify-between"><b>{t("Livraison")}</b><Switch checked={f.offers_delivery} onCheckedChange={(v) => setF({ ...f, offers_delivery: v })} /></label>
        {f.offers_delivery && (
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Rayon : ${f.delivery_radius_km} km`}><input type="range" min={1} max={15} value={f.delivery_radius_km} onChange={(e) => setF({ ...f, delivery_radius_km: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" /></Field>
            <Field label={`Frais : ${formatEuros(f.delivery_fee_cents)}`}><input type="range" min={0} max={800} step={50} value={f.delivery_fee_cents} onChange={(e) => setF({ ...f, delivery_fee_cents: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" /></Field>
          </div>
        )}
        <Button loading={save.isPending} onClick={() => save.mutate()}>{t("Enregistrer")}</Button>
      </Card>
      <p className="text-sm text-muted-foreground">{t("Votre page publique :")}{" "}<Link to={`/cuisine/${c.slug}`} className="font-semibold text-primary">/cuisine/{c.slug}</Link></p>
    </div>
  );
}
