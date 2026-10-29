import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, KeyRound, LogOut, MapPin, Moon, Plus, ShieldCheck, Trash2, User } from "lucide-react";
import { phoneSchema, t } from "@mami/shared";
import { requireSupabase, callFunction } from "@/lib/supabase";
import { deleteAddress, fetchAddresses, uploadImage } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage, photoUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card, Switch } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { AddressDialog } from "@/components/AddressDialog";
import { Seo } from "@/components/Seo";

export default function Account() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const sb = requireSupabase();
  const profile = useQuery({
    queryKey: ["account", user!.id],
    queryFn: async () => {
      const [p, priv] = await Promise.all([
        sb.from("profiles").select("display_name, avatar_url").eq("id", user!.id).single(),
        sb.from("profile_private").select("phone, marketing_consent").eq("user_id", user!.id).single(),
      ]);
      return { ...p.data!, ...priv.data! };
    },
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(false);
  useEffect(() => {
    if (profile.data) { setName(profile.data.display_name); setPhone(profile.data.phone ?? ""); setMarketing(profile.data.marketing_consent); }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (phone && !phoneSchema.safeParse(phone).success) throw new Error(t("Numéro de téléphone invalide"));
      const r1 = await sb.from("profiles").update({ display_name: name.trim().slice(0, 60) }).eq("id", user!.id);
      if (r1.error) throw r1.error;
      const r2 = await sb.from("profile_private").update({ phone: phone || null, marketing_consent: marketing }).eq("user_id", user!.id);
      if (r2.error) throw r2.error;
    },
    onSuccess: () => { toast.success(t("Profil enregistré")); qc.invalidateQueries({ queryKey: ["my-profile"] }); qc.invalidateQueries({ queryKey: ["account"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const avatar = useMutation({
    mutationFn: async (f: File) => {
      const path = await uploadImage("avatars", user!.id, f);
      const r = await sb.from("profiles").update({ avatar_url: path }).eq("id", user!.id);
      if (r.error) throw r.error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["account"] }); toast.success(t("Photo mise à jour")); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <Seo title={t("Mon compte — MAMI COOK")} noindex />
      <h1 className="text-3xl font-extrabold">{t("Mon compte")}</h1>

      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold"><User className="h-5 w-5" />{" "}{t("Profil")}</h2>
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full gradient-primary text-2xl font-bold text-white">
            {profile.data?.avatar_url ? <img src={photoUrl(profile.data.avatar_url)} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
          </div>
          <label className="cursor-pointer text-sm font-semibold text-primary">
            {avatar.isPending ? t("Envoi…") : t("Changer la photo")}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && avatar.mutate(e.target.files[0])} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Nom affiché")} htmlFor="name"><Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>
          <Field label={t("Téléphone")} htmlFor="phone" hint={t("Visible uniquement par vous et le support")}><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></Field>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("E-mail :")}{" "}{user!.email}</p>
        <label className="mt-4 flex items-center justify-between gap-4 text-sm">
          <span>{t("Recevoir les bons plans par e-mail")}</span>
          <Switch checked={marketing} onCheckedChange={setMarketing} />
        </label>
        <Button className="mt-5" loading={save.isPending} onClick={() => save.mutate()}>{t("Enregistrer")}</Button>
      </Card>

      <Addresses />
      <Security />
      <Preferences />

      <Card className="p-6">
        <h2 className="mb-2 font-bold">{t("Mes données")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("Conformément au RGPD, vous pouvez télécharger ou supprimer vos données à tout moment.")}</p>
        <div className="flex flex-wrap gap-3">
          <ExportButton />
          <DeleteAccount />
          <Button variant="ghost" onClick={() => signOut()}><LogOut />{" "}{t("Se déconnecter")}</Button>
        </div>
      </Card>
    </div>
  );
}

function Addresses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["addresses", user!.id], queryFn: fetchAddresses });
  const del = useMutation({ mutationFn: deleteAddress, onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }), onError: (e) => toast.error(errorMessage(e)) });
  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 font-bold"><MapPin className="h-5 w-5" />{" "}{t("Mes adresses")}</h2>
      <div className="space-y-2">
        {(q.data ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
            <span><b>{a.label}</b>{a.is_default && <span className="ml-2 text-xs text-primary">{t("par défaut")}</span>}<br />{a.line1}, {a.postal_code} {a.city}</span>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)} aria-label={t("Supprimer {name}", { name: a.label })}><Trash2 /></Button>
          </div>
        ))}
      </div>
      <Button variant="secondary" className="mt-3" onClick={() => setOpen(true)}><Plus />{" "}{t("Ajouter une adresse")}</Button>
      <AddressDialog open={open} onOpenChange={setOpen} onCreated={() => qc.invalidateQueries({ queryKey: ["addresses"] })} />
    </Card>
  );
}

function Security() {
  const sb = requireSupabase();
  const qc = useQueryClient();
  const factors = useQuery({ queryKey: ["mfa"], queryFn: async () => (await sb.auth.mfa.listFactors()).data?.totp ?? [] });
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const active = (factors.data ?? []).find((f) => f.status === "verified");

  const start = async () => {
    // Nettoie une inscription précédente non terminée
    for (const f of factors.data ?? []) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "MAMI COOK" });
    if (error) return toast.error(error.message);
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };
  const verify = async () => {
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enroll!.id, code });
    if (error) return toast.error(t("Code incorrect"));
    toast.success(t("Double authentification activée 🔐"));
    setEnroll(null); setCode("");
    qc.invalidateQueries({ queryKey: ["mfa"] });
  };
  const disable = async () => {
    const { error } = await sb.auth.mfa.unenroll({ factorId: active!.id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["mfa"] });
    toast.success(t("Double authentification désactivée"));
  };
  const changePw = async () => {
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success(t("Mot de passe modifié")); setPwOpen(false); setPw("");
  };

  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5" />{" "}{t("Sécurité")}</h2>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setPwOpen(true)}><KeyRound />{" "}{t("Changer le mot de passe")}</Button>
        {active ? <Button variant="outline" onClick={disable}>{t("Désactiver la double authentification")}</Button>
          : <Button variant="outline" onClick={start}><ShieldCheck />{" "}{t("Activer la double authentification")}</Button>}
      </div>
      {active && <p className="mt-3 text-sm text-status-hot">{t("✓ Double authentification active")}</p>}
      <Dialog open={!!enroll} onOpenChange={(o) => !o && setEnroll(null)} title={t("Double authentification")} description={t("Scannez ce QR code avec Google Authenticator, 1Password, Authy…")}>
        {enroll && (
          <div className="space-y-4 text-center">
            <img src={enroll.qr} alt={t("QR code")} className="mx-auto h-48 w-48 rounded-xl bg-white p-2" />
            <p className="break-all text-xs text-muted-foreground">{t("Clé manuelle :")}{" "}{enroll.secret}</p>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder={t("Code à 6 chiffres")} className="text-center text-xl tracking-[0.3em]" />
            <Button className="w-full" disabled={code.length !== 6} onClick={verify}>{t("Activer")}</Button>
          </div>
        )}
      </Dialog>
      <Dialog open={pwOpen} onOpenChange={setPwOpen} title={t("Nouveau mot de passe")}>
        <div className="space-y-4">
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder={t("10 caractères min.")} />
          <Button className="w-full" disabled={pw.length < 10} onClick={changePw}>{t("Enregistrer")}</Button>
        </div>
      </Dialog>
    </Card>
  );
}

function Preferences() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = (v: boolean) => {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    try { localStorage.setItem("mami-theme", v ? "dark" : "light"); } catch { /* ignore */ }
  };
  return (
    <Card className="p-6">
      <label className="flex items-center justify-between gap-4 text-sm font-semibold"><span className="flex items-center gap-2"><Moon className="h-5 w-5" />{" "}{t("Mode sombre")}</span><Switch checked={dark} onCheckedChange={toggle} /></label>
    </Card>
  );
}

function ExportButton() {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    const { data, error } = await requireSupabase().rpc("export_my_data");
    setLoading(false);
    if (error) return toast.error(error.message);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `mami-cook-mes-donnees-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };
  return <Button variant="secondary" loading={loading} onClick={run}><Download />{" "}{t("Télécharger mes données")}</Button>;
}

function DeleteAccount() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      await callFunction("delete-account", {});
      toast.success(t("Votre compte a été supprimé. Au revoir 👋"));
      await signOut();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Button variant="ghost" className="text-destructive" onClick={() => setOpen(true)}><Trash2 />{" "}{t("Supprimer mon compte")}</Button>
      <Dialog open={open} onOpenChange={setOpen} title={t("Supprimer mon compte")} description={t("Action définitive. Vos commandes sont conservées de façon anonyme pour nos obligations comptables.")}>
        <div className="space-y-4">
          <Field label={<>{t("Tapez")}{" "}<b>{t("SUPPRIMER")}</b>{" "}{t("pour confirmer")}</>} htmlFor="confirm"><Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          <Button variant="destructive" className="w-full" disabled={confirm !== "SUPPRIMER"} loading={loading} onClick={run}>{t("Supprimer définitivement")}</Button>
          <p className="text-center text-xs text-muted-foreground">{t("Une question ?")}{" "}<Link to="/aide#contact" className="text-primary">{t("Contactez-nous")}</Link></p>
        </div>
      </Dialog>
    </>
  );
}
