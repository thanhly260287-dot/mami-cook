import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Eye, EyeOff, Pencil, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { ALLERGENS, COURSES, CUISINES, DIETS, TEMPERATURES, customerPrice, dishSchema, formatEuros, type Dish, type DishExtra, t } from "@mami/shared";
import { aiImage, fetchMyDishes, uploadImage } from "@/lib/api";
import { requireSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cn, errorMessage, photoUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

type DishWithExtras = Dish & { dish_extras: DishExtra[] };

export default function Dishes() {
  const { cook } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-dishes", cook!.id], queryFn: () => fetchMyDishes(cook!.id) });
  const [editing, setEditing] = useState<DishWithExtras | "new" | null>(null);
  const toggle = useMutation({
    mutationFn: async (d: Dish) => { const r = await requireSupabase().from("dishes").update({ is_active: !d.is_active }).eq("id", d.id); if (r.error) throw r.error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-dishes"] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{q.data?.length ?? 0}{" "}{t("plat(s) · créez vos plats une fois, puis programmez des ventes.")}</p>
        <Button onClick={() => setEditing("new")}><Plus />{" "}{t("Nouveau plat")}</Button>
      </div>
      {q.isLoading ? <Spinner /> : !q.data?.length ? (
        <EmptyState icon="🍲" title={t("Ajoutez votre premier plat")} action={<Button onClick={() => setEditing("new")}><Plus />{" "}{t("Créer un plat")}</Button>}>{t("Une belle photo, un prix, les allergènes : c'est tout !")}</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((d) => (
            <Card key={d.id} className={cn("overflow-hidden", !d.is_active && "opacity-60")}>
              <img src={photoUrl(d.photos[0])} alt="" className="aspect-video w-full object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{d.title}</p>
                  <p className="shrink-0 text-sm"><b>{formatEuros(d.price_cents)}</b><span className="block text-xs text-muted-foreground">{t("client :")}{" "}{formatEuros(customerPrice(d.price_cents))}</span></p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.is_hidden_by_moderation && <Badge tone="danger">{t("Masqué par la modération")}</Badge>}
                  {!d.is_active && <Badge>{t("Désactivé")}</Badge>}
                  {d.dish_extras.length > 0 && <Badge>{d.dish_extras.length}{" "}{t("supplément(s)")}</Badge>}
                  {d.rating_count > 0 && <Badge tone="accent">⭐ {Number(d.rating_avg).toFixed(1)} ({d.rating_count})</Badge>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(d)}><Pencil />{" "}{t("Modifier")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate(d)}>{d.is_active ? <><EyeOff />{" "}{t("Désactiver")}</> : <><Eye />{" "}{t("Activer")}</>}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <DishEditor dish={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DishEditor({ dish, onClose }: { dish: DishWithExtras | null; onClose: () => void }) {
  const { cook, user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({
    title: dish?.title ?? "", description: dish?.description ?? "", ingredients: dish?.ingredients ?? "",
    cuisine: dish?.cuisine ?? cook!.cuisines[0] ?? "french", course: dish?.course ?? "main", price: dish ? (dish.price_cents / 100).toFixed(2) : "",
    temperature: dish?.temperature ?? "hot", allergens: dish?.allergens ?? [], diets: dish?.diets ?? [],
    spiceLevel: dish?.spice_level ?? 0, portion: dish?.portion_grams ? String(dish.portion_grams) : "", photos: dish?.photos ?? [],
  });
  const [extras, setExtras] = useState<{ id?: string; name: string; emoji: string; price: string }[]>(
    (dish?.dish_extras ?? []).filter((e) => e.is_active).sort((a, b) => a.position - b.position).map((e) => ({ id: e.id, name: e.name, emoji: e.emoji ?? "", price: (e.price_cents / 100).toFixed(2) })));
  const [menu, setMenu] = useState<{ id?: string; name: string; items: string; price: string } | null>(null);
  const menuQ = useQuery({
    queryKey: ["menu", dish?.id], enabled: !!dish,
    queryFn: async () => (await requireSupabase().from("menu_deals").select("*").eq("main_dish_id", dish!.id).eq("is_active", true).maybeSingle()).data,
  });
  useEffect(() => {
    if (menuQ.data) setMenu({ id: menuQ.data.id, name: menuQ.data.name, items: menuQ.data.items_description, price: (menuQ.data.price_cents / 100).toFixed(2) });
  }, [menuQ.data]);
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const runAi = async (mode: "enhance" | "background" | "generate", path?: string) => {
    if (mode === "generate" && f.title.trim().length < 3) return toast.error(t("Donnez d'abord un nom au plat"));
    setAiBusy(path ?? mode);
    try {
      const res = await aiImage(mode, mode === "generate" ? { description: `${f.title}. ${f.description}`.slice(0, 300) } : { path });
      setF((p) => ({ ...p, photos: [...p.photos, res.path].slice(0, 8) }));
      toast.success(t("Nouvelle photo ajoutée ({n} retouches restantes aujourd'hui)", { n: res.remaining_today }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAiBusy(null);
    }
  };
  const cents = (s: string) => Math.round(parseFloat(s.replace(",", ".")) * 100);

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const file of Array.from(files).slice(0, 8 - f.photos.length)) {
        if (file.size > 15 * 1024 * 1024) throw new Error(t("Photo trop lourde (15 Mo max.)"));
        paths.push(await uploadImage("dish-photos", user!.id, file));
      }
      setF((p) => ({ ...p, photos: [...p.photos, ...paths] }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const parsed = dishSchema.safeParse({
        title: f.title, description: f.description, ingredients: f.ingredients, cuisine: f.cuisine, course: f.course, priceCents: cents(f.price),
        temperature: f.temperature, allergens: f.allergens, diets: f.diets, spiceLevel: f.spiceLevel,
        portionGrams: f.portion ? Number(f.portion) : undefined,
        extras: extras.filter((e) => e.name.trim()).map((e) => ({ name: e.name, emoji: e.emoji || undefined, priceCents: cents(e.price || "0") })),
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (!f.photos.length) throw new Error(t("Ajoutez au moins une photo"));
      const sb = requireSupabase();
      const row = {
        cook_id: cook!.id, title: parsed.data.title, description: parsed.data.description || null, ingredients: parsed.data.ingredients || null,
        cuisine: parsed.data.cuisine, course: parsed.data.course, price_cents: parsed.data.priceCents, temperature: parsed.data.temperature, allergens: parsed.data.allergens,
        diets: parsed.data.diets, spice_level: parsed.data.spiceLevel, portion_grams: parsed.data.portionGrams ?? null, photos: f.photos,
      };
      const res = dish ? await sb.from("dishes").update(row).eq("id", dish.id).select("id").single() : await sb.from("dishes").insert(row).select("id").single();
      if (res.error) throw res.error;
      const dishId = res.data.id as string;

      // Suppléments : désactive ceux retirés, met à jour / crée les autres
      const keep = extras.filter((e) => e.id).map((e) => e.id!);
      const removed = (dish?.dish_extras ?? []).filter((e) => !keep.includes(e.id)).map((e) => e.id);
      if (removed.length) await sb.from("dish_extras").update({ is_active: false }).in("id", removed);
      for (const [i, e] of extras.filter((x) => x.name.trim()).entries()) {
        const data = { dish_id: dishId, name: e.name.trim(), emoji: e.emoji || null, price_cents: cents(e.price || "0"), position: i, is_active: true };
        const r = e.id ? await sb.from("dish_extras").update(data).eq("id", e.id) : await sb.from("dish_extras").insert(data);
        if (r.error) throw r.error;
      }

      if (menu && menu.name.trim() && menu.price) {
        const data = { cook_id: cook!.id, main_dish_id: dishId, name: menu.name.trim(), items_description: menu.items.trim() || menu.name.trim(), price_cents: cents(menu.price), is_active: true };
        const r = menu.id ? await sb.from("menu_deals").update(data).eq("id", menu.id) : await sb.from("menu_deals").insert(data);
        if (r.error) throw r.error;
      } else if (menuQ.data) {
        await sb.from("menu_deals").update({ is_active: false }).eq("id", menuQ.data.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-dishes"] }); toast.success(t("Plat enregistré")); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const toggleIn = (k: "allergens" | "diets", id: string) => setF((p) => ({ ...p, [k]: p[k].includes(id) ? p[k].filter((x) => x !== id) : [...p[k], id] }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={dish ? t("Modifier le plat") : t("Nouveau plat")} side="right">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold">{t("Photos (8 max.)")}</p>
          <div className="grid grid-cols-4 gap-2">
            {f.photos.map((p, i) => (
              <div key={p} className="relative">
                <img src={photoUrl(p)} alt="" className="aspect-square w-full rounded-xl object-cover" />
                {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">{t("Principale")}</span>}
                {p.includes("/ia-illustration") && <span className="absolute left-1 top-1 rounded bg-accent px-1 text-[10px] text-white">{t("Illustration IA")}</span>}
                {!p.includes("/ia-") && f.photos.length < 8 && (
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    <button type="button" title={t("Améliorer la photo (IA)")} aria-label={t("Améliorer la photo (IA)")} disabled={!!aiBusy} onClick={() => runAi("enhance", p)} className="rounded-full bg-white/90 p-1 text-primary shadow">{aiBusy === p ? <Spinner className="h-3 w-3 border-2" /> : <Sparkles className="h-3 w-3" />}</button>
                    <button type="button" title={t("Changer le fond (IA)")} aria-label={t("Changer le fond (IA)")} disabled={!!aiBusy} onClick={() => runAi("background", p)} className="rounded-full bg-white/90 p-1 text-primary shadow"><Wand2 className="h-3 w-3" /></button>
                  </div>
                )}
                <button type="button" onClick={() => setF({ ...f, photos: f.photos.filter((x) => x !== p) })} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white" aria-label={t("Retirer la photo")}><X className="h-3 w-3" /></button>
              </div>
            ))}
            {f.photos.length < 8 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground hover:bg-muted">
                {uploading ? <Spinner className="h-5 w-5" /> : <><Camera className="mb-1 h-5 w-5" />{t("Ajouter")}</>}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={uploading} onChange={(e) => e.target.files && upload(e.target.files)} />
              </label>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>✨ {t("Retouche IA : touchez ✨ (lumière, couleurs) ou 🪄 (fond) sur une photo. Le plat n'est jamais modifié.")}</span>
            {f.photos.length < 8 && <Button type="button" size="sm" variant="outline" loading={aiBusy === "generate"} disabled={!!aiBusy} onClick={() => runAi("generate")}><Wand2 />{t("Créer une illustration")}</Button>}
          </div>
          {f.photos.some((p) => p.includes("/ia-illustration")) && <p className="mt-2 rounded-xl bg-accent/10 p-2 text-xs">{t("Une illustration générée est signalée aux clients. Ajoutez une vraie photo dès que possible : elle rassure et vend mieux.")}</p>}
        </div>
        <Field label={t("Type")} htmlFor="course">
          <div className="flex flex-wrap gap-1.5" id="course">{COURSES.map((c) => <Chip key={c.id} on={f.course === c.id} onClick={() => setF({ ...f, course: c.id })}>{c.emoji} {t(c.label)}</Chip>)}</div>
        </Field>
        <Field label={t("Nom du plat")} htmlFor="t"><Input id="t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} placeholder={t("Ex : Lasagnes bolognaise maison")} /></Field>
        <Field label={t("Description")} htmlFor="d"><Textarea id="d" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={1500} /></Field>
        <Field label={t("Ingrédients")} htmlFor="ing"><Textarea id="ing" value={f.ingredients} onChange={(e) => setF({ ...f, ingredients: e.target.value })} maxLength={1500} className="min-h-[70px]" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Cuisine")} htmlFor="c"><Select id="c" value={f.cuisine} onChange={(e) => setF({ ...f, cuisine: e.target.value })}>{CUISINES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}</Select></Field>
          <Field label={t("Température")} htmlFor="tp"><Select id="tp" value={f.temperature} onChange={(e) => setF({ ...f, temperature: e.target.value as Dish["temperature"] })}>{TEMPERATURES.map((tp) => <option key={tp.id} value={tp.id}>{tp.emoji} {t(tp.label)}</option>)}</Select></Field>
          <Field label={t("Votre prix (€)")} htmlFor="p" hint={f.price ? t("Prix affiché au client : {price}", { price: formatEuros(customerPrice(cents(f.price) || 0)) }) : t("Ce que vous touchez")}>
            <Input id="p" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^0-9.,]/g, "") })} inputMode="decimal" placeholder="10,00" />
          </Field>
          <Field label={t("Portion (g)")} htmlFor="po"><Input id="po" value={f.portion} onChange={(e) => setF({ ...f, portion: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="400" /></Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">{t("Allergènes présents")}{" "}<span className="font-normal text-muted-foreground">{t("(obligatoire si concerné)")}</span></p>
          <div className="flex flex-wrap gap-1.5">{ALLERGENS.map((a) => <Chip key={a.id} on={f.allergens.includes(a.id)} onClick={() => toggleIn("allergens", a.id)} tone="warn">{a.label}</Chip>)}</div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">{t("Régimes")}</p>
          <div className="flex flex-wrap gap-1.5">{DIETS.map((d) => <Chip key={d.id} on={f.diets.includes(d.id)} onClick={() => toggleIn("diets", d.id)}>{d.emoji} {t(d.label)}</Chip>)}</div>
        </div>
        <Field label={t("Piquant")}><div className="flex gap-1.5">{[0, 1, 2, 3].map((n) => <Chip key={n} on={f.spiceLevel === n} onClick={() => setF({ ...f, spiceLevel: n })}>{n === 0 ? t("Pas épicé") : "🌶️".repeat(n)}</Chip>)}</div></Field>

        <div>
          <p className="mb-2 text-sm font-semibold">{t("Suppléments & boissons")}</p>
          <div className="space-y-2">
            {extras.map((e, i) => (
              <div key={i} className="flex gap-2">
                <Input value={e.emoji} onChange={(ev) => setExtras(extras.map((x, j) => j === i ? { ...x, emoji: ev.target.value.slice(0, 4) } : x))} className="w-14 text-center" placeholder="🌶️" aria-label={t("Emoji")} />
                <Input value={e.name} onChange={(ev) => setExtras(extras.map((x, j) => j === i ? { ...x, name: ev.target.value } : x))} placeholder={t("Sauce piquante")} maxLength={40} aria-label={t("Nom du supplément")} />
                <Input value={e.price} onChange={(ev) => setExtras(extras.map((x, j) => j === i ? { ...x, price: ev.target.value.replace(/[^0-9.,]/g, "") } : x))} className="w-24" placeholder="1,50" inputMode="decimal" aria-label={t("Prix")} />
                <Button variant="ghost" size="icon" onClick={() => setExtras(extras.filter((_, j) => j !== i))} aria-label={t("Supprimer")}><Trash2 /></Button>
              </div>
            ))}
          </div>
          {extras.length < 10 && <Button variant="ghost" size="sm" className="mt-1" onClick={() => setExtras([...extras, { name: "", emoji: "", price: "" }])}><Plus />{" "}{t("Ajouter un supplément")}</Button>}
        </div>

        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!menu} onChange={(e) => setMenu(e.target.checked ? { name: "", items: "", price: "" } : null)} className="accent-[hsl(var(--accent))]" />{" "}{t("Proposer un menu (formule)")}</label>
          {menu && (
            <div className="mt-3 space-y-2">
              <Input value={menu.name} onChange={(e) => setMenu({ ...menu, name: e.target.value })} placeholder={t("Nom : Menu Italia")} maxLength={60} />
              <Input value={menu.items} onChange={(e) => setMenu({ ...menu, items: e.target.value })} placeholder={t("Contenu : Lasagnes + Tiramisu + Limonade")} maxLength={200} />
              <Input value={menu.price} onChange={(e) => setMenu({ ...menu, price: e.target.value.replace(/[^0-9.,]/g, "") })} placeholder={t("Votre prix : 18,00")} inputMode="decimal" />
            </div>
          )}
        </div>
        <Button className="w-full" size="lg" loading={save.isPending} onClick={() => save.mutate()}>{t("Enregistrer le plat")}</Button>
      </div>
    </Dialog>
  );
}

function Chip({ on, onClick, children, tone }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: "warn" }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-medium", on ? (tone === "warn" ? "border-status-warn bg-status-warn/10 text-status-warn" : "border-primary bg-primary/10 text-primary") : "border-border hover:bg-muted")}>
      {children}
    </button>
  );
}
