# Plan de Migration - PHP vers Next.js/React/PostgreSQL

## Objectif

Migrer l'application web de gestion de projets de ponts métalliques depuis une architecture PHP/MySQL monolithique vers une stack moderne Next.js/React/PostgreSQL avec une architecture découplée.

---

## 🎯 Architecture Cible

### Stack Technologique

**Frontend**
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS + shadcn/ui
- **Maps**: React Google Maps API (@vis.gl/react-google-maps)
- **State Management**: React Context + Zustand
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Fetch API native

**Backend**
- **Runtime**: Next.js API Routes (App Router)
- **ORM**: Prisma
- **Database**: PostgreSQL 16
- **Authentication**: NextAuth.js v5
- **File Storage**: Vercel Blob ou AWS S3
- **Email**: Resend ou SendGrid

**DevOps**
- **Hosting**: Vercel (Frontend + API)
- **Database**: Vercel Postgres ou Supabase
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics + Sentry

---

## 📊 Comparaison Architecture

| Aspect | Actuel (PHP) | Cible (Next.js) |
|--------|--------------|-----------------|
| **Architecture** | Monolithique | JAMstack + API |
| **Rendering** | Server-side PHP | SSR/SSG/ISR |
| **Database** | MySQL | PostgreSQL |
| **ORM** | Aucun (SQL brut) | Prisma |
| **Auth** | Custom (faible) | NextAuth.js |
| **API** | Endpoints PHP | REST API Routes |
| **File Upload** | PHP move_uploaded_file | Vercel Blob |
| **Deployment** | FTP manuel | Git push (CI/CD) |

---

## 🗄️ Migration de la Base de Données

### Étape 1: Analyse du Schéma MySQL

**Table actuelle `maps`**:
```sql
CREATE TABLE maps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(255),
  pays VARCHAR(255),
  latitude DOUBLE,
  longitude DOUBLE,
  chemin_images TEXT,
  texte TEXT,
  chemin_flag VARCHAR(255),
  plan VARCHAR(255),
  pin VARCHAR(255),
  prospection INT,
  etudes INT,
  fabrication INT,
  transport INT,
  construction INT,
  chemin_client VARCHAR(255),
  code VARCHAR(255),  -- ⚠️ Mot de passe en clair
  type CHAR(15),
  RecordDate DATETIME,
  video VARCHAR(255),
  prochantier TEXT
);
```

### Étape 2: Schéma PostgreSQL avec Prisma

**Fichier `prisma/schema.prisma`**:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Modèle utilisateur pour l'authentification
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String    // Hashé avec bcrypt
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  projects      Project[] @relation("ProjectOwner")
  
  @@map("users")
}

enum UserRole {
  USER
  ADMIN
}

// Modèle principal des projets de ponts
model Project {
  id              String        @id @default(cuid())
  name            String        @db.VarChar(255)
  country         String        @db.VarChar(255)
  latitude        Float
  longitude       Float
  description     String?       @db.Text
  type            ProjectType
  status          ProjectStatus @default(PROSPECT)
  
  // Progression (0-100)
  prospection     Int           @default(0)
  studies         Int           @default(0) // "etudes"
  fabrication     Int           @default(0)
  transport       Int           @default(0)
  construction    Int           @default(0)
  
  // Relations
  images          Image[]
  videos          Video[]
  documents       Document[]
  
  // Métadonnées
  projectCode     String?       @db.VarChar(255) // "prochantier"
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // Relation propriétaire
  ownerId         String
  owner           User          @relation("ProjectOwner", fields: [ownerId], references: [id])
  
  @@index([country])
  @@index([type])
  @@index([status])
  @@map("projects")
}

enum ProjectType {
  PRS
  PEB
  MPB
  MXB
  UB
  PASSERELLE
  AUTRE
}

enum ProjectStatus {
  DONE
  CURRENT
  PROSPECT
}

// Modèle pour les images
model Image {
  id          String   @id @default(cuid())
  url         String   // URL Vercel Blob ou S3
  alt         String?
  order       Int      @default(0)
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  
  @@index([projectId])
  @@map("images")
}

// Modèle pour les vidéos
model Video {
  id          String   @id @default(cuid())
  url         String
  title       String?
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  
  @@index([projectId])
  @@map("videos")
}

// Modèle pour les documents (PDF, plans)
model Document {
  id          String       @id @default(cuid())
  url         String
  name        String
  type        DocumentType
  projectId   String
  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime     @default(now())
  
  @@index([projectId])
  @@map("documents")
}

enum DocumentType {
  PLAN
  FLAG
  CLIENT_LOGO
  OTHER
}
```

### Étape 3: Script de Migration des Données

**Fichier `scripts/migrate-data.ts`**:
```typescript
import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';

const prisma = new PrismaClient();

async function migrateData() {
  // Connexion MySQL
  const mysqlConnection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  // Récupérer toutes les données
  const [rows] = await mysqlConnection.execute('SELECT * FROM maps');
  
  // Créer un utilisateur admin par défaut
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@matiere.fr',
      name: 'Administrateur',
      passwordHash: await bcrypt.hash('NOUVEAU_MOT_DE_PASSE_SECURISE', 12),
      role: 'ADMIN',
    },
  });

  // Migrer chaque projet
  for (const row of rows as any[]) {
    const project = await prisma.project.create({
      data: {
        name: row.nom,
        country: row.pays,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        description: row.texte,
        type: mapProjectType(row.type),
        status: mapProjectStatus(row.pin),
        prospection: row.prospection || 0,
        studies: row.etudes || 0,
        fabrication: row.fabrication || 0,
        transport: row.transport || 0,
        construction: row.construction || 0,
        projectCode: row.prochantier,
        ownerId: adminUser.id,
      },
    });

    // Migrer les images
    if (row.chemin_images && row.nombre_images > 0) {
      // Créer les entrées d'images
      for (let i = 1; i <= row.nombre_images; i++) {
        await prisma.image.create({
          data: {
            url: `${row.chemin_images}${i}.jpg`,
            order: i,
            projectId: project.id,
          },
        });
      }
    }

    // Migrer les documents
    if (row.plan) {
      await prisma.document.create({
        data: {
          url: row.plan,
          name: `Plan ${row.nom}`,
          type: 'PLAN',
          projectId: project.id,
        },
      });
    }

    if (row.chemin_flag) {
      await prisma.document.create({
        data: {
          url: row.chemin_flag,
          name: `Drapeau ${row.pays}`,
          type: 'FLAG',
          projectId: project.id,
        },
      });
    }

    if (row.chemin_client) {
      await prisma.document.create({
        data: {
          url: row.chemin_client,
          name: `Logo client`,
          type: 'CLIENT_LOGO',
          projectId: project.id,
        },
      });
    }
  }

  console.log('Migration terminée avec succès!');
  await mysqlConnection.end();
  await prisma.$disconnect();
}

function mapProjectType(type: string): string {
  const mapping: Record<string, string> = {
    'PRS': 'PRS',
    'PEB': 'PEB',
    'MPB': 'MPB',
    'MXB': 'MXB',
    'UB': 'UB',
    'Passerelle': 'PASSERELLE',
    'Autre': 'AUTRE',
  };
  return mapping[type] || 'AUTRE';
}

function mapProjectStatus(pin: string): string {
  if (pin.includes('done')) return 'DONE';
  if (pin.includes('underconstruction')) return 'CURRENT';
  return 'PROSPECT';
}

migrateData().catch(console.error);
```

---

## 🎨 Migration du Frontend

### Structure des Dossiers Next.js

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard principal
│   ├── projects/
│   │   ├── page.tsx                # Liste des projets
│   │   ├── [id]/
│   │   │   ├── page.tsx            # Détail projet
│   │   │   └── edit/
│   │   │       └── page.tsx        # Édition projet
│   │   └── new/
│   │       └── page.tsx            # Nouveau projet
│   └── admin/
│       └── page.tsx                # Admin panel
├── api/
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts
│   ├── projects/
│   │   ├── route.ts                # GET /api/projects, POST
│   │   └── [id]/
│   │       └── route.ts            # GET, PUT, DELETE
│   ├── upload/
│   │   └── route.ts                # Upload fichiers
│   └── contact/
│       └── route.ts                # Formulaire contact
├── layout.tsx
└── page.tsx                        # Landing page

components/
├── ui/                             # shadcn/ui components
├── maps/
│   ├── ProjectMap.tsx              # Carte principale
│   ├── ProjectMarker.tsx           # Marqueur personnalisé
│   └── MapControls.tsx
├── projects/
│   ├── ProjectCard.tsx
│   ├── ProjectFilters.tsx
│   ├── ProjectCarousel.tsx
│   └── ProjectProgress.tsx
├── forms/
│   ├── ProjectForm.tsx
│   └── ContactForm.tsx
└── layout/
    ├── Header.tsx
    ├── Footer.tsx
    └── Sidebar.tsx

lib/
├── prisma.ts                       # Prisma client singleton
├── auth.ts                         # NextAuth config
├── validations/
│   └── project.ts                  # Zod schemas
└── utils/
    ├── coordinates.ts              # Conversion DMS/DD
    └── file-upload.ts

types/
└── index.ts                        # Types TypeScript
```

### Composants Clés

#### 1. Carte Interactive (`components/maps/ProjectMap.tsx`)

```typescript
'use client';

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useState } from 'react';
import { Project } from '@prisma/client';

interface ProjectMapProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
}

export function ProjectMap({ projects, onProjectClick }: ProjectMapProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Map
        defaultCenter={{ lat: 6, lng: 15 }}
        defaultZoom={2}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
      >
        {projects.map((project) => (
          <AdvancedMarker
            key={project.id}
            position={{ lat: project.latitude, lng: project.longitude }}
            onClick={() => {
              setSelectedProject(project);
              onProjectClick?.(project);
            }}
          >
            <img
              src={getMarkerIcon(project.status)}
              alt={project.name}
              className="w-8 h-8"
            />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}

function getMarkerIcon(status: string): string {
  const icons = {
    DONE: '/markers/pin_done.png',
    CURRENT: '/markers/pin_underconstruction.png',
    PROSPECT: '/markers/pin_prospection.png',
  };
  return icons[status as keyof typeof icons] || icons.PROSPECT;
}
```

#### 2. Formulaire de Projet (`components/forms/ProjectForm.tsx`)

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, type ProjectFormData } from '@/lib/validations/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => Promise<void>;
}

export function ProjectForm({ initialData, onSubmit }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: initialData,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name">Nom du projet</label>
        <Input
          id="name"
          {...register('name')}
          error={errors.name?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="latitude">Latitude</label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...register('latitude', { valueAsNumber: true })}
            error={errors.latitude?.message}
          />
        </div>
        <div>
          <label htmlFor="longitude">Longitude</label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...register('longitude', { valueAsNumber: true })}
            error={errors.longitude?.message}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <Textarea
          id="description"
          {...register('description')}
          rows={5}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </form>
  );
}
```

---

## 🔌 Migration du Backend (API Routes)

### API Routes Next.js

#### 1. Liste et Création de Projets (`app/api/projects/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { projectSchema } from '@/lib/validations/project';
import { z } from 'zod';

// GET /api/projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Filtres
    const country = searchParams.get('country');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where = {
      ...(country && { country }),
      ...(type && { type: type as any }),
      ...(status && { status: status as any }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          _count: { select: { images: true, videos: true } },
        },
        skip,
        take: limit,
        orderBy: [{ country: 'asc' }, { name: 'asc' }],
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = projectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        ownerId: session.user.id,
      },
      include: {
        images: true,
        videos: true,
        documents: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
```

#### 2. Upload de Fichiers (`app/api/upload/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large (max 10MB)' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Upload vers Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

---

## 🔐 Authentification avec NextAuth.js

**Fichier `lib/auth.ts`**:
```typescript
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
```

---

## 📦 Plan de Migration par Phases

### Phase 1: Préparation (1-2 semaines)
- [ ] Configurer le projet Next.js
- [ ] Installer les dépendances (Prisma, NextAuth, etc.)
- [ ] Créer le schéma Prisma
- [ ] Configurer PostgreSQL (Vercel Postgres)
- [ ] Migrer les données MySQL → PostgreSQL
- [ ] Vérifier l'intégrité des données

### Phase 2: Backend/API (2-3 semaines)
- [ ] Créer les API routes pour les projets (CRUD)
- [ ] Implémenter l'authentification NextAuth
- [ ] Créer l'API d'upload de fichiers
- [ ] Migrer les fichiers vers Vercel Blob
- [ ] Créer l'API de contact/email
- [ ] Tests des endpoints API

### Phase 3: Frontend (3-4 semaines)
- [ ] Créer le layout principal
- [ ] Implémenter la page d'accueil (landing)
- [ ] Créer le dashboard avec carte interactive
- [ ] Implémenter les filtres et recherche
- [ ] Créer les pages de détail projet
- [ ] Implémenter le carrousel d'images
- [ ] Créer les formulaires (projet, contact)
- [ ] Implémenter l'admin panel

### Phase 4: Tests et Optimisation (1-2 semaines)
- [ ] Tests end-to-end (Playwright)
- [ ] Tests d'accessibilité
- [ ] Optimisation des performances (Lighthouse)
- [ ] Optimisation SEO
- [ ] Tests de sécurité

### Phase 5: Déploiement (1 semaine)
- [ ] Configuration Vercel
- [ ] Configuration des variables d'environnement
- [ ] Migration DNS
- [ ] Tests en production
- [ ] Formation utilisateurs
- [ ] Documentation

---

## 🔒 Améliorations de Sécurité

### Comparaison

| Aspect | PHP (Actuel) | Next.js (Cible) |
|--------|--------------|-----------------|
| **Mots de passe** | Texte clair | Bcrypt (12 rounds) |
| **Injection SQL** | Vulnérable | Prisma (ORM sécurisé) |
| **CSRF** | Non protégé | NextAuth CSRF tokens |
| **XSS** | Vulnérable | React auto-escape |
| **Clés API** | Exposées | Variables d'environnement |
| **Sessions** | Absentes | JWT sécurisés |
| **HTTPS** | Optionnel | Forcé (Vercel) |
| **Rate Limiting** | Absent | Middleware Next.js |

---

## 📈 Avantages de la Migration

### Performance
- **SSR/SSG**: Pages pré-rendues pour un chargement instantané
- **Code Splitting**: Chargement optimisé du JavaScript
- **Image Optimization**: Next.js Image component
- **Edge Functions**: Latence réduite

### Développement
- **TypeScript**: Typage fort, moins d'erreurs
- **Hot Reload**: Développement plus rapide
- **Composants réutilisables**: Maintenance facilitée
- **Tests automatisés**: Qualité assurée

### Sécurité
- **Authentification robuste**: NextAuth.js
- **ORM sécurisé**: Prisma
- **Variables d'environnement**: Secrets protégés
- **HTTPS par défaut**: Vercel

### Scalabilité
- **Serverless**: Scaling automatique
- **CDN global**: Vercel Edge Network
- **Database pooling**: Prisma
- **Caching intelligent**: ISR

---

## 💰 Estimation des Coûts

### Hébergement Actuel (PHP)
- Serveur web: ~20-50€/mois
- Base de données: Inclus
- **Total**: ~20-50€/mois

### Hébergement Cible (Vercel)
- **Hobby** (gratuit): 
  - 100 GB bandwidth
  - Serverless functions
  - PostgreSQL: 256 MB (gratuit)
  
- **Pro** (20$/mois):
  - 1 TB bandwidth
  - Serverless functions illimitées
  - PostgreSQL: 512 MB
  
**Recommandation**: Commencer avec Hobby, passer à Pro si nécessaire

---

## ⚠️ Risques et Mitigation

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Perte de données lors de la migration | Élevé | Faible | Backup complet + tests |
| Downtime pendant la migration | Moyen | Moyen | Migration progressive |
| Bugs dans la nouvelle app | Moyen | Moyen | Tests exhaustifs |
| Courbe d'apprentissage utilisateurs | Faible | Élevé | Formation + documentation |
| Dépassement de budget | Moyen | Moyen | Phases incrémentales |

---

## 📚 Ressources et Documentation

### Documentation Officielle
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Vercel Documentation](https://vercel.com/docs)

### Tutoriels Recommandés
- [Next.js App Router Tutorial](https://nextjs.org/learn)
- [Prisma Getting Started](https://www.prisma.io/docs/getting-started)
- [React Google Maps](https://visgl.github.io/react-google-maps/)

---

## 🎯 Prochaines Étapes

1. **Validation du plan** avec les parties prenantes
2. **Configuration de l'environnement de développement**
3. **Création du repository GitHub**
4. **Démarrage de la Phase 1** (Préparation)

---

## ✅ Critères de Succès

- ✅ Toutes les fonctionnalités actuelles sont reproduites
- ✅ Aucune perte de données
- ✅ Performance améliorée (Lighthouse score > 90)
- ✅ Sécurité renforcée (pas de vulnérabilités critiques)
- ✅ Expérience utilisateur améliorée
- ✅ Code maintenable et testé (>80% couverture)
