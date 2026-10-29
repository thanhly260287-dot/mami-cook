# Mettre le projet sur GitHub (débutant)

GitHub sert de coffre-fort en ligne pour le code. Une fois le dépôt créé et autorisé, Claude y enregistre tout automatiquement.

## Méthode recommandée : créer un dépôt vide et laisser Claude l'envoyer

1. Allez sur https://github.com/new (connecté au compte **thanhly260287-dot**).
2. **Repository name** : `mami-cook`.
3. Choisissez **Private**.
4. **Ne cochez rien** : pas de README, de .gitignore ni de licence. Le dépôt doit rester vide.
5. Cliquez sur **Create repository**.
6. Allez sur https://claude.ai/connect-github et vérifiez que l'appli **Claude** a accès au dépôt `mami-cook` :
   - **Configure** ;
   - **Repository access** ;
   - **Only select repositories**, ajoutez `mami-cook` (ou **All repositories**) ;
   - **Save**.
7. Revenez dans la conversation avec Claude et écrivez : « le dépôt est créé ». Claude envoie tout le projet et son historique.

## Méthode manuelle (si vous voulez déposer le dossier vous-même)

Sur la page du dépôt vide, cliquez sur **uploading an existing file**, puis glissez-déposez le **contenu** du dossier `mami-cook`, et non le dossier lui-même. Cliquez ensuite sur **Commit changes**.

Limites de cette méthode :
- l'historique des modifications n'est pas conservé ;
- les dossiers et fichiers commençant par un point (`.github`, `.claude`, `.gitignore`) sont parfois ignorés par le glisser-déposer.

La première méthode est donc préférable.
