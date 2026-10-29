# Vision du projet

## En une phrase

**MAMI COOK — « Manger comme à la maison, partout. »** Une place de marché où des particuliers et des professionnels cuisinent chez eux et vendent leurs plats à leurs voisins.

## Qui l'utilise

| Profil | Ce qu'il fait |
| --- | --- |
| Client | Cherche des plats près de chez lui, commande, paie, suit sa commande, note la cuisine et le livreur |
| Cuisinière / cuisinier | Publie ses plats et ses ventes du jour (stock limité), accepte et prépare les commandes, est payé automatiquement |
| Livreur | Se met en ligne, accepte ou refuse librement des courses, livre, est payé automatiquement |
| Équipe MAMI COOK | Valide les cuisines et les livreurs, modère, gère les remboursements, les codes promo, les taux par pays et les déclarations fiscales |

## Comment la plateforme gagne de l'argent

Décisions détaillées dans [DECISIONS.md](DECISIONS.md).

1. **Sur chaque plat** : le client paie le prix de la cuisinière **+ 20 %** (`countries.service_rate`). Une commission sur la part de la cuisinière est aussi prévue (`cook_commission_rate`, à 0 % par défaut).
2. **Sur chaque livraison par un livreur MAMI** : le client paie des frais de livraison calculés selon la distance. La plateforme en garde **20 %** (`courier_commission_rate`) ; le livreur reçoit le reste, plus **100 % du pourboire**.
3. Les remises volume (−10 % dès 5 plats, −15 % dès 10) et les codes promo sont pris en charge par la plateforme.

Les paiements passent par **Stripe Connect** : la plateforme encaisse, puis reverse automatiquement à chaque cuisinière et à chaque livreur, 24 h après la remise.

## Où

- Lancement prévu : France, Belgique, Luxembourg, Suisse (en CHF, livraison via une agence partenaire).
- Prêts mais désactivés : Allemagne, Autriche, Espagne, Portugal, Italie, Pays-Bas, Irlande, Royaume-Uni, États-Unis, Canada.
- Règles par pays : [LEGAL_RESEARCH.md](LEGAL_RESEARCH.md).

## Supports

Site web (PWA installable), application iOS, application Android, back-office web. 10 langues : français, anglais, espagnol, portugais, italien, allemand, arabe (de droite à gauche), chinois, vietnamien, turc.
