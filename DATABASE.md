# Documentation de la Base de Données - Site Matière

## Vue d'ensemble

Site Matière utilise **PostgreSQL** comme système de gestion de base de données relationnelle, avec **Prisma** comme ORM (Object-Relational Mapping) pour interagir avec la base de données de manière type-safe..

## Stack Technique

- **Base de données** : PostgreSQL
- **ORM** : Prisma (v6.19.2)
- **Client** : @prisma/client avec support double runtime
- **Adaptateur Edge** : PrismaNeon (pour Cloudflare Pages)
- **Configuration** : Variables d'environnement via `DATABASE_URL`

## Architecture du Schéma

Le schéma de base de données comprend **7 modèles principaux** et **5 énumérations**.

### Modèles Principaux

#### 1. User (Utilisateur)
Gestion de l'authentification et des autorisations.

```prisma
model User {
  id           String    @id @default(cuid())
  email        String?   @unique
  name         String?
  passwordHash String
  role         UserRole  @default(USER)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  username     String?   @unique
  color        String?   @default("#6366f1")
  projects     Project[] @relation("ProjectOwner")
}
```

**Champs clés** :
- `passwordHash` : Mot de passe hashé avec bcrypt
- `role` : Rôle de l'utilisateur (ADMIN, USER, VISITOR)
- `color` : Couleur personnelle pour l'identification visuelle
- `username` : Nom d'utilisateur unique pour la connexion

#### 2. Project (Projet)
Entité centrale représentant un projet de construction.

```prisma
model Project {
  id              String           @id @default(cuid())
  name            String           @db.VarChar(255)
  country         String           @db.VarChar(255)
  latitude        Float
  longitude       Float
  description     String?
  type            ProjectType
  status          ProjectStatus    @default(PROSPECT)
  prospection     Int              @default(0)
  studies         Int              @default(0)
  fabrication     Int              @default(0)
  transport       Int              @default(0)
  construction    Int              @default(0)
  projectCode     String?          @db.VarChar(255)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  ownerId         String
  documents       Document[]
  files           File[]
  images          Image[]
  owner           User             @relation("ProjectOwner", fields: [ownerId], references: [id])
  slideshowImages SlideshowImage[]
  videos          Video[]
}
```

**Caractéristiques** :
- **Coordonnées géographiques** : `latitude` et `longitude` pour le positionnement sur la carte
- **Suivi de progression** : 5 phases (prospection, studies, fabrication, transport, construction) avec des valeurs de 0 à 100
- **Relations** : Un projet appartient à un utilisateur et peut avoir plusieurs documents, fichiers, images et vidéos

#### 3. Image
Assets photographiques des projets.

```prisma
model Image {
  id              String           @id @default(cuid())
  url             String
  alt             String?
  order           Int              @default(0)
  projectId       String
  createdAt       DateTime         @default(now())
  project         Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  slideshowImages SlideshowImage[]
}
```

#### 4. SlideshowImage
Gestion des diaporamas par projet.

```prisma
model SlideshowImage {
  id          String   @id @default(cuid())
  projectId   String
  imageId     String
  order       Int      @default(0)
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  image       Image    @relation(fields: [imageId], references: [id], onDelete: Cascade)
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, imageId])
}
```

**Contraintes** :
- `@@unique([projectId, imageId])` : Une image ne peut apparaître qu'une seule fois par projet dans le diaporama
- `isPublished` : Permet de préparer des images en brouillon avant publication

#### 5. Video
Assets vidéo des projets.

```prisma
model Video {
  id        String   @id @default(cuid())
  url       String
  title     String?
  projectId String
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

#### 6. Document
Documentation technique des projets.

```prisma
model Document {
  id        String       @id @default(cuid())
  url       String
  name      String
  type      DocumentType
  projectId String
  createdAt DateTime     @default(now())
  project   Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**Types de documents** :
- `PLAN` : Plans techniques
- `FLAG` : Drapeau du pays
- `CLIENT_LOGO` : Logo client
- `PIN` : Icône personnalisée pour la carte
- `OTHER` : Autres documents

#### 7. File (Fichier)
Stockage général de fichiers avec intégration R2.

```prisma
model File {
  id           String    @id @default(cuid())
  name         String
  blobUrl      String    @unique
  blobPath     String
  fileType     FileType
  mimeType     String
  size         Int
  projectId    String?
  thumbnailUrl String?
  width        Int?
  height       Int?
  duration     Int?
  isDeleted    Boolean   @default(false)
  deletedAt    DateTime?
  deletedBy    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  project      Project?  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**Particularités** :
- **Soft delete** : `isDeleted`, `deletedAt`, `deletedBy` pour suppression logique
- **Métadonnées** : Dimensions (width/height), durée pour les vidéos
- **Stockage** : URLs vers R2 (Cloudflare) via `blobUrl`

### Énumérations (Enums)

#### UserRole
```prisma
enum UserRole {
  USER     // Utilisateur standard
  ADMIN    // Administrateur (accès complet)
  VISITOR  // Visiteur (lecture seule)
}
```

#### ProjectType
Types de projets de construction :
```prisma
enum ProjectType {
  PRS        // Pont Roulant Standard
  PEB        // Pont Extra-large Bi-rail
  MPB        // Moyen Pont Bi-rail
  MXB        // Maxi Pont Bi-rail
  UB         // Under Bridge
  PASSERELLE // Passerelle
  AUTRE      // Autre type
}
```

#### ProjectStatus
États d'avancement du projet :
```prisma
enum ProjectStatus {
  DONE      // Terminé
  CURRENT   // En cours
  PROSPECT  // Prospect
}
```

#### DocumentType
```prisma
enum DocumentType {
  PLAN         // Plans techniques
  FLAG         // Drapeau pays
  CLIENT_LOGO  // Logo client
  PIN          // Icône carte
  OTHER        // Autre
}
```

#### FileType
```prisma
enum FileType {
  IMAGE     // Images
  DOCUMENT  // Documents
  VIDEO     // Vidéos
  AUDIO     // Audio
  ARCHIVE   // Archives (zip, etc.)
  OTHER     // Autre
}
```

## Configuration du Client

**Fichier** : `lib/prisma.ts`

### Support Double Runtime

Le client Prisma est configuré pour fonctionner dans deux environnements :

#### Runtime Edge (Cloudflare Pages)
```typescript
if (process.env.NEXT_RUNTIME === 'edge' || process.env.CF_PAGES === '1') {
  const connectionString = process.env.DATABASE_URL;
  const adapter = new PrismaNeon({ connectionString });
  prisma = new PrismaClient({ adapter });
}
```

Utilise l'adaptateur **PrismaNeon** pour la compatibilité avec l'environnement edge de Cloudflare.

#### Runtime Node.js (Développement local)
```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
}
prisma = globalForPrisma.prisma;
```

Utilise le **pattern singleton** pour éviter les multiples instances en développement (hot reload).

## Patterns d'Accès aux Données

### 1. Server Actions (`app/actions/`)

Operations côté serveur pour les mutations de données.

**Exemple** : `app/actions/project-actions.ts`
```typescript
"use server";
import prisma from "@/lib/prisma";

export async function updateProject(formData: ProjectUpdateInput) {
  // Validation et autorisation...

  await prisma.project.update({
    where: { id: validatedData.id },
    data: {
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      description: validatedData.description,
      // ...
    },
  });

  revalidatePath('/'); // Invalidation du cache
}
```

**Avantages** :
- Appel direct depuis les composants React
- Validation intégrée avec Zod
- Gestion automatique des autorisations

### 2. Routes API (`app/api/`)

Points d'accès REST pour les opérations de lecture.

**Exemple** : `app/api/projects/route.ts`
```typescript
export async function GET() {
  const session = await auth();

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, country: true },
    orderBy: { name: 'asc' },
  });

  // Filtrage selon le rôle
  const filteredProjects = isAdmin
    ? projects
    : projects.filter(p => p.country !== 'Système');

  return NextResponse.json(filteredProjects);
}
```

### 3. Authentification

Intégration avec **NextAuth.js v5** via `PrismaAdapter`.

**Fichier** : `lib/auth.ts`
```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // ...
});
```

## Sécurité

### 1. Contrôle d'Accès Basé sur les Rôles (RBAC)

Chaque action vérifie le rôle de l'utilisateur :

```typescript
const userRole = (session.user as { role?: string })?.role;
if (userRole !== "ADMIN" && userRole !== "USER") {
  throw new Error("Action non autorisée");
}
```

**Hiérarchie des rôles** :
- **ADMIN** : Accès complet (CRUD utilisateurs, tous les projets)
- **USER** : Modification des projets autorisés
- **VISITOR** : Lecture seule

### 2. Validation des Entrées

Utilisation de **Zod** pour valider toutes les entrées :

```typescript
const ProjectUpdateSchema = z.object({
  id: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  // ...
});

const validatedData = ProjectUpdateSchema.parse(formData);
```

### 3. Suppression Logique (Soft Delete)

Les fichiers utilisent un système de suppression logique :

```typescript
// Suppression
await prisma.file.update({
  where: { id },
  data: {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: userId
  },
});

// Récupération
await prisma.file.update({
  where: { id },
  data: {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  },
});
```

Avantages :
- Conservation de l'intégrité référentielle
- Traçabilité des suppressions
- Possibilité de récupération

## Stratégie d'Indexation

Optimisation des performances avec des index sur les champs fréquemment filtrés :

```prisma
model Project {
  // ...
  @@index([country])  // Filtrage par pays
  @@index([type])     // Filtrage par type
  @@index([status])   // Filtrage par statut
}

model Image {
  // ...
  @@index([projectId])  // Récupération des images d'un projet
}

model SlideshowImage {
  // ...
  @@index([projectId, order])       // Tri du diaporama
  @@index([projectId, isPublished]) // Filtrage publication
}
```

## Relations entre les Données

```
┌─────────────┐         ┌─────────────┐
│    User     │────────<│   Project   │
│  (1)        │         │   (N)       │
└─────────────┘         └──────┬──────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │   Document  │     │    Image    │     │    Video    │
   │   (N)       │     │   (N)       │     │   (N)       │
   └─────────────┘     └──────┬──────┘     └─────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │SlideshowImage
                       │   (N)       │
                       └─────────────┘
```

**Type de relations** :
- **One-to-Many** : User → Projects, Project → Documents/Images/Videos
- **Many-to-Many** : Project ↔ Image (via SlideshowImage)
- **Cascade Delete** : Suppression d'un projet supprime ses documents, images, etc.

## Bonnes Pratiques Implémentées

1. **Transactions implicites** : Les opérations liées sont groupées dans une seule requête
2. **Suppression en cascade** : `onDelete: Cascade` pour maintenir l'intégrité
3. **Type Safety** : TypeScript avec Prisma Client pour détecter les erreurs à la compilation
4. **Gestion des erreurs** : Try-catch avec messages utilisateur appropriés
5. **Invalidation du cache** : `revalidatePath()` après les mutations
6. **Isolation des environnements** : Adaptateurs différents pour edge vs node

## Workflow de Développement

### Commandes Prisma

```bash
# Générer le client Prisma (après installation)
npm run postinstall

# Pousser les changements de schéma vers la base de données
npx prisma db push

# Créer une migration
npx prisma migrate dev --name nom_migration

# Ouvrir Prisma Studio (interface graphique)
npx prisma studio

# Valider le schéma
npx prisma validate

# Formater le schéma
npx prisma format
```

### Seed de Données

**Fichier** : `lib/seed.ts`

Création automatique d'un administrateur par défaut :

```typescript
export async function seedAdminUser() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@sitematiere.com' }
  });

  if (!existingAdmin) {
    const hashedPassword = await hash('admin123', 12);
    await prisma.user.create({
      data: {
        email: 'admin@sitematiere.com',
        name: 'admin',
        passwordHash: hashedPassword,
        role: 'ADMIN'
      }
    });
  }
}
```

## Fichiers Clés

- **`prisma/schema.prisma`** : Définition du schéma de base de données
- **`lib/prisma.ts`** : Configuration du client Prisma
- **`lib/seed.ts`** : Initialisation des données par défaut
- **`lib/auth.ts`** : Configuration NextAuth avec PrismaAdapter
- **`app/actions/*.ts`** : Server Actions pour les mutations
- **`app/api/*/route.ts`** : Routes API pour les lectures

---

**Note** : Ce schéma de base de données est conçu pour évoluer avec l'application. Utilisez toujours les migrations Prisma pour modifier la structure en production afin de préserver les données existantes.
