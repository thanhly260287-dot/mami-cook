# Décisions

Format : date — décision — raison — qui l'a validée.

**Validée** = choisie ou confirmée par l'utilisateur. **Technique** = choix de Claude pour répondre à une demande, modifiable sur demande. Les décisions provisoires sont listées à part, en bas.

## Validées par l'utilisateur

| Date | Décision | Raison |
| --- | --- | --- |
| 29/10/2026 | Abandon de Lovable : tout est développé dans ce dépôt | Demande explicite (« on fait plus rien avec lovable ») |
| 29/10/2026 | Backend **Supabase** (PostgreSQL, Auth, Storage, Realtime, Edge Functions) | Choix de l'utilisateur au questionnaire |
| 29/10/2026 | Paiements **Stripe Connect** | Choix de l'utilisateur au questionnaire |
| 29/10/2026 | Applis mobiles en **Expo / React Native** | Choix de l'utilisateur au questionnaire |
| 29/10/2026 | Dépôt GitHub vide `mami-cook`, créé par l'utilisateur (option recommandée) | Choix de l'utilisateur. **Le dépôt n'est pas encore visible** : voir [CURRENT_STATUS.md](CURRENT_STATUS.md) |
| 29/10/2026 | Site et applis en 10 langues | Demande « toutes les langues » |
| 29/10/2026 | La plateforme gagne un pourcentage sur chaque vente **et** sur les livraisons | Demande explicite |
| 29/10/2026 | Système de livraison avec livreurs payés | Demande explicite |
| 29/10/2026 | Système de mémoire permanente dans le dépôt (CLAUDE.md, docs, skills, hooks) | Plan approuvé par l'utilisateur |

## Techniques (prises par Claude, modifiables)

| Date | Décision | Raison |
| --- | --- | --- |
| 29/10/2026 | Monorepo pnpm : `apps/web`, `apps/mobile`, `packages/shared` | Partager prix, validation et traductions entre le site et les applis |
| 29/10/2026 | Logique métier en fonctions SQL `SECURITY DEFINER` + RLS partout | Ne jamais faire confiance au client ; tient la charge sans serveur à maintenir |
| 29/10/2026 | Majoration client de **20 %** sur le prix de la cuisinière | Modèle économique demandé ; taux réglable par pays |
| 29/10/2026 | Remises volume −10 % dès 5 plats et −15 % dès 10 (menus exclus) ; codes promo payés par la plateforme | Reprises du prototype |
| 29/10/2026 | Stripe Connect Express, « charges et transferts séparés », versement 24 h après la remise | Permet de payer cuisinière **et** livreur sur une même commande et de bloquer les fonds en cas de litige |
| 29/10/2026 | Position publique des cuisinières floutée (~400 m), adresse exacte révélée après acceptation | Sécurité des cuisinières à domicile |
| 29/10/2026 | Le texte français sert de clé de traduction | Simplicité ; un script vérifie que les 10 langues sont complètes |
| 29/10/2026 | Table `countries` : devise, taux et règles de livraison par pays | Lancement multi-pays (France, Belgique, Luxembourg, Suisse) |
| 29/10/2026 | Livreurs **réellement indépendants** : refus sans pénalité, rémunération transparente | Directive européenne 2024/2831 (présomption de salariat) ; voir [LEGAL_RESEARCH.md](LEGAL_RESEARCH.md) |
| 29/10/2026 | Suisse et Espagne en mode `partner_agency` (livreurs d'une agence partenaire) | Le Tribunal fédéral a jugé les livreurs Uber Eats salariés ; loi « Rider » en Espagne |
| 29/10/2026 | Livreur : 80 % des frais de livraison + 100 % du pourboire ; plateforme : 20 % des frais | Proposition par défaut, réglable par pays |
| 29/10/2026 | Courses retenues seulement si la commande est remise au livreur avec le code du client ; dédommagement du livreur si la commande est annulée après son arrivée | Équité pour les livreurs |
| 29/10/2026 | Un livreur a au plus 2 courses en cours ; recherche relancée à 8 km après 10 min, équipe alertée après 30 min | Éviter les commandes bloquées |
| 29/10/2026 | Le livreur voit le gain, la ville et la distance **avant** d'accepter ; adresses exactes seulement après acceptation | Transparence (directive 2024/2831) et sécurité des clients |
| 29/10/2026 | Remise validée par le code à 4 chiffres du client, comme pour le retrait | Preuve de livraison, évite les litiges |
| 30/10/2026 | Assistant d'aide IA sur l'API Claude (modèle Claude Opus 5.5, effort bas, bascule automatique en cas de refus), ouvert sans compte avec limites par personne/IP ; voix gérée par le navigateur (aucun audio envoyé à nos serveurs) | Demande de l'utilisateur (assistant multilingue + appels) ; coût maîtrisé, vie privée |
| 30/10/2026 | Les données d'exemple servent **uniquement à l'aperçu privé** ; la vraie base démarre vide (le déploiement ne charge jamais `seed.sql`) | Demande de l'utilisateur : le contenu se basera sur les premiers vrais utilisateurs |
| 30/10/2026 | Ingrédients obligatoires (10 caractères minimum), saveurs (1 à 5) et conseils de conservation pour chaque plat | Demande de l'utilisateur ; transparence pour les clients |
| 30/10/2026 | Animations : framer-motion sur le site, API Animated de React Native dans l'appli (pas de nouvelle dépendance), toujours désactivées si l'appareil demande de réduire les animations | Demande de l'utilisateur ; accessibilité et légèreté |
| 29/10/2026 | Bannière d'accueil : photo libre Wikimedia Commons d'une maman souriante qui cuisine (« Middle-aged woman cooking in kitchen while looking out the window.jpg », CC BY 2.0), cuisine moderne et lumineuse, style clair, texte posé dessus | Demande de l'utilisateur (photo propre, cuisine moderne) ; pour une campagne publicitaire, préférer une photo avec autorisation écrite du modèle |
| 29/10/2026 | Nombre de « téléchargements » mesuré par un identifiant anonyme créé au premier lancement de l'appli (iPhone / Android) ; les chiffres officiels restent dans App Store Connect et Google Play Console | L'appli ne peut pas lire les chiffres des stores ; aucune donnée personnelle collectée (mentionné dans la politique de confidentialité) |
| 29/10/2026 | **Justificatifs obligatoires vérifiés avant la première vente**, selon le pays (France : formation hygiène 14 h et déclaration DDPP exigées même pour une activité occasionnelle) ; suspension automatique si un document expire | Demande de l'utilisateur (« en France, ils doivent suivre une formation hygiène… regarder toutes les lois par rapport à chaque pays ») ; réduit le risque juridique de la plateforme |
| 29/10/2026 | Déploiement Supabase et téléchargement des photos **par GitHub Actions** | Le réseau de l'environnement de développement bloque Supabase et les banques d'images |
| 29/10/2026 | Photos de démo issues de Wikimedia Commons (licences libres, crédits affichés) | Unsplash bloque les robots ; pas de clé Gemini |
| 29/10/2026 | Documentation et mémoire **dans le dépôt** | Le conteneur cloud est effacé à chaque session |

## Provisoires / à confirmer par l'utilisateur

- Montants des frais de livraison par pays (base, prix au km, minimum, maximum) : valeurs d'exemple.
- `cook_commission_rate` à 0 % : faut-il aussi prélever une commission côté cuisinière ?
- Nom de la société, adresse, SIREN, médiateur de la consommation : à compléter dans les pages légales.
- Agence partenaire pour la Suisse : à trouver.
- Identifiants des applis `fr.mamicook.app` et nom de domaine.
