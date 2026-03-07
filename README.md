# Matière 🏗️

**Matière** est une plateforme avancée de gestion et de suivi technique de projets B2B. Elle permet de centraliser les données terrain, de suivre l'avancement des études et travaux, de gérer des galeries médias via Cloudflare R2 et de générer des rapports techniques complets.

## ✨ Fonctionnalités Clés

- **Dashboard Interactif** : Cartographie mondiale et par projet (Leaflet) avec indicateurs d'avancement.
- **Suivi des Projets** : Gestion granulaire des étapes (Prospection, Études, Travaux) et détails techniques.
- **Galerie Média Intelligente** : Traitement et stockage d'images/vidéos sur Cloudflare R2 avec migration fluide.
- **Gestion Documentaire** : Lecteur PDF intégré et export de rapports de synthèse automatiques.
- **Système de Permissions Avancé** : Rôles globaux (Admin, User, Visitor) et autorisations par projet (Owner, Manage, Write, Read).

## 🛠️ Stack Technique

- **Framework** : [Next.js 15](https://nextjs.org/) (App Router)
- **Langage** : TypeScript
- **Base de Données** : [Neon](https://neon.tech/) (Serverless PostgreSQL)
- **ORM** : [Drizzle ORM](https://orm.drizzle.team/)
- **Authentification** : [NextAuth.js v5](https://authjs.dev/)
- **Style** : Tailwind CSS 4 & Radix UI
- **Infrastructure** : Cloudflare (Workers, Pages, R2, KV via OpenNext)
- **Cartographie** : Leaflet & React-Leaflet
- **Génération PDF** : jsPDF & html2canvas

## 🚀 Démarrage Rapide

### 1. Prérequis

- Node.js 20+
- Un compte [Neon.tech](https://neon.tech/) pour la base de données.
- Un compte Cloudflare avec R2 activé (pour le stockage média).

### 2. Installation

```bash
git clone <repository-url>
cd sitematiere-nexjs
npm install
```

### 3. Configuration

Copiez le fichier d'exemple et remplissez les variables :
```bash
cp .env .env.local
```

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | URL de connexion Neon PostgreSQL. |
| `AUTH_SECRET` | Secret pour NextAuth (généré via `npx auth secret`). |
| `CLOUDFLARE_R2_BUCKET` | Nom du bucket R2 pour les médias. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Configuration Cloudinary pour l'optimisation d'images. |

### 4. Base de données

```bash
# Générer les migrations
npm run db:generate

# Pousser le schéma vers Neon
npm run db:push

# Lancer Drizzle Studio pour explorer les données
npm run db:studio
```

### 5. Lancement

```bash
# Développement local
npm run dev

# Développement via Wrangler (Cloudflare)
npm run dev:worker
```

### Architecture du Projet

```text
├── app/                # Root Layout, (auth), api, et pages du dashboard
├── components/         # Composants UI (Dashboard, Project, Layout)
├── drizzle/            # Schémas et fichiers de migration
├── lib/                # Logique métier, utilitaires (db, auth, permissions)
├── public/             # Assets statiques
├── scripts/            # Scripts de migration (R2), backup et automation
└── wrangler.toml       # Configuration Cloudflare Workers
```

### 🔄 Flux de Données & Cycle de vie

1. **Requête Client** : L'utilisateur interagit avec le Dashboard (Next.js Client Components).
2. **Couche API / Actions** : Les requêtes transitent par les `Server Actions` ou `Route Handlers` (`app/api`).
3. **Middleware** : Vérification systématique de la session et des permissions (`middleware.ts`).
4. **Logique Métier** : Traitement dans `lib/` (validation Zod, calcul de coordonnées, filtrage de permissions).
5. **Couche Données** : Interaction avec Neon via Drizzle ORM.
6. **Stockage Média** : Les fichiers sont uploadés/récupérés vers Cloudflare R2 avec transformation Cloudinary.

### 🔐 Gestion des Permissions

Le système repose sur une matrice de droits croisés :
`Rôle Global (DB) + Autorisation Projet (DB) = Capacité d'Action (UI/API)`

## 🧪 Tests & Linting

```bash
# Vérification complète (Types + Lint + Build)
npm test

# Lancer uniquement le linter
npm run lint
```

## 📦 Déploiement

Le projet utilise **OpenNext** pour un déploiement optimisé sur Cloudflare Workers/Pages.

```bash
# Construire le worker
npm run build:worker

# Déployer sur Cloudflare
npm run deploy
```

## 📂 Documentation Additionnelle

- [Guide des Rôles & Permissions](ROLES_PERMISSIONS.md)
- [Guide de Sauvegarde](BACKUP_GUIDE.md)
- [Guide de Build & Déploiement](BUILD_GUIDE.md)

---
*Développé pour une gestion technique rigoureuse et performante.*
