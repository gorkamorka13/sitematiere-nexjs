# Plan d'implémentation : Affectation de projets aux utilisateurs

## Objectif

Permettre l'affectation de chaque projet à un utilisateur, avec contrôle des droits de modification et visibilité.

## Règles métier

- Le projet est affecté à un utilisateur lors de sa création
- Si l'utilisateur n'existe pas, l'admin peut le créer à la volée
- L'admin peut s'affecter un projet ou le confier à un autre utilisateur
- Seul le propriétaire du projet (ou un admin) peut le modifier
- L'admin peut réaffecter un projet à un autre utilisateur
- Après réaffectation, l'ancien propriétaire perd l'accès en modification
- L'admin peut rendre un projet visible pour tous les USER (lecture seule)

---

## 1. Modifications de la base de données

### Fichier : `lib/db/schema/projects.ts`

Ajouter un champ `visible` :

```typescript
visible: boolean('visible').default(false).notNull(),
```

> Note : Le champ `ownerId` existe déjà dans le schéma actuel.

### Migration

```bash
npm run db:generate
npm run db:push
```

---

## 2. Mise à jour des validations

### Fichier : `lib/validations.ts`

#### ProjectCreateSchema - Ajouts :

```typescript
assignToUserId: z.string().optional(),
createUserIfNotExists: z.boolean().optional(),
newUserUsername: z.string().optional(),
newUserName: z.string().optional(),
newUserPassword: z.string().min(6).optional(),
newUserRole: z.enum(["ADMIN", "USER", "VISITOR"]).optional(),
visible: z.boolean().optional(),
```

#### ProjectUpdateSchema - Ajouts :

```typescript
ownerId: z.string().optional(),
visible: z.boolean().optional(),
```

---

## 3. Actions serveur

### Fichier : `app/actions/project-actions.ts`

#### 3.1 `createProject()` - Modifications

**Logique d'affectation :**

1. Récupérer `assignToUserId` du formulaire
2. Si `assignToUserId` fourni :
   - Vérifier si l'utilisateur existe via `db.select().from(users).where(eq(users.id, assignToUserId))`
   - Si existe → utiliser cet ID comme `ownerId`
   - Si n'existe pas ET `createUserIfNotExists === true` :
     - Créer l'utilisateur avec `newUserUsername`, `newUserName`, `newUserPassword`, `newUserRole`
     - Utiliser le nouvel ID comme `ownerId`
   - Si n'existe pas ET `createUserIfNotExists !== true` :
     - Retourner erreur : "L'utilisateur spécifié n'existe pas"
3. Si `assignToUserId` non fourni :
   - Utiliser `session.user.id` comme `ownerId` (l'admin créateur)

**Insertion :**

```typescript
await tx.insert(projects).values({
  // ... champs existants
  ownerId: determinedOwnerId,
  visible: validatedData.visible ?? false,
})
```

#### 3.2 `updateProject()` - Modifications

**Logique de contrôle d'accès :**

```typescript
const session = await auth();
const [project] = await db.select().from(projects).where(eq(projects.id, validatedData.id));

const isAdmin = session.user.role === "ADMIN";
const isOwner = project.ownerId === session.user.id;

if (!isAdmin && !isOwner) {
  return { success: false, error: "Vous n'êtes pas autorisé à modifier ce projet." };
}
```

**Logique de réaffectation (ADMIN uniquement) :**

```typescript
if (validatedData.ownerId && isAdmin) {
  const [newOwner] = await db.select().from(users).where(eq(users.id, validatedData.ownerId));
  if (!newOwner) {
    return { success: false, error: "L'utilisateur cible n'existe pas." };
  }
  // L'update inclut ownerId et visible
}
```

---

## 4. Filtrage des projets visibles

### Fichier : `app/api/projects/route.ts` → `GET()`

```typescript
const isAdmin = checkRole(session, ["ADMIN"] as UserRole[]);
const userId = session.user.id;

let query;
if (isAdmin) {
  query = db.select({...}).from(projects).orderBy(asc(projects.name));
} else {
  query = db.select({...})
    .from(projects)
    .where(or(
      eq(projects.ownerId, userId),
      eq(projects.visible, true)
    ))
    .orderBy(asc(projects.name));
}
```

---

## 5. API de recherche d'utilisateurs

### Nouveau fichier : `app/api/users/search/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get("q") || "";
  
  const users = await db
    .select({ id: users.id, username: users.username, name: users.name, role: users.role })
    .from(users)
    .where(ilike(users.username, `%${query}%`))
    .limit(10);

  return NextResponse.json(users);
}
```

---

## 6. Composants UI

### 6.1 Formulaire de création projet

**Fichier :** Composant existant de création

**Ajouts :**
- Champ autocomplete pour rechercher/sélectionner un utilisateur
- Checkbox "Créer l'utilisateur si inexistant"
- Champs conditionnels pour nouveau utilisateur (username, name, password, role)
- Toggle "Rendre visible pour tous les utilisateurs"

### 6.2 Formulaire de modification projet (vue ADMIN)

**Fichier :** Composant existant de modification

**Ajouts :**
- Affichage du propriétaire actuel
- Champ autocomplete pour réaffecter à un autre utilisateur
- Toggle "Visible pour tous les USER"
- Warning si réaffectation : "L'utilisateur actuel perdra l'accès en modification"

### 6.3 Liste des projets

**Fichier :** Page liste existante

**Modifications :**
- Appliquer le filtrage côté serveur
- Afficher un badge "Mon projet" pour les projets possédés

### 6.4 Détail/Carte projet

**Ajouts :**
- Afficher le nom du propriétaire
- Badge indicateur "Affecté à : [username]"

---

## 7. Ordre d'implémentation

| Étape | Tâche | Fichiers concernés |
|-------|-------|-------------------|
| 1 | Schema DB + migration | `lib/db/schema/projects.ts` |
| 2 | Validations | `lib/validations.ts` |
| 3 | API recherche users | `app/api/users/search/route.ts` (nouveau) |
| 4 | Action createProject | `app/actions/project-actions.ts` |
| 5 | Action updateProject | `app/actions/project-actions.ts` |
| 6 | API filtrage projets | `app/api/projects/route.ts` |
| 7 | UI création projet | Composant formulaire création |
| 8 | UI modification projet | Composant formulaire modification |
| 9 | UI liste et badges | Page liste projets |
| 10 | Tests fonctionnels | - |

---

## 8. Points d'attention

- **Sécurité** : Toujours vérifier `ownerId` côté serveur avant modification
- **UX** : Prévoir un message de confirmation lors de la réaffectation
- **Performance** : L'autocomplete utilisateur doit avoir un debounce
- **Logs** : Logger les réaffectations pour audit

---

*Dernière mise à jour : 2026-02-19*
