# Guide de Build et Déploiement

Ce projet est configuré pour fonctionner dans deux environnements distincts : votre machine locale (Windows/Node.js) et Cloudflare Pages (Edge Runtime). En raison des limitations du runtime Edge en local, un système de bascule automatique est utilisé..

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

## 🛠 Fonctionnement technique

### La bascule de Runtime (`scripts/toggle-runtime.js`)
Next.js (version 15) nécessite que les routes soient explicitement marquées avec `export const runtime = 'edge'` pour fonctionner sur Cloudflare. Cependant, cette ligne provoque des erreurs sur Windows en local (conflit avec Prisma/Node).

Le script de bascule effectue les opérations suivantes :
- **Mode cloudflare** : Décommente `export const runtime = 'edge'` dans les fichiers API et Pages.
- **Mode local** : Commente ces lignes pour utiliser le runtime Node.js standard.

### Fichiers impactés
Le système gère automatiquement 13 fichiers clés, notamment :
- Les pages principales (`app/page.tsx`, `app/projects/[id]/page.tsx`)
- Toutes les routes API (`app/api/auth`, `app/api/files/...`, `app/api/users`)

---

## ☁️ Configuration Cloudflare Pages

Pour un déploiement réussi, configurez les paramètres suivants dans votre tableau de bord Cloudflare :

1. **Framework Preset** : `Next.js`
2. **Build Command** : `npm run build:cloudflare`
3. **Build Output Directory** : `.vercel/output` (ou laissez par défaut si détecté)

### Variables d'Environnement
Assurez-vous d'avoir défini les variables suivantes dans **Settings > Environment Variables** sur Cloudflare :
- `DATABASE_URL` (Secret)
- `NEXTAUTH_SECRET` (Secret)
- `NEXTAUTH_URL` (URL de votre site)
- Clés R2 (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, etc.)

## 🔐 Configuration des Variables et Secrets

Comme le projet est maintenant synchronisé directement avec GitHub, vous devez configurer vos variables directement dans l'interface de **Cloudflare Pages** :

1. Allez sur votre [Tableau de bord Cloudflare](https://dash.cloudflare.com/).
2. Allez dans **Workers & Pages** > Sélectionnez votre projet `sitematiere-nexjs`.
3. Allez dans **Settings** > **Variables**.
4. Dans la section **Environment variables**, cliquez sur **Add variables**.
5. Ajoutez les variables suivantes (en utilisant les valeurs de votre fichier `.env.production`) :
   - `DATABASE_URL` (Secret)
   - `NEXTAUTH_SECRET` (Secret)
   - `NEXTAUTH_URL`
   - `R2_ENDPOINT`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY` (Secret)
   - `R2_BUCKET_NAME`
6. Cliquez sur **Save**.

---

## ⚠️ Résolution des problèmes fréquents

### Erreur "MissingCSRF" en local
Si vous n'arrivez plus à vous connecter sur `localhost:3000` :
1. Lancez `npm run local`.
2. Videz les cookies de votre navigateur pour `localhost`.
3. Vérifiez que `trustHost: true` est bien présent dans `lib/auth.ts`.

### Erreur Prisma sur Cloudflare
Si Prisma échoue en ligne, vérifiez que `lib/prisma.ts` utilise bien le `PrismaNeon` adapter et la `Pool` de Neon Database, car les binaires Prisma standards ne fonctionnent pas en mode Edge.
