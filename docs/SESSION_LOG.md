# Journal des sessions

Une entrée par session, de la plus récente à la plus ancienne. Chaque entrée indique ce qui a été fait, où le travail s'est arrêté et la prochaine étape.

## 2026-10-29 — session cloud n° 1

> Reconstitué : la première partie de cette session n'est disponible que sous forme de résumé (le contexte a été compressé).

**Demandes**
1. Reprendre le projet Lovable « Home Plate Kitchens » et tout faire ici : site, applis iOS et Android, sécurité, montée en charge, un maximum de fonctionnalités.
2. Vraies photos.
3. Toutes les langues.
4. Livraison, livreurs payés, commissions, recherche juridique par pays, CGU et politiques.
5. Système de mémoire permanente.

**Réalisé**
- Commits `ebd3a29` à `ed9b55e` (voir [CHANGELOG.md](CHANGELOG.md)) :
  - base de données sécurisée ;
  - Stripe Connect ;
  - site complet ;
  - applis Expo ;
  - 10 langues ;
  - CI ;
  - documentation de mise en ligne.
- Aperçu cliquable publié : https://claude.ai/artifact/Qb8Cw4VCfGKUv2T65ikACR. Zip du projet envoyé à l'utilisateur.
- Recherche juridique, enregistrée dans [LEGAL_RESEARCH.md](LEGAL_RESEARCH.md).
- Début de la livraison #10 : schéma et sécurité modifiés, non commités.
- Système de mémoire (#13) :
  - audit (Claude Code 2.1.312, conteneur cloud éphémère, ni `CLAUDE.md`, ni skills, ni MCP, ni dépôt distant) ;
  - création de `CLAUDE.md`, des docs, de 5 skills, de 3 hooks et de `check-docs.sh` ;
  - mémoire globale installée pour cette session.

**Problèmes** : le dépôt GitHub est introuvable, le réseau bloque les photos, Docker est indisponible. Voir [CURRENT_STATUS.md](CURRENT_STATUS.md).

**Suite de la session**
- #10, partie serveur : terminée et testée (120 tests SQL). Commit `4e75c54`.
- L'utilisateur a fourni son compte Stripe (`acct_1UNYJHArjF3GfFcv`) et demandé de le brancher. Bloqué : il faut d'abord le projet Supabase et les clés (voir [TASKS.md](TASKS.md) #14).
- Zip complet du projet envoyé à l'utilisateur ; guide [GITHUB.md](GITHUB.md) ajouté.
- L'utilisateur veut que « rien ne se perde » et que Claude se souvienne de tout. Le dépôt GitHub n'existe toujours pas (`add_repo` : not found) : c'est la seule action qui manque pour une sauvegarde en ligne automatique.

**Ancien point d'arrêt** (remplacé par ce qui suit) : terminer #10. Écrire la migration `20261029000006_delivery.sql`, la tester avec `bash supabase/tests/run.sh`, puis passer aux fonctions Edge, aux pages (#11) et aux documents juridiques (#12). Détail dans [TASKS.md](TASKS.md).

**Point d'arrêt actuel** :
1. Dès que le dépôt GitHub existe : `add_repo` puis push de `main`, et vérifier en ligne.
2. Ensuite, #11 : écrans livreur, choix du livreur et du pourboire au panier, back-office, mode `courier` dans les écrans cuisinière.
3. Stripe (#14) dès que l'utilisateur a créé le projet Supabase et fourni l'URL, la clé `anon` et la clé `pk_test`.
