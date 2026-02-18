# Migration Plan: Prisma → Drizzle ORM

## Overview

This document outlines the complete migration plan from Prisma ORM to Drizzle ORM for Cloudflare Workers compatibility.

## Why Migrate?

Prisma's Query Engine is a native binary that cannot run on Cloudflare Workers (Edge runtime). Drizzle ORM is edge-compatible and works seamlessly with serverless environments.

---

## Phase 1: Analysis & Preparation

### 1.1 Audit Current Prisma Usage

**Tasks:**
- [ ] List all models in `prisma/schema.prisma`
- [ ] Find all files using Prisma client
- [ ] Document all relations, indexes, and constraints
- [ ] Note any raw queries (`prisma.$queryRaw`, `prisma.$executeRaw`)

**Commands:**
```bash
# Find all Prisma usage
grep -r "prisma\." --include="*.ts" --include="*.tsx" src/

# Find raw queries
grep -r "\$queryRaw\|\$executeRaw" --include="*.ts" --include="*.tsx" src/
```

### 1.2 Inventory Database Features Used

**Checklist:**
- [ ] Enums
- [ ] Relations (one-to-one, one-to-many, many-to-many)
- [ ] Cascading deletes
- [ ] Default values
- [ ] Unique constraints
- [ ] Indexes
- [ ] Composite keys
- [ ] Json fields

---

## Phase 2: Install Drizzle

### 2.1 Install Dependencies

```bash
npm install drizzle-orm
npm install drizzle-kit --save-dev
npm install postgres-js
```

**Alternative drivers:**
- `postgres-js` - Recommended for edge/serverless
- `pg` - Traditional node-postgres (not edge-compatible)
- `@neondatabase/serverless` - For Neon database

---

## Phase 3: Schema Migration

### 3.1 Create Directory Structure

```
src/
├── db/
│   ├── schema/
│   │   ├── index.ts
│   │   ├── users.ts
│   │   ├── projects.ts
│   │   └── ...
│   └── index.ts
```

### 3.2 Type Mapping Reference

| Prisma Type | Drizzle Type |
|-------------|--------------|
| `String` | `text()` or `varchar({ length: n })` |
| `Int` | `integer()` |
| `BigInt` | `bigint()` |
| `Float` | `real()` or `doublePrecision()` |
| `Boolean` | `boolean()` |
| `DateTime` | `timestamp()` or `timestampWithTimeZone()` |
| `Json` | `jsonb()` |
| `Bytes` | Custom handling needed |
| `Decimal` | `numeric()` |
| `Enum` | `text('field', { enum: [...] })` |

### 3.3 Schema Conversion Examples

**Prisma:**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  projects  Project[]
}

enum UserRole {
  ADMIN
  USER
  VISITOR
}
```

**Drizzle:**
```typescript
import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'USER', 'VISITOR']);

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name'),
  password: text('password').notNull(),
  role: userRoleEnum('role').default('USER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));
```

### 3.4 Relations Setup

```typescript
import { relations } from 'drizzle-orm';
import { users, projects } from './index';

export const projectsRelations = relations(projects, ({ one }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
}));
```

---

## Phase 4: Database Client Setup

### 4.1 Create Drizzle Client

**File:** `src/lib/db.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, { 
  max: 1, // Important for serverless/edge
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
```

### 4.2 Edge-Compatible Client (for Cloudflare Workers)

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

// For Cloudflare Workers/Hyperdrive
export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 10,
  });
  
  return drizzle(client, { schema });
}
```

---

## Phase 5: Code Migration

### 5.1 Import Changes

| Before (Prisma) | After (Drizzle) |
|-----------------|-----------------|
| `import prisma from "@/lib/prisma"` | `import { db } from "@/lib/db"` |
| `import { User } from "@prisma/client"` | `import { users, type UserSelect } from "@/db/schema"` |

### 5.2 Query Conversion Reference

#### findMany

```typescript
// Prisma
const users = await prisma.user.findMany({
  where: { role: 'ADMIN' },
  orderBy: { createdAt: 'desc' },
  take: 10,
});

// Drizzle
import { eq, desc } from 'drizzle-orm';

const users = await db
  .select()
  .from(users)
  .where(eq(users.role, 'ADMIN'))
  .orderBy(desc(users.createdAt))
  .limit(10);
```

#### findFirst / findUnique

```typescript
// Prisma
const user = await prisma.user.findFirst({
  where: { email: 'test@example.com' },
});

// Drizzle
import { eq } from 'drizzle-orm';

const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, 'test@example.com'))
  .limit(1);
```

#### create

```typescript
// Prisma
const user = await prisma.user.create({
  data: { email, name, password },
});

// Drizzle
const [user] = await db
  .insert(users)
  .values({ email, name, password })
  .returning();
```

#### update

```typescript
// Prisma
const user = await prisma.user.update({
  where: { id },
  data: { name: 'New Name' },
});

// Drizzle
import { eq } from 'drizzle-orm';

const [user] = await db
  .update(users)
  .set({ name: 'New Name' })
  .where(eq(users.id, id))
  .returning();
```

#### delete

```typescript
// Prisma
await prisma.user.delete({
  where: { id },
});

// Drizzle
import { eq } from 'drizzle-orm';

await db.delete(users).where(eq(users.id, id));
```

#### count

```typescript
// Prisma
const count = await prisma.user.count({
  where: { role: 'USER' },
});

// Drizzle
import { eq, sql } from 'drizzle-orm';

const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(users)
  .where(eq(users.role, 'USER'));
```

#### include / select (relations)

```typescript
// Prisma
const projects = await prisma.project.findMany({
  include: { owner: true },
});

// Drizzle
const projects = await db
  .select({
    id: projects.id,
    name: projects.name,
    ownerId: projects.ownerId,
    owner: {
      id: users.id,
      name: users.name,
      email: users.email,
    },
  })
  .from(projects)
  .leftJoin(users, eq(projects.ownerId, users.id));

// Or with relations API
const projects = await db.query.projects.findMany({
  with: {
    owner: true,
  },
});
```

### 5.3 Transaction Conversion

```typescript
// Prisma
await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.log.create({ data: logData }),
]);

// Drizzle
await db.transaction(async (tx) => {
  await tx.insert(users).values(userData);
  await tx.insert(logs).values(logData);
});
```

### 5.4 Raw Query Conversion

```typescript
// Prisma
const result = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;

// Drizzle
import { sql } from 'drizzle-orm';

const result = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
```

---

## Phase 6: Authentication Update

### 6.1 Install Auth.js Drizzle Adapter

```bash
npm install @auth/drizzle-adapter
```

### 6.2 Update Auth Configuration

```typescript
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import * as schema from '@/db/schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    // ... other tables
  }),
  // ... rest of config
});
```

### 6.3 Credentials Provider Update

```typescript
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';

CredentialsProvider({
  async authorize(credentials) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, credentials.email))
      .limit(1);
    
    // ... password verification
  },
});
```

---

## Phase 7: Migration & Testing

### 7.1 Create Drizzle Config

**File:** `drizzle.config.ts`

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### 7.2 Generate Migrations

```bash
# Generate migration files
npx drizzle-kit generate

# Push schema changes directly (development)
npx drizzle-kit push

# Introspect existing database
npx drizzle-kit introspect
```

### 7.3 Testing Checklist

- [ ] All models migrated correctly
- [ ] Relations work as expected
- [ ] CRUD operations function
- [ ] Authentication flow works
- [ ] API routes return correct data
- [ ] No type errors
- [ ] Performance acceptable

---

## Phase 8: Deployment

### 8.1 Cloudflare Workers Configuration

**wrangler.toml:**
```toml
[vars]
DATABASE_URL = ""

# Use Hyperdrive for connection pooling
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "your-hyperdrive-id"
```

### 8.2 Environment Variables

Set in Cloudflare dashboard:
- `DATABASE_URL`
- `AUTH_SECRET`
- Any other secrets

### 8.3 Deployment Steps

1. Test migration on staging database
2. Run migrations on production database
3. Deploy to Cloudflare Workers
4. Monitor logs for errors
5. Verify authentication works

---

## Phase 9: Cleanup

### 9.1 Remove Prisma

```bash
npm uninstall prisma @prisma/client
rm -rf prisma/
rm src/lib/prisma.ts
```

### 9.2 Update Documentation

- [ ] Update README.md
- [ ] Update AGENTS.md
- [ ] Remove Prisma references from docs

---

## Estimated Effort

| Task | Time |
|------|------|
| Schema conversion | 2-4 hours |
| Query migration | 4-8 hours |
| Auth integration | 2-3 hours |
| Testing | 2-4 hours |
| Deployment | 1-2 hours |
| **Total** | **11-21 hours** |

---

## Key Files to Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Delete after migration |
| `src/db/schema/*.ts` | Create new |
| `src/lib/prisma.ts` | Replace with `src/lib/db.ts` |
| `src/lib/auth.ts` | Update adapter and queries |
| `src/app/api/**/*.ts` | Convert all Prisma queries |
| Server components | Convert Prisma imports/queries |

---

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle PostgreSQL Guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [Auth.js Drizzle Adapter](https://authjs.dev/getting-started/adapters/drizzle)
- [Cloudflare Hyperdrive with Drizzle](https://developers.cloudflare.com/hyperdrive/examples/drizzle/)
- [Prisma to Drizzle Migration Guide](https://orm.drizzle.team/docs/migrations/prisma)

---

## Notes

- Keep Prisma installed until migration is complete
- Run both ORMs in parallel during migration for safety
- Create database backup before migration
- Consider using Drizzle Studio: `npx drizzle-kit studio`