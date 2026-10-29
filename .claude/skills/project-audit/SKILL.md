---
name: project-audit
description: Auditer le projet. Compare le cahier des charges au code réellement présent ; relève les fonctionnalités manquantes, les erreurs, les dépendances vulnérables, les risques de sécurité et les tests manquants. À utiliser quand l'utilisateur demande un audit, un bilan, ou « qu'est-ce qui manque ? ».
---

# Audit du projet

L'audit est en lecture seule : on ne corrige rien pendant l'audit. On présente un rapport, puis on demande quoi corriger.

## 1. Exigences et code

Lire `docs/REQUIREMENTS.md` et `docs/TASKS.md`. Pour chaque fonctionnalité, chercher la preuve dans le code :

| Où chercher | Comment |
| --- | --- |
| Pages du site | `grep -n "path:" apps/web/src/App.tsx` |
| Écrans mobiles | `find apps/mobile/src/app -name "*.tsx"` |
| Fonctions SQL | `grep -n "^create or replace function" supabase/migrations/*.sql` |
| Fonctions Edge | `ls supabase/functions` |
| Appels côté client | `grep -rn "rpc(\"" apps/web/src apps/mobile/src` |

Classer chaque fonctionnalité : présente et testée, présente mais non testée, partielle, absente.

## 2. Tests et qualité

Lancer les suites listées dans `docs/TESTS.md` (au minimum shared, i18n, typecheck web et mobile ; SQL et E2E si possible). Noter les échecs exacts.

## 3. Sécurité

- **RLS** : chaque table de `public` doit avoir `enable row level security` :
  ```bash
  grep -c "enable row level security" supabase/migrations/*.sql
  ```
  Comparer avec la liste des `create table`.
- Fonctions `security definer` : `set search_path = ''` et vérification de `auth.uid()` ou du rôle.
- **Secrets** :
  ```bash
  git grep -nE "sk_live|sk_test_[A-Za-z0-9]{10}|whsec_[A-Za-z0-9]|service_role|BEGIN (RSA|EC|OPENSSH) PRIVATE" -- . ':!docs'
  ```
  Lancer aussi `gitleaks detect` s'il est installé.
- **Dépendances** : `pnpm audit --prod` (si le réseau le permet).
- En-têtes HTTP : `apps/web/security-headers.json`.

## 4. Rapport

Tableau classé par gravité (critique, important, mineur). Pour chaque point :
- le constat ;
- la preuve (fichier et ligne, ou commande) ;
- le risque ;
- la correction proposée.

Puis :
- ajouter les points retenus dans `docs/TASKS.md` (« À faire ») ;
- mettre à jour « Ce qui n'est pas vérifié » dans `docs/CURRENT_STATUS.md` ;
- noter l'audit dans `docs/TESTS.md` (date et résultats).

Ne rien affirmer sans preuve : « non vérifié » vaut mieux qu'une supposition.
