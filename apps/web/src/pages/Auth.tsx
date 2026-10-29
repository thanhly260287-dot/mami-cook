import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { signInSchema, signUpSchema } from "@mami/shared";
import { requireSupabase, DEMO_MODE } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card } from "@/components/ui/misc";
import { Seo } from "@/components/Seo";
import { errorMessage } from "@/lib/utils";

const TERMS_VERSION = "2026-10-29";

/** N'autorise que les redirections internes (pas de redirection ouverte vers un site tiers). */
function safeRedirect(r: string | null) {
  return r && r.startsWith("/") && !r.startsWith("//") ? r : "/";
}

function translateAuthError(msg: string) {
  if (/invalid login/i.test(msg)) return "E-mail ou mot de passe incorrect";
  if (/email not confirmed/i.test(msg)) return "Confirmez votre e-mail avant de vous connecter (vérifiez vos spams)";
  if (/already registered/i.test(msg)) return "Un compte existe déjà avec cet e-mail";
  if (/rate limit|too many/i.test(msg)) return "Trop de tentatives, réessayez dans quelques minutes";
  if (/weak|pwned/i.test(msg)) return "Ce mot de passe est trop faible ou a fuité dans une base piratée, choisissez-en un autre";
  return msg;
}

function OAuthButtons({ redirect }: { redirect: string }) {
  const go = async (provider: "google" | "apple") => {
    const { error } = await requireSupabase().auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}${redirect}` } });
    if (error) toast.error(translateAuthError(error.message));
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" type="button" onClick={() => go("google")}>
        <svg viewBox="0 0 24 24" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" /></svg>
        Google
      </Button>
      <Button variant="outline" type="button" onClick={() => go("apple")}>
        <svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 4.9c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" /></svg>
        Apple
      </Button>
    </div>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="container flex max-w-md flex-col py-12">
      <Seo title={`${title} — MAMI COOK`} noindex />
      <h1 className="mb-1 text-center text-3xl font-extrabold">{title}</h1>
      {subtitle && <p className="mb-6 text-center text-sm text-muted-foreground">{subtitle}</p>}
      <Card className="p-6">{DEMO_MODE ? <p className="text-sm">Les comptes sont désactivés en mode démo.</p> : children}</Card>
    </div>
  );
}

export function Login() {
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get("redirect"));
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null);
  const [code, setCode] = useState("");
  if (user && !mfa) return <Navigate to={redirect} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithPassword(parsed.data);
    if (error) { setLoading(false); return toast.error(translateAuthError(error.message)); }
    // Double authentification si activée
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await sb.auth.mfa.listFactors();
      const totp = factors?.totp[0];
      if (totp) { setMfa({ factorId: totp.id }); setLoading(false); return; }
    }
    setLoading(false);
    navigate(redirect, { replace: true });
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await requireSupabase().auth.mfa.challengeAndVerify({ factorId: mfa!.factorId, code });
    setLoading(false);
    if (error) return toast.error("Code incorrect");
    navigate(redirect, { replace: true });
  };

  const magic = async () => {
    const parsed = signInSchema.shape.email.safeParse(email);
    if (!parsed.success) return toast.error("Saisissez votre e-mail d'abord");
    setLoading(true);
    const { error } = await requireSupabase().auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${redirect}` } });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    setMagicSent(true);
  };

  if (mfa) {
    return (
      <Shell title="Double authentification" subtitle="Saisissez le code à 6 chiffres de votre application d'authentification.">
        <form onSubmit={verifyMfa} className="space-y-4">
          <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="text-center text-2xl tracking-[0.4em]" autoFocus />
          <Button type="submit" className="w-full" loading={loading} disabled={code.length !== 6}>Vérifier</Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell title="Bon retour !" subtitle={<>Pas encore de compte ? <Link to={`/inscription?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-primary">Inscrivez-vous</Link></>}>
      {magicSent ? (
        <div className="py-6 text-center"><Mail className="mx-auto mb-3 h-10 w-10 text-primary" /><p className="font-semibold">Lien envoyé à {email}</p><p className="mt-1 text-sm text-muted-foreground">Cliquez sur le lien reçu pour vous connecter.</p></div>
      ) : (
        <>
          <OAuthButtons redirect={redirect} />
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />ou<div className="h-px flex-1 bg-border" /></div>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="E-mail" htmlFor="email"><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Field label={<span className="flex justify-between">Mot de passe <Link to="/mot-de-passe-oublie" className="text-xs font-medium text-primary">Oublié ?</Link></span>} htmlFor="password">
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            <Button type="submit" className="w-full" loading={loading}>Se connecter</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={magic} disabled={loading}><Mail /> Recevoir un lien de connexion</Button>
          </form>
        </>
      )}
    </Shell>
  );
}

export function Signup() {
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get("redirect"));
  const { user } = useAuth();
  const [form, setForm] = useState({ displayName: "", email: "", password: "", acceptTerms: false, marketingConsent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  if (user) return <Navigate to={redirect} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await requireSupabase().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirect}`,
        data: { display_name: parsed.data.displayName, terms_version: TERMS_VERSION, marketing_consent: parsed.data.marketingConsent },
      },
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    setSent(true);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <Shell title="Créer un compte" subtitle={<>Déjà inscrit ? <Link to={`/connexion?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-primary">Connectez-vous</Link></>}>
      {sent ? (
        <div className="py-6 text-center"><Mail className="mx-auto mb-3 h-10 w-10 text-primary" /><p className="font-semibold">Vérifiez votre boîte mail</p><p className="mt-1 text-sm text-muted-foreground">Nous avons envoyé un lien de confirmation à {form.email}.</p></div>
      ) : (
        <>
          <OAuthButtons redirect={redirect} />
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />ou<div className="h-px flex-1 bg-border" /></div>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Prénom ou pseudo" htmlFor="name" error={errors.displayName}><Input id="name" autoComplete="given-name" value={form.displayName} onChange={set("displayName")} aria-invalid={!!errors.displayName} /></Field>
            <Field label="E-mail" htmlFor="email" error={errors.email}><Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} /></Field>
            <Field label="Mot de passe" htmlFor="password" error={errors.password} hint="10 caractères min., avec majuscule, minuscule et chiffre">
              <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} aria-invalid={!!errors.password} />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.acceptTerms} onChange={set("acceptTerms")} className="mt-1 accent-[hsl(var(--primary))]" />
              <span>J'accepte les <Link to="/legal/cgu" target="_blank" className="font-semibold text-primary">CGU</Link> et la <Link to="/legal/confidentialite" target="_blank" className="font-semibold text-primary">politique de confidentialité</Link></span>
            </label>
            {errors.acceptTerms && <p className="text-xs font-medium text-destructive">{errors.acceptTerms}</p>}
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={form.marketingConsent} onChange={set("marketingConsent")} className="mt-1 accent-[hsl(var(--primary))]" />
              Je souhaite recevoir les bons plans et nouveautés (désinscription en un clic)
            </label>
            <Button type="submit" className="w-full" loading={loading}>Créer mon compte</Button>
          </form>
        </>
      )}
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Réponse identique que le compte existe ou non (pas d'énumération des comptes).
    await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/nouveau-mot-de-passe` }).catch(() => null);
    setLoading(false);
    setSent(true);
  };
  return (
    <Shell title="Mot de passe oublié" subtitle="Nous vous envoyons un lien pour le réinitialiser.">
      {sent ? <p className="py-4 text-center text-sm">Si un compte existe pour {email}, un e-mail vient d'être envoyé.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="E-mail" htmlFor="email"><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Field>
          <Button type="submit" className="w-full" loading={loading}>Envoyer le lien</Button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.shape.password.safeParse(password);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await requireSupabase().auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(translateAuthError(errorMessage(error)));
    toast.success("Mot de passe modifié");
    navigate("/");
  };
  return (
    <Shell title="Nouveau mot de passe">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nouveau mot de passe" htmlFor="pw" hint="10 caractères min., avec majuscule, minuscule et chiffre"><Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button type="submit" className="w-full" loading={loading}>Enregistrer</Button>
      </form>
    </Shell>
  );
}
