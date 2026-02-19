# AGENTS.md

This file contains coding guidelines and conventions for agentic coding agents working on this Next.js bridge construction management system.

## Project Overview

- **Framework**: Next.js 15.5.12 with App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js v5 (beta) with credentials provider
- **Styling**: Tailwind CSS v4 with custom CSS variables
- **Language**: TypeScript (strict mode)
- **Maps**: React-Leaflet for geolocation features (localized in French)

## Development Commands

```bash
# Development
npm run dev              # Start development server on localhost:3000
npm run build           # Build production version
npm run start           # Start production server
npm run lint            # Run ESLint

# Database (Drizzle)
npm run db:generate     # Generate Drizzle migrations
npm run db:push         # Push schema changes to database (preferred for dev)
npm run db:studio       # Open database browser
```

## Asset & URL Handling Protocols

> [!IMPORTANT]
> **NEVER store absolute URLs with domains in the database.**
> - Use relative paths (e.g., `/api/files/serve/path/to/file.jpg`) for internally served assets.
> - This ensures portability when switching between `.pages.dev`, `.workers.dev`, and custom domains.
> - If an asset is provided as an absolute URL by an external provider, normalize it before storage.

> [!TIP]
> **Thumbnail Synchronization**: Always ensure that when an image is referenced (e.g., in a slideshow), its `thumbnailUrl` is also preserved/synchronized to maintain UI performance.

## Code Style Guidelines

### File Naming Conventions
- **Components**: kebab-case files (`user-badge.tsx`, `project-map-wrapper.tsx`)
- **Component exports**: PascalCase (`UserBadge`, `ProjectMapWrapper`)
- **API routes**: `route.ts` in appropriate `app/api/` subdirectories
- **Pages**: `page.tsx` in App Router directories
- **Libraries**: camelCase files (`validations.ts`, `coordinate-utils.ts`)

### Import Conventions

```typescript
// React/Next.js/Drizzle imports first
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, files } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Third-party libraries
import Link from "next/link";
import { z } from "zod";

// Local components
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Search, Ruler } from "lucide-react";
```

**Key Import Rules:**
- Use absolute imports with `@/` alias
- Group imports: React/Next.js → Drizzle → third-party → local components
- Import schema models from `@/lib/db/schema`
- Use Lucide React for icons consistently

### TypeScript Patterns

**Strict Configuration:**
- Use `@/` path alias for imports
- Infer types from Drizzle schemas using `$inferSelect` and `$inferInsert`
- Use Zod for runtime validation

```typescript
// Drizzle types
import { projects } from "@/lib/db/schema";
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

### Error Handling Patterns

**API Routes/Server Actions:**
```typescript
try {
  const result = await db.select().from(projects).where(eq(projects.id, id));
  return { success: true, data: result[0] };
} catch (error) {
  logger.error("Operation failed", error);
  return { success: false, error: "Erreur serveur" };
}
```

### Windows Terminal Commands

**IMPORTANT**: Command chaining operators (`&&`, `||`) are NOT supported on Windows. Execute each command separately.

---
*Dernière mise à jour : 2026-02-19*
