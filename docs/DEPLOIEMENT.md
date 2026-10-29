# Mettre MAMI COOK en ligne

Guide pas à pas. Comptez une demi-journée la première fois. Les services ont tous une offre gratuite pour démarrer.

Comptes à créer : [Supabase](https://supabase.com), [Stripe](https://stripe.com), [Vercel](https://vercel.com) (ou Netlify), [Expo](https://expo.dev). Pour publier les applis : Apple Developer (99 $/an) et Google Play Console (25 $ une fois).

Outils sur votre ordinateur : Node.js 22, pnpm (`npm i -g pnpm`), le CLI Supabase (`npm i -g supabase`).

---

## 1. Base de données (Supabase)

1. Créez un projet sur supabase.com. **Choisissez une région en Europe** (ex. Paris ou Francfort) pour le RGPD.
2. Dans **Database → Extensions**, activez `postgis` et `pg_cron`.
3. Reliez le dossier au projet puis envoyez le schéma :

```bash
supabase link --project-ref VOTRE_REF_PROJET
```

```bash
supabase db push
```

Ne lancez **pas** `supabase/seed.sql` en production : ce sont des données de démonstration.

4. **Authentication → URL Configuration** :
   - Site URL : `https://votre-domaine.fr`
   - Redirect URLs : `https://votre-domaine.fr/**` et `mamicook://**`
5. **Authentication → Providers** : gardez « Confirm email » activé. Pour la connexion Google ou Apple, suivez les guides Supabase et collez les identifiants.
6. **Authentication → Emails** : configurez un SMTP (Resend, Brevo…). L'envoi intégré de Supabase est très limité.
7. **Authentication → Attack Protection** : activez « Leaked password protection » et le CAPTCHA (hCaptcha ou Turnstile).
8. Créez votre compte administrateur : inscrivez-vous sur le site, puis dans **SQL Editor** :

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'vous@exemple.fr';
```

## 2. Paiements (Stripe Connect)

1. Sur dashboard.stripe.com, activez **Connect**, type **Express**, pays **France**.
2. Récupérez vos clés dans **Développeurs → Clés API** : `pk_live_…` (publique) et `sk_live_…` (secrète). Commencez par les clés de test (`pk_test_` / `sk_test_`).
3. **Développeurs → Webhooks → Ajouter un endpoint** :
   - URL : `https://VOTRE_REF_PROJET.supabase.co/functions/v1/stripe-webhook`
   - Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `account.updated`
   - Cochez aussi « Événements des comptes connectés » pour `account.updated`.
   - Notez le **secret de signature** `whsec_…`.
4. Activez Apple Pay et Google Pay dans **Paramètres → Moyens de paiement**, et vérifiez votre domaine pour Apple Pay.

## 3. Fonctions serveur

Générez un secret aléatoire pour les tâches planifiées :

```bash
openssl rand -hex 32
```

Enregistrez les secrets (remplacez les valeurs) :

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx STRIPE_PUBLISHABLE_KEY=pk_test_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx SITE_URL=https://votre-domaine.fr ALLOWED_ORIGINS=https://votre-domaine.fr CRON_SECRET=le_secret_genere
```

Déployez les fonctions :

```bash
supabase functions deploy
```

### Tâches planifiées

L'expiration des commandes non payées tourne déjà toutes les minutes via `pg_cron` (installé par les migrations). Ajoutez le versement automatique aux cuisiniers, chaque heure, dans **SQL Editor** :

```sql
select cron.schedule('process-payouts', '7 * * * *', $$
  select net.http_post(
    url := 'https://VOTRE_REF_PROJET.supabase.co/functions/v1/process-payouts',
    headers := '{"x-cron-secret": "le_secret_genere", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb)
$$);
```

(Activez l'extension `pg_net` si besoin.)

### Notifications push

**Database → Webhooks → Create** :
- Table `notifications`, événement **Insert**.
- Type HTTP Request, URL `https://VOTRE_REF_PROJET.supabase.co/functions/v1/send-push`.
- En-tête `x-cron-secret: le_secret_genere`.

## 4. Site web (Vercel)

1. Importez le dépôt GitHub sur vercel.com. Le fichier `vercel.json` configure déjà la compilation, les en-têtes de sécurité et le routage.
2. Ajoutez les variables d'environnement :
   - `VITE_SUPABASE_URL` = `https://VOTRE_REF_PROJET.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = clé `anon` (Supabase → Settings → API)
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_…`
3. Branchez votre nom de domaine et mettez-le à jour dans Supabase (étape 1.4) et dans `ALLOWED_ORIGINS` / `SITE_URL` (étape 3).
4. Si vous ajoutez un domaine (Supabase personnalisé, CDN d'images), mettez à jour la politique CSP dans `apps/web/security-headers.json`.

Netlify fonctionne aussi : le fichier `netlify.toml` est fourni.

## 5. Applis iOS et Android (Expo EAS)

```bash
cd apps/mobile
```

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

`eas init` remplit l'identifiant de projet dans `app.json`. Définissez les variables :

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://VOTRE_REF_PROJET.supabase.co --environment production
```

Faites de même pour `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` et `EXPO_PUBLIC_SITE_URL`.

Compilez dans le cloud (aucun Mac nécessaire) :

```bash
npx eas-cli@latest build --platform all --profile production
```

Puis publiez :

```bash
npx eas-cli@latest submit --platform all
```

À préparer dans App Store Connect et Google Play Console : fiche de l'appli, captures d'écran (dans `docs/captures`), politique de confidentialité (`https://votre-domaine.fr/legal/confidentialite`), questionnaire sur les données collectées, et un compte de test pour les relecteurs.

Les identifiants `fr.mamicook.app` et `merchant.fr.mamicook` dans `app.json` sont à adapter à votre société.

## 6. Avant le lancement

- [ ] Faire relire les CGU, la politique de confidentialité et les mentions légales par un juriste, et compléter les champs entre crochets (`apps/web/src/pages/legal/Legal.tsx`). Ces pages ne sont qu'en français : les traduire si vous ciblez d'autres pays.
- [ ] Vérifier le statut juridique de la plateforme et des cuisiniers (déclaration DDPP, statut, assurances) avec un expert-comptable.
- [ ] Passer Stripe en mode réel (clés `live`) et refaire une commande test de bout en bout.
- [ ] Activer les sauvegardes quotidiennes (Point-in-Time Recovery) dans Supabase.
- [ ] Activer la double authentification sur tous les comptes administrateurs (Supabase, Stripe, Vercel, GitHub, Expo).
- [ ] Remplacer les illustrations des plats de démonstration par de vraies photos (les cuisiniers ajoutent les leurs).
