# Architecture et montée en charge

```
 Site web (Vercel CDN)  ┐                       ┌─ PostgreSQL + PostGIS (RLS, fonctions métier, pg_cron)
 Appli iOS / Android    ├─► Supabase (API REST, ├─ Auth (e-mail, Google, Apple, 2FA)
                        ┘   temps réel, stockage)├─ Storage (photos) + CDN
                                                 └─ Edge Functions ─► Stripe Connect, Expo Push
```

## Pourquoi ce choix

- **Pas de serveur à maintenir** : le site est statique (servi par un CDN mondial), l'API est générée par Supabase, la logique sensible est dans PostgreSQL.
- **Un seul langage** (TypeScript) pour le site, les applis et les fonctions serveur. La logique de prix, la validation et les traductions sont partagées (`packages/shared`).

## Tenir des millions d'utilisateurs

| Point de charge | Solution en place | Quand grossir |
| --- | --- | --- |
| Pages du site | Fichiers statiques sur CDN, découpés par page, mis en cache 1 an | Rien à faire |
| Recherche « près de moi » | Index géographique GiST (PostGIS), filtre par jour, pagination, 60 résultats max | Réplicas en lecture Supabase |
| Recherche texte | Index plein texte français sans accents + trigrammes (fautes de frappe) | Moteur dédié (Meilisearch) au-delà de quelques millions de plats |
| Commandes simultanées | Transactions courtes, verrouillage ligne par ligne dans un ordre fixe (pas d'interblocage) | Taille de la base (plan Supabase) |
| Connexions | Pooler de connexions Supabase (Supavisor) | Augmenter la taille du pool |
| Temps réel | Supabase Realtime filtré par RLS, abonnements par commande | Plan Supabase |
| Photos | Stockage objet + CDN, images compressées en WebP côté client | Transformation d'images Supabase |
| Paiements | Stripe | Rien à faire |
| Tâches de fond | `pg_cron` (expiration, nettoyage), fonction horaire pour les versements par lots de 200 | File de messages si besoin |

Toutes les colonnes filtrées ou triées sont indexées. Les notes moyennes sont pré-calculées par des triggers, ce qui évite des agrégats coûteux à chaque affichage.

## Traductions

Le texte français sert de clé : `t("Mon panier")`. Les fichiers `packages/shared/src/i18n/locales/*.json` sont générés depuis `scripts/i18n-src/<langue>.txt`.

Pour ajouter ou modifier un texte :

1. Écrivez-le en français dans le code avec `t("…")`.
2. Lancez `node scripts/i18n-keys.cjs --missing` : la CI échoue si une langue est incomplète.
3. Ajoutez la phrase à la fin de `scripts/i18n-src/keys.json` et sa traduction dans chaque `scripts/i18n-src/<langue>.txt`.
4. Lancez `node scripts/i18n-build.cjs scripts/i18n-src/keys.json <langue>`.

Le contenu saisi par les utilisateurs (noms et descriptions des plats) reste dans la langue de la cuisinière. Une traduction automatique (DeepL) pourra être ajoutée plus tard.

## Pays, commissions et livraison (en cours, tâche #10)

- Table `countries` : devise, taux (`service_rate`, `cook_commission_rate`, `courier_commission_rate`), barème de livraison (base + prix au km, borné par un minimum et un maximum), commande minimum, délai de versement, mode livreurs (`independent`, `partner_agency` ou `disabled`).
- Trois modes de remise (`orders.fulfillment`) :
  - `pickup` : le client vient chercher sa commande ;
  - `delivery` : la cuisinière livre elle-même ;
  - `courier` : un livreur MAMI COOK livre.
- Course (`deliveries`), dans l'ordre :
  - créée en `pending` au paiement ;
  - passe en `searching` quand la cuisinière accepte, et les livreurs proches sont prévenus ;
  - `assigned` quand un livreur accepte (verrou : un seul livreur gagne) ;
  - `at_pickup` à son arrivée ;
  - `picked_up` au retrait, la commande passe alors « en route » ;
  - `delivered` avec le code à 4 chiffres du client, et la commande est terminée.
- Versements (`payouts`) : une ligne pour la cuisinière et une pour le livreur, payées par Stripe Connect après le délai du pays.
- Les livreurs voient les courses disponibles **sans adresse exacte**. Celles-ci ne sont révélées qu'après acceptation.

Voir aussi : [SECURITE.md](SECURITE.md), [DEPLOIEMENT.md](DEPLOIEMENT.md), [DECISIONS.md](DECISIONS.md).

## Évolutions possibles

- Abonnements (« un plat par semaine »).
- Traduction automatique des fiches plats.
- Facturation automatique pour les cuisiniers professionnels.
- Tableaux de bord analytiques pour l'équipe (Metabase branché en lecture seule).
