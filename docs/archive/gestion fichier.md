# Plan de développement - Gestionnaire de Fichiers Cloudflare R2

## 📋 Vue d'ensemble

Système CRUD complet de gestion de fichiers avec stockage Cloudflare R2, synchronisation automatique avec la base de données, et interface utilisateur intuitive.

---

## 🎯 Spécifications

| Aspect | Configuration |
|--------|--------------|
| **Stockage** | Cloudflare R2 (S3 compatible) |
| **Structure** | Plate - un dossier par projet (`projetA/`, `projetB/`) |
| **Types de fichiers** | Tous types acceptés |
| **Taille max** | 150 Ko par fichier |
| **Upload** | Multiple + Drag & Drop + Sélection classique |
| **Progression** | Barre de progression individuelle par fichier |
| **Sync BDD** | Automatique immédiate après upload |
| **Prévisualisation** | Miniatures (images) + Visionneuse PDF + Lecteur vidéo |
| **Nomenclature** | UUID4 (ex: `550e8400-e29b-41d4-a716-446655440000`) |
| **PDF Viewer** | react-pdf |
| **Historique** | Soft delete avec possibilité de restauration |

---

## 🗄️ Schéma de données

### Modèle Prisma - File

```prisma
enum FileType {
  IMAGE
  DOCUMENT
  VIDEO
  AUDIO
  ARCHIVE
  OTHER
}

model File {
  id          String    @id @default(cuid())
  name        String    // Nom affiché
  blobUrl     String    @unique // URL Cloudflare
  blobPath    String    // Chemin: projetId/uuid.ext
  fileType    FileType
  mimeType    String
  size        Int       // Taille en bytes
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Métadonnées pour miniatures
  thumbnailUrl String?  // URL miniature (images/vidéos)
  width       Int?      // Largeur (images/vidéos)
  height      Int?      // Hauteur (images/vidéos)
  duration    Int?      // Durée en secondes (vidéos/audio)

  // Historique - Soft delete
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  deletedBy   String?   // User ID qui a supprimé

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([projectId])
  @@index([isDeleted])
  @@index([fileType])
  @@map("files")
}
```

---

## 🚀 Phases de développement

### Phase 0 : Migration des fichiers existants [TERMINEE ✅]

**Objectif** : Migrer les fichiers actuels (`public/images/`) vers Cloudflare R2

**Processus détaillé** :

1. **Backup** (15 min) - [FAIT ✅]
   - Créer copie de sauvegarde : `public/images-backup/`
   - Exporter données tables Image/Document actuelles

2. **Script de migration** (2h) - [FAIT ✅]
   ```typescript
   // scripts/migrate-to-blob.ts
   - Scanner répertoire public/images/
   - Pour chaque fichier :
     * Lire fichier
     * Générer UUID
     * Upload vers Vercel Blob
     * Mapper : ancien chemin → nouvelle URL
   ```

3. **Mise à jour base de données** (1h) - [FAIT ✅]
   - Créer table `File` si nécessaire
   - Migrer entrées Image/Document existantes
   - Mettre à jour URLs dans les tables liées (1146 fichiers migrés)

4. **Vérification** (1h) - [FAIT ✅]
   - Comparer nombre fichiers source vs destination
   - Tester accès URLs Blob

5. **Test application** (2h) - [EN COURS ⏳]
   - Lancer application locale
   - Vérifier affichage images existantes (via les anciens chemins locaux)
   - S'assurer de la stabilité globale avant bascule

**Validation** : ✅ Données migrées, Application fonctionnelle en mode Cloudflare.

---

### Phase 1 : Setup & Configuration [TERMINEE ✅]

**Tâches** :
- [x] Installation dépendances (`@vercel/blob`, `react-pdf`, `sharp`)
- [x] Configuration variables environnement (`BLOB_READ_WRITE_TOKEN`)
- [x] Création types TypeScript ([lib/types/files.ts](file:///c:/wamp64/www/sitematiere-nexjs/lib/types/files.ts))
- [x] Test de connexion Blob (via script de test dédié)
- [x] Vérification finale de non-régression (Affichage Dashboard ✅)
- [x] Correction Hotfix : URLs Absolues (Double slash bug) ✅

**Livrables** :
- Configuration opérationnelle
- Types TypeScript définis
- Environnement cloud validé

---

### Phase 2 : Backend API & Bascule Lecture [TERMINEE ✅]

**Tâches prioritaires** :
- [x] **Bascule de la Galerie** : Lecture depuis la table `File` (Cloudflare R2) au lieu de `public/images`.
- [x] **API d'Upload** : Créer `/api/files/upload` pour gérer les nouveaux fichiers vers Blob.
- [x] **API de Listage** : Créer `/api/files/list` avec pagination.
- [x] **API de Suppression** : Créer `/api/files/delete` (Soft delete implemented).
- [x] **API de Restauration** : Créer `/api/files/restore`.
- [x] **API de Renommage** : Créer `/api/files/rename`.
- [x] **Utilitaires** : `blob-client.ts` (Upload/Delete/List/Thumbnail) et `validation.ts` (Size/Type/Name) créés.

#### 2.1 Routes API à implémenter

**POST /api/files/migrate** [EN ATTENTE]
- Migration batch fichiers existants
- Body: `{ projectId: string, files: File[] }`

**POST /api/files/upload** [FAIT ✅]
- Upload multiple avec streaming
- Validation : taille ≤ 150Ko, auth ADMIN
- Génération miniatures (images/vidéos)
- Sync auto BDD après upload
- Response: `{ success: boolean, files: UploadedFile[], errors: Error[] }`

**GET /api/files/list** [FAIT ✅]
- Lister fichiers d'un projet
- Query params: `projectId`, `fileType`, `includeDeleted`, `page`, `limit`
- Pagination: 50 fichiers par page
- Response: `{ files: File[], total: number, hasMore: boolean }`

**DELETE /api/files/delete** [FAIT ✅]
- Soft delete (mark as deleted)
- Body: `{ fileIds: string[], permanent?: boolean }`
- Auth: ADMIN uniquement

**POST /api/files/restore** [FAIT ✅]
- Restaurer fichiers supprimés
- Body: `{ fileIds: string[] }`

**PUT /api/files/rename** [FAIT ✅]
- Renommage fichier
- Body: `{ fileId: string, newName: string }`

**GET /api/files/history**
- Historique modifications projet
- Query: `projectId`, `action` (CREATE, DELETE, RENAME)

#### 2.2 Fonctions utilitaires

```typescript
// lib/files/blob-client.ts [FAIT ✅]
- uploadFile(buffer: Buffer, path: string): Promise<string>
- deleteFile(url: string): Promise<void>
- listFiles(prefix: string): Promise<BlobItem[]>
- generateThumbnail(file: Buffer, type: FileType): Promise<Buffer>

// lib/files/validation.ts [FAIT ✅]
- validateFileSize(size: number): boolean  // ≤ 150Ko
- validateFileType(mimeType: string): boolean
- sanitizeFileName(name: string): string
```

#### 2.3 Génération miniatures

**Images** (sharp):
```typescript
const thumbnail = await sharp(buffer)
  .resize(200, 200, { fit: 'cover' })
  .jpeg({ quality: 80 })
  .toBuffer();
```

**Vidéos** (ffmpeg) [FAIT ✅] :
```typescript
ffmpeg(inputPath)
  .screenshots({
    timestamps: ['1'],
    filename: 'thumb.jpg',
    size: '200x200'
  });
```

**Livrables** :
- 7 routes API fonctionnelles
- Validation côté serveur
- Génération miniatures opérationnelle

---

### Phase 3 : Interface Upload [TERMINEE ✅]

#### Composants créés

**FileUploadZone** (`components/files/file-upload-zone.tsx`) [FAIT ✅]
- Zone drag & drop cliquable
- Highlight on hover
- Validation immédiate visuelle (taille > 150Ko = rouge)
- Sélection multiple via file picker

**FileUploadProgress** (`components/files/file-upload-progress.tsx`) [FAIT ✅]
- Liste verticale fichiers en cours
- Barre progression individuelle
- Icône statut (⏳ en cours, ✅ succès, ❌ erreur)
- Bouton annuler par fichier
- Résumé global : "3 sur 5 fichiers uploadés"

**FileUploadItem** (`components/files/file-upload-item.tsx`) [FAIT ✅]
- Preview miniature si image
- Nom fichier + taille
- Barre progression
- Bouton ❌ annuler

#### Fonctionnalités

- [x] Upload multiple simultané
- [x] Validation taille avant upload (> 150Ko = rejeté)
- [x] Preview fichiers sélectionnés
- [x] Drag & drop zone avec animation
- [x] Gestion erreurs (retry, skip, cancel all)
- [x] Sync BDD immédiate après succès

#### Interface visuelle

```
┌────────────────────────────────────────────┐
│  📎 Déposez vos fichiers ici               │
│     ou cliquez pour parcourir              │
│                                            │
│     Maximum 1500 Ko par fichier             │
└────────────────────────────────────────────┘

┌─ Upload en cours ──────────────────────────┐
│ 📷 photo1.jpg (120 Ko)        [████░░] 60% │
│ 📄 document.pdf (145 Ko)      [█████░] 80% │
│ 🎥 video.mp4 (150 Ko)         [░░░░░░] 0%  │
└────────────────────────────────────────────┘

[X] Annuler tout     2/3 terminés
```

**Livrables** :
- Zone upload drag & drop fonctionnelle
- Barres progression temps réel
- Validation 150Ko en temps réel

---

### Phase 4 : Explorateur UI [TERMINEE ✅]

#### Layout principal

```
┌────────────────────────────────────────────────────────────┐
│ 📁 Gestion des Fichiers - Projet: [Sewa ▼]        [X]      │
├──────────────┬─────────────────────────────────────────────┤
│  🔍 Rechercher│  ◻️ Tout     [Grid ▼] [+ Nouveau fichier]  │
│              │                                               │
├──────────────┼─────────────────────────────────────────────┤
│ 📊 STATISTIQUES│                                             │
│              │  ┌─────────────┐ ┌─────────────┐            │
│  6.2 MB      │  │ ☑️         │ │ ◻️         │            │
│  utilisés    │  │ ┌───────┐  │  │ ┌───────┐  │            │
│              │  │ │ 🖼️   │  │  │ │ 📄   │  │            │
│  42 fichiers │  │ └───────┘  │  │ └───────┘  │            │
│              │  │ photo.jpg  │  │ plan.pdf   │            │
│ 💡 Dropzone  │  │ 120 Ko    │  │ 145 Ko    │            │
│              │  │ ✓ Uploadé │  │ ✓ Uploadé │            │
│              │  └─────────────┘ └─────────────┘            │
│              │                                               │
└──────────────┴─────────────────────────────────────────────┘
```

#### Composants

**FileExplorer** (`components/files/file-explorer.tsx`)
- Container principal avec state management
- Gestion sélection multiple (Ctrl/Cmd + clic)
- Toggle vue Grid/List

**FileGrid** (`components/files/file-grid.tsx`)
- Vue grille responsive
- Miniatures 200x200
- Checkbox sélection
- Menu contextuel clic droit

**FileList** (`components/files/file-list.tsx`)
- Vue liste tabulaire
- Colonnes: Nom, Type, Taille, Date, Actions
- Tri par colonne

**FileToolbar** (`components/files/file-toolbar.tsx`)
- Bouton "Nouveau" (upload)
- Bouton "Supprimer" (disabled si rien sélectionné)
- Toggle Grid/List
- Compteur "X fichiers sélectionnés"

**FileSearch** (`components/files/file-search.tsx`)
- Recherche temps réel
- Filtre par type (dropdown)

**FileStats** (`components/files/file-stats.tsx`)
- Espace utilisé (barre progression)
- Nombre fichiers par type
- Graphique camembert (optionnel)

#### Fonctionnalités

- [x] Navigation projet via dropdown (Global view implémentée)
- [x] Sélection multiple avec Shift+clic (ou via checkbox)
- [ ] Double-clic = prévisualisation
- [x] Clic droit = menu contextuel (Rename, Delete)
- [ ] Drag & drop pour déplacer fichiers
- [x] Filtrage temps réel (Client-side)

**Livrables** :
- Explorateur de fichiers complet
- Navigation fluide
- Sélection multiple

---

### Phase 5 : Prévisualisation [TERMINEE ✅]

#### Composants

**FilePreviewModal** (`components/files/file-preview-modal.tsx`)
- Modal plein écran
- Navigation ← → entre fichiers
- Titre fichier + taille
- Bouton télécharger

**ImageViewer** (`components/files/image-viewer.tsx`)
- Affichage optimisé
- Zoom in/out
- Pan (déplacement)
- Plein écran
- Rotation

**PDFViewer** (`components/files/pdf-viewer.tsx`)
- react-pdf intégration
- Pagination
- Zoom
- Navigation clavier

**VideoPlayer** (`components/files/video-player.tsx`)
- Lecteur HTML5 natif
- Contrôles standards
- Plein écran

#### Interface

```
┌──────────────────────────────────────────────────────┐
│  photo1.jpg - 120 Ko                    [⬇️] [❌]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│     ┌──────────────────────────────────────┐        │
│     │                                      │        │
│     │      [Image/Vidéo/PDF ici]           │        │
│     │                                      │        │
│     └──────────────────────────────────────┘        │
│                                                      │
│           [←]  1 sur 5  [→]                          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- [x] Visionneuse images fonctionnelle
- [x] Lecteur PDF intégré
- [x] Lecteur vidéo

---

### Phase 6 : Context Menu & Actions [EN COURS ⏳]

#### Menu contextuel (clic droit)

```
┌───────────────────────┐
│ 👁️ Prévisualiser      │
├───────────────────────┤
│ ✏️ Renommer           │
│ 📂 Déplacer vers...   │
│ 📥 Télécharger        │
├───────────────────────┤
│ 🗑️ Supprimer          │
└───────────────────────┘
```

#### Actions

**Renommer** :
- Édition inline ou modal
- Validation nom unique dans projet
- Mise à jour BDD + Blob (copy + delete)

**Déplacer** :
- Modal sélecteur projet
- Déplacement batch (fichiers sélectionnés)
- Mise à jour projectId en BDD
- Déplacement Blob (copy + delete)

**Supprimer** :
- Soft delete par défaut
- Confirmation modal
- Mark isDeleted=true
- Garder en Blob pendant 30 jours

**Restaurer** (depuis corbeille) :
- Vue "Corbeille" dans explorateur
- Bouton "Restaurer"
- Remet isDeleted=false

#### Composants

**FileContextMenu** (`components/files/file-context-menu.tsx`)
- Menu positionné au clic droit
- Items dynamiques (pas "Restaurer" si pas supprimé)

**FileRenameDialog** (`components/files/file-rename-dialog.tsx`)
- Input avec nom actuel
- Validation en temps réel

**FileMoveDialog** (`components/files/file-move-dialog.tsx`)
- Liste projets disponibles
- Recherche projet
- Confirmation déplacement

**FileDeleteDialog** (`components/files/file-delete-dialog.tsx`)
- Liste fichiers concernés
- Checkbox "Supprimer définitivement"
- Avertissement si suppression définitive

**Livrables** :
- Menu contextuel complet
- Fonctionnalités CRUD opérationnelles
- Gestion corbeille

---

### Phase 7 : Miniatures (1 jour)

#### Implémentation

**Processus upload** :
```
1. Upload fichier original → Blob
2. Si image/vidéo :
   a. Générer miniature (200x200)
   b. Upload miniature → Blob (thumbs/)
3. Stocker URLs dans BDD
```

**Affichage** :
- FileGrid : utilise thumbnailUrl si dispo, sinon icône type
- FileList : petite icône + nom

**Génération différée** (optionnel) :
- Si upload lourd, génération async via queue
- Affiche placeholder pendant génération

**Livrables** :
- Miniatures générées automatiquement
- Affichage optimisé grille

---

### Phase 8 : Tests & Validation (1 jour)

#### Tests fonctionnels

**Upload** :
- [ ] Upload 1 fichier < 150Ko ✅
- [ ] Upload 1 fichier > 150Ko ❌ (rejeté)
- [ ] Upload 20 fichiers simultanés
- [ ] Annulation upload en cours
- [ ] Retry après échec réseau

**Affichage** :
- [ ] Navigation projets
- [ ] Changement vue Grid/List
- [ ] Recherche fichier
- [ ] Filtre par type

**Actions** :
- [ ] Renommer fichier
- [ ] Déplacer vers autre projet
- [ ] Supprimer (soft)
- [ ] Restaurer depuis corbeille
- [ ] Suppression définitive

**Prévisualisation** :
- [ ] Image (zoom, navigation)
- [ ] PDF (pagination)
- [ ] Vidéo (lecture)

**Performance** :
- [ ] Liste 100 fichiers (temps chargement < 2s)
- [ ] Upload parallèle efficace

#### Tests intégration

- [ ] Upload → BDD créée automatiquement
- [ ] Delete soft → fichier masqué mais présent
- [ ] Delete permanent → fichier Blob supprimé
- [ ] Restauration → fichier réapparaît

#### Correction bugs

- Régression éventuelles
- Optimisations performances
- Améliorations UX

**Livrables** :
- Application testée et stable
- Documentation utilisation

---

## 📁 Structure fichiers

```
app/
├── api/
│   └── files/
│       ├── migrate/route.ts
│       ├── upload/route.ts
│       ├── list/route.ts
│       ├── delete/route.ts
│       ├── restore/route.ts
│       ├── rename/route.ts
│       └── history/route.ts
components/
└── files/
    ├── file-explorer.tsx
    ├── file-upload-zone.tsx
    ├── file-upload-progress.tsx
    ├── file-upload-item.tsx
    ├── file-grid.tsx
    ├── file-list.tsx
    ├── file-toolbar.tsx
    ├── file-search.tsx
    ├── file-stats.tsx
    ├── file-context-menu.tsx
    ├── file-rename-dialog.tsx
    ├── file-move-dialog.tsx
    ├── file-delete-dialog.tsx
    ├── file-preview-modal.tsx
    ├── image-viewer.tsx
    ├── pdf-viewer.tsx
    └── video-player.tsx
lib/
├── files/
│   ├── blob-client.ts
│   ├── validation.ts
│   └── thumbnails.ts
└── types/
    └── files.ts
```

---

## 📊 Roadmap détaillée

| Phase | Durée | Dépendances | Livrable clé |
|-------|-------|-------------|--------------|
| **0. Migration** | 1j | - | Fichiers sur Vercel Blob, app fonctionnelle |
| **1. Setup** | 0.5j | Phase 0 OK | Config opérationnelle |
| **2. Backend** | 2j | Phase 1 | 7 routes API fonctionnelles |
| **3. Upload UI** | 2j | Phase 2 | Upload drag & drop + progress |
| **4. Explorateur** | 2j | Phase 3 | Interface navigation fichiers |
| **5. Preview** | 1.5j | Phase 4 | Visionneuses images/PDF/vidéos |
| **6. Context Menu** | 1.5j | Phase 4 | Actions CRUD complètes |
| **7. Thumbnails** | 1j | Phase 3 | Miniatures auto-générées |
| **8. Tests** | 1j | Toutes | Application stable |

**Total : 12.5 jours**

---

## ⚙️ Configuration requise

### Variables d'environnement

```bash
# .env
BLOB_READ_WRITE_TOKEN=r2_token_xxx
NEXT_PUBLIC_BLOB_BASE_URL=https://<account_id>.r2.cloudflarestorage.com
NEXT_PUBLIC_MAX_FILE_SIZE=1572864  # 1.5 Mo en bytes
```

### Dépendances

```json
{
  "dependencies": {
    "@vercel/blob": "^0.22.0",
    "react-pdf": "^7.7.0",
    "sharp": "^0.33.0",
    "fluent-ffmpeg": "^2.1.2"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.24"
  }
}
```

---

## 🎨 Design System

### Couleurs

- **Primaire** : Indigo-600 (#4f46e5)
- **Succès** : Green-500 (#22c55e)
- **Danger** : Red-500 (#ef4444)
- **Warning** : Amber-500 (#f59e0b)

### Icônes (Lucide)

- Fichier : `File`
- Image : `ImageIcon`
- PDF : `FileText`
- Vidéo : `Video`
- Dossier : `Folder`
- Upload : `Upload`
- Supprimer : `Trash2`
- Restaurer : `RotateCcw`

### Tailles

- Miniature grille : 200x200px
- Miniature liste : 40x40px
- Modal preview : 90vw x 90vh max

---

## 🔒 Sécurité

### Validations

- Authentification : Token JWT requis (ADMIN uniquement)
- Taille fichier : ≤ 1500Ko côté client + serveur
- Type MIME : Vérification magic bytes (pas juste extension)
- Nom fichier : Sanitization (pas de `../`, caractères spéciaux)
- Anti-virus : Scan optionnel si fichiers uploadés par utilisateurs externes

### Protection

- CORS configuré (domaines autorisés uniquement)
- Rate limiting : Max 100 uploads/minute par IP
- Quota : Limite par projet (à définir)

---

## 📈 Évolutions futures

- [ ] Compression automatique images
- [ ] Versioning fichiers (garder historique versions)
- [ ] Partage liens publics (expirables)
- [ ] Import depuis URL externe
- [ ] Recherche full-text dans PDFs
- [ ] Tags/Labels sur fichiers
- [ ] Workflow validation (approbation avant publication)

---

**Document version 1.0 - Prêt pour développement**

*Phase 0 (Migration) à lancer en priorité. Vérifier fonctionnement application avant Phase 1.*
