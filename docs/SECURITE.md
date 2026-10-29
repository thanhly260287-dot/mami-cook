# Sécurité

Principe : **on ne fait jamais confiance au client** (site ou appli). Tout ce qui compte est vérifié dans la base de données.

## Accès aux données

- **Row Level Security sur toutes les tables.** Chaque requête est filtrée selon l'utilisateur connecté : un client ne voit que ses commandes, un cuisinier que les commandes de sa cuisine, etc.
- **Tables sensibles séparées** : téléphone et consentements (`profile_private`), adresse exacte et SIRET des cuisiniers (`cook_private`). Elles ne sont visibles que par la personne concernée et l'équipe.
- **Adresse des cuisiniers protégée** : le public voit une position arrondie à environ 400 m. L'adresse exacte n'est révélée qu'au client dont la commande est acceptée (`pickup_address`).
- **Champs protégés par des triggers** : un cuisinier ne peut pas se valider lui-même, modifier sa note, ses informations Stripe ni son stock vendu. Un client ne peut pas écrire la réponse du cuisinier à son avis.
- **Écriture des commandes interdite aux clients.** Elles passent uniquement par des fonctions serveur (`place_order`, `transition_order`, `mark_order_paid`).

## Argent

- **Les prix sont recalculés par le serveur.** Le montant affiché par l'appli est indicatif ; le serveur recalcule tout à partir des prix en base.
- **Stock verrouillé** (`SELECT … FOR UPDATE`) : impossible de vendre plus de portions qu'il n'en reste, même avec des milliers de commandes simultanées.
- **Idempotence** : un double clic ne crée pas deux commandes, un même événement Stripe n'est jamais traité deux fois.
- **Paiement confirmé uniquement par le webhook Stripe signé** : le montant et l'identifiant de paiement sont revérifiés.
- **Fonds bloqués jusqu'à la remise** : le cuisinier est payé 24 h après la remise (code à 4 chiffres en retrait). Un litige bloque le versement.
- Aucune donnée de carte bancaire ne transite par nos serveurs (Stripe, certifié PCI-DSS).

## Comptes

- Mots de passe de 10 caractères minimum, avec vérification contre les fuites connues (à activer dans Supabase).
- Double authentification (TOTP) disponible pour tous.
- Session mobile stockée dans le trousseau chiffré du téléphone (Keychain / Keystore).
- Réinitialisation de mot de passe sans divulguer si un compte existe.
- Redirections limitées au site lui-même (pas de redirection ouverte).

## Web

- En-têtes HTTP : CSP stricte (aucun script tiers hors Stripe), HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy. Testés automatiquement.
- `dangerouslySetInnerHTML` interdit par le linter (protection XSS).
- Photos redimensionnées et ré-encodées dans le navigateur : les métadonnées EXIF, et donc la position GPS, sont supprimées.
- Stockage d'images : chaque utilisateur ne peut écrire que dans son dossier, en JPG/PNG/WebP, avec une taille maximale.

## Abus

- Limitation de débit sur les commandes et les changements de statut, en plus de celle de Supabase Auth.
- Signalements (sécurité alimentaire, allergènes, fraude…), modération et suspension de cuisine.
- Journal d'audit des actions sensibles.

## RGPD

- Export des données en un clic (`export_my_data`).
- Suppression de compte : données personnelles effacées, commandes conservées de façon anonyme (obligation comptable).
- Aucun traceur publicitaire.

## Vérification continue

- `supabase/tests` : plus de 50 tests d'attaque (lecture des données d'autrui, auto-promotion admin, commande à 0 €, survente, faux paiement, etc.).
- CI GitHub : tests, CodeQL, recherche de secrets (gitleaks), Dependabot.

## Signaler une faille

Écrivez à security@mamicook.fr (adresse à créer). Merci de ne pas divulguer publiquement avant correction.
