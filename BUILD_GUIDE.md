# Guide de Build et Déploiement

Ce projet est configuré pour fonctionner dans deux environnements distincts : votre machine locale (Windows/Node.js) et Cloudflare Pages (Edge Runtime). En raison des limitations du runtime Edge en local, un système de bascule automatique est utilisé...

## 🚀 Commandes de base

### 1. Développement Local (PC)
Pour travailler sur le projet au quotidien :
```bash
# S'assurer que le projet est en mode local
npm run local

# Lancer le serveur de développement
npm run dev
```

### 2. Build de test Local
Pour tester le comportement "production" sur votre machine avant d'envoyer en ligne :
```bash
# Aligne la config sur le local ET lance le build Next.js
npm run build
```

### 3. Déploiement Cloudflare (En ligne)
Cette commande est destinée à être configurée dans l'interface de **Cloudflare Pages**.
```bash
# Active le mode Edge, build le projet, puis revient en mode local
npm run build:cloudflare
```

---

## 📊 Synthèse des Commandes

| Commande | Action technique | Utilisation Recommandée |
| :--- | :--- | :--- |
| **`npm run local`** | Commente `runtime = 'edge'` | **Développement Quotidien** : À lancer avant `npm run dev`. |
| **`npm run cloudflare`** | Décommente `runtime = 'edge'` | **Préparation Manuelle** : Avant un Git Push (optionnel si build auto). |
| **`npm run build:cloudflare`** | Toggle + Build Cloudflare | **Configuration Cloudflare** : Dans le champ "Build command". |

---

## 💡 Différences entre les commandes Cloudflare

### `npm run cloudflare` vs `npm run build:cloudflare`
- **`npm run cloudflare`** : Ne fait **que** la préparation des fichiers. Il active le mode Edge sur vos fichiers locaux. Si vous poussez votre code après cette commande, Cloudflare recevra un code déjà prêt, mais il devra quand même builder.
- **`npm run build:cloudflare`** : C'est la commande "complète". Elle prépare les fichiers **ET** lance la compilation pour Cloudflare. C'est la commande la plus sûre à utiliser dans l'interface Cloudflare car elle garantit que les fichiers sont dans le bon état avant de commencer la compilation.

> [!IMPORTANT]
> Sur Cloudflare Pages, utilisez toujours **`npm run build:cloudflare`**. Cela évite d'avoir à se soucier de l'état (local ou edge) de votre code avant de faire un commit/push. Le serveur de build s'occupera de faire la bascule automatiquement.

### La bascule de Runtime (`scripts/toggle-runtime.js`)
Next.js (version 15) nécessite que les routes soient explicitement marquées avec `export const runtime = 'edge'` pour fonctionner sur Cloudflare. Cependant, cette ligne provoque des erreurs sur Windows en local (conflit avec Prisma/Node).

Le script de bascule effectue les opérations suivantes :
- **Mode cloudflare** : Décommente `export const runtime = 'edge'` dans les fichiers API et Pages.
- **Mode local** : Commente ces lignes pour utiliser le runtime Node.js standard.

### Fichiers impactés
Le système gère automatiquement le runtime pour les fichiers suivants (Pages et API) :
- `app/layout.tsx`
- `app/page.tsx`
- `app/projects/[id]/page.tsx`
- `app/export-db/page.tsx`
- Toutes les routes API dans `app/api/...`

---

## 🔍 Outils de Diagnostic

### Debug Endpoints
En cas de problème sur Cloudflare, vous pouvez consulter ces endpoints :
- `/api/debug` : Vérifie la présence des variables d'environnement et la connexion à la base de données.
- `/api/debug/auth` : Vérifie l'état de la session d'authentification.

### Scripts d'administration
- `npx tsx scripts/reset-admin-password.ts` : Réinitialise ou crée le compte administrateur.
- `npx tsx scripts/check-users.ts` : Liste les utilisateurs enregistrés en base.
- `node scripts/check-env-vars.js` : Vérifie les variables d'environnement locales.

---

## ☁️ Configuration Cloudflare Pages

Pour un déploiement réussi, configurez les paramètres suivants dans votre tableau de bord Cloudflare :

1. **Framework Preset** : `Next.js`
2. **Build Command** : `npm run build:cloudflare`
3. **Build Output Directory** : `.vercel/output/static` (Default for next-on-pages)
4. **Compatibility Flags**: (Dans Settings > Functions > Compatibility Flags)
   - Ajoutez `nodejs_compat` pour les environnements **Production** et **Preview**.

### Variables d'Environnement
**IMPORTANT** : Les variables doivent être définies dans l'interface Cloudflare (Settings > Variables).
Les variables requises sont :
- `DATABASE_URL` (Secret) : URL Neon PostgreSQL.
- `NEXTAUTH_SECRET` (Secret) : Une chaîne aléatoire pour sécuriser les tokens.
- `NEXTAUTH_URL` : L'URL de production (`https://sitematiere-nexjs.pages.dev`).
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (Secret), `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL`.

---

## ⚠️ Résolution des problèmes fréquents

### Erreur Prisma sur Cloudflare
Si Prisma échoue en ligne, `lib/prisma.ts` bascule automatiquement sur l'adaptateur `@prisma/adapter-neon` via WebSockets. Assurez-vous que la version de `@prisma/adapter-neon` correspond bien à celle de `@prisma/client` dans `package.json`.

### Erreur "Build failed" (Incompatibilité Type)
Le projet utilise `@prisma/adapter-neon` version v6.19.2 pour garantir la compatibilité avec le client Edge. Ne mettez pas à jour l'adaptateur vers la v7 sans mettre à jour le client Prisma.
