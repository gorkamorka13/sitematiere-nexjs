# AGENTS.md

This file contains coding guidelines and conventions for agentic coding agents working on this Next.js bridge construction management system..

## Project Overview

- **Framework**: Next.js 16.1.6 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (beta) with credentials provider
- **Styling**: Tailwind CSS v4 with custom CSS variables
- **Language**: TypeScript (strict mode)
- **Maps**: React-Leaflet for geolocation features
- **Purpose**: Bridge construction project management system (French localization)

## Development Commands

```bash
# Development
npm run dev              # Start development server on localhost:3000
npm run build           # Build production version
npm run start           # Start production server
npm run lint            # Run ESLint (no specific single test command exists)

# Database
npm run postinstall     # Generate Prisma client (runs automatically after install)
npx prisma db push      # Push schema changes to database
npx prisma studio       # Open database browser
npx prisma migrate dev  # Create and apply migrations
```

## Code Style Guidelines

### File Naming Conventions
- **Components**: kebab-case files (`user-badge.tsx`, `project-map-wrapper.tsx`)
- **Component exports**: PascalCase (`UserBadge`, `ProjectMapWrapper`)
- **API routes**: `route.ts` in appropriate `app/api/` subdirectories
- **Pages**: `page.tsx` in App Router directories
- **Libraries**: camelCase files (`validations.ts`, `coordinate-utils.ts`)

### Import Conventions

```typescript
// React/Next.js imports first
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Third-party libraries
import prisma from "@/lib/prisma";
import Link from "next/link";
import { z } from "zod";
import { User, Project, UserRole } from "@prisma/client";

// Local components
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Search, Ruler, Factory } from "lucide-react";
```

**Key Import Rules:**
- Use absolute imports with `@/` alias (maps to `./`)
- Group imports: React/Next.js → third-party → local components
- Import types from Prisma client for database models
- Use Lucide React for icons consistently

### Component Structure

```typescript
"use client"; // Add at top for client components

import * as React from "react";
import { ComponentProps } from "library";

interface ComponentNameProps {
  required: string;
  optional?: string;
  variant?: "default" | "icon" | "sidebar";
}

export function ComponentName({
  required,
  optional,
  variant = "default"
}: ComponentNameProps) {
  return (
    <div className="tailwind-classes">
      {/* Component content */}
    </div>
  );
}
```

### TypeScript Patterns

**Strict Configuration:**
- All TypeScript features enabled
- Use `@/` path alias for imports
- Infer types from Prisma schemas
- Use Zod for runtime validation with inferred types

**Type Definitions:**
```typescript
// Infer from Zod schemas
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;

// Session extensions
(session.user as { role?: string; username?: string })?.role

// Database types from Prisma
import { User, Project, UserRole } from "@prisma/client";
```

### Error Handling Patterns

**API Routes:**
```typescript
try {
  // Database operations
  const result = await prisma.model.operation(data);
  return NextResponse.json(result);
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Données invalides", details: error.issues },
      { status: 400 }
    );
  }
  console.error("Error message:", error);
  return NextResponse.json(
    { error: "Erreur serveur" },
    { status: 500 }
  );
}
```

**Authentication Checks:**
```typescript
async function checkAdminAccess() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return false;
  }
  return true;
}
```

### Database Patterns

**Prisma Usage:**
- Use Prisma client from `@/lib/prisma`
- Always select specific fields, never return sensitive data
- Use transactions for multiple operations
- Handle foreign key constraints properly

**Query Examples:**
```typescript
// Get users without passwords
const users = await prisma.user.findMany({
  select: {
    id: true,
    username: true,
    name: true,
    role: true,
    color: true,
    createdAt: true,
    updatedAt: true,
  },
  orderBy: { createdAt: "desc" },
});

// Create with relations
const project = await prisma.project.create({
  data: {
    ...projectData,
    ownerId: session.user.id,
  },
});
```

### Styling Conventions

**Tailwind CSS Patterns:**
- Use Tailwind v4 with custom CSS variables
- Follow consistent spacing and color schemes
- Use semantic color classes (indigo for primary actions)
- Implement dark mode support with `dark:` prefixes
- Use responsive prefixes: `sm:`, `md:`, `lg:`

**Component Styling:**
```typescript
// Buttons
className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"

// Interactive elements
className="inline-flex items-center justify-center rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
```

### Authentication & Authorization

**NextAuth Configuration:**
- Credentials provider with bcrypt password hashing
- Custom session management with role-based access
- French error messages and localization
- Role hierarchy: ADMIN > USER > VISITOR

**Access Control Patterns:**
```typescript
// Server-side checks
const session = await auth();
if (!session) redirect("/login");

// Admin-only operations
const isAdmin = await checkAdminAccess();
if (!isAdmin) {
  return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
}
```

### Validation Patterns

**Zod Schemas:**
```typescript
export const ProjectUpdateSchema = z.object({
  id: z.string().min(1, "L'ID du projet est requis"),
  latitude: z.number(),
  longitude: z.number(),
  description: z.string().optional(),
  prospection: z.number().min(0).max(100).optional(),
});

export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;
```

### Internationalization

- All user-facing strings should be in French
- Error messages, labels, and descriptions in French
- Date formatting should use French locale
- Database field comments in French for clarity

### Testing Notes

- No specific testing framework is currently configured
- Manual testing through development server
- API testing can be done with tools like Postman or curl
- Database operations can be tested with Prisma Studio

### Windows Terminal Commands

**IMPORTANT**: This project runs on Windows (PowerShell/CMD). Command chaining operators are NOT supported:

```bash
# ❌ FORBIDDEN - These will FAIL on Windows:
npm install && npm run dev
git add . && git commit -m "message"
cd folder && ls
command1 || command2

# ✅ CORRECT - Execute commands individually:
npm install
npm run dev

git add .
git commit -m "message"

cd folder
ls
```

**Command Protocol:**
- Execute each command separately (no `&&` or `||` operators)
- Use sequential execution for multi-step operations
- Test each command's success before proceeding
- For complex workflows, use batch files or PowerShell scripts

### Development Workflow

1. Always run `npm run lint` after making changes
2. Test authentication flows thoroughly
3. Verify database changes work with existing data
4. Check responsive design for new components
5. Ensure dark mode compatibility
6. Validate all user inputs with Zod schemas

### Common Pitfalls to Avoid

- Never expose password hashes or sensitive database fields
- Always validate input data before database operations
- Use proper TypeScript types, avoid `any`
- Don't forget to handle loading states and error states
- Remember to mark client components with `"use client"`
- Always check authentication before accessing protected resources
- Use environment variables for sensitive configuration
- **CRITICAL**: Never use command chaining operators (`&&`, `||`) on Windows
