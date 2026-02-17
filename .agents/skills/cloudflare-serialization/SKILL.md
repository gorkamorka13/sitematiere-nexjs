---
name: Cloudflare Workers Serialization
description: Handle JSON serialization issues when deploying Next.js server actions to Cloudflare Workers/Pages
---

# Cloudflare Workers Serialization Skill

## Problem

When deploying Next.js applications to Cloudflare Workers/Pages, server actions that return Prisma objects or other data containing non-JSON-serializable types (like `Date`, `BigInt`, etc.) will cause **HTTP 500 errors** with the message:

```
Error: An unexpected response was received from the server.
```

This is because Cloudflare Workers Edge Runtime requires all data returned from server actions to be **JSON-serializable**.

## Common Non-Serializable Types

- `Date` objects (from Prisma `DateTime` fields)
- `BigInt`
- `undefined` (use `null` instead)
- Functions
- Symbols
- Circular references

## Solution Pattern

### 1. Identify the Problem

Look for server actions that return Prisma query results directly:

```typescript
// ❌ BAD - Returns Date objects
export async function getProjectVideos(projectId: string) {
  const videos = await prisma.video.findMany({
    where: { projectId },
  });
  return { success: true, videos }; // videos contain Date objects!
}
```

### 2. Serialize the Data

Convert non-serializable types to JSON-safe equivalents:

```typescript
// ✅ GOOD - Serializes Date to ISO string
export async function getProjectVideos(projectId: string) {
  const videos = await prisma.video.findMany({
    where: { projectId },
  });

  // Serialize dates to ISO strings
  const serializedVideos = videos.map(video => ({
    ...video,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt?.toISOString(),
  }));

  return { success: true, videos: serializedVideos };
}
```

### 3. Update TypeScript Types

Create serialized versions of Prisma types:

```typescript
// In your component file
import type { Video } from '@prisma/client';

// Create serialized version
type SerializedVideo = Omit<Video, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt?: string;
};

// Use in state/props
const [videos, setVideos] = useState<SerializedVideo[]>([]);
```

## Quick Reference

### For Single Objects

```typescript
const serialized = {
  ...prismaObject,
  createdAt: prismaObject.createdAt.toISOString(),
  updatedAt: prismaObject.updatedAt?.toISOString(),
};
```

### For Arrays

```typescript
const serialized = prismaArray.map(item => ({
  ...item,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt?.toISOString(),
}));
```

### For Nested Relations

```typescript
const serialized = prismaObject.map(item => ({
  ...item,
  createdAt: item.createdAt.toISOString(),
  relation: item.relation ? {
    ...item.relation,
    createdAt: item.relation.createdAt.toISOString(),
  } : null,
}));
```

## Type Helper Pattern

Create reusable type helpers:

```typescript
// lib/types/serialized.ts
import type { Video, Project, Image } from '@prisma/client';

export type Serialized<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
    ? string | null
    : T[K];
};

export type SerializedVideo = Serialized<Video>;
export type SerializedProject = Serialized<Project>;
export type SerializedImage = Serialized<Image>;
```

## Testing

### Local Development
- Works fine with `npm run dev` (Node.js runtime)
- May not catch serialization issues

### Cloudflare Deployment
- Test on Cloudflare Pages preview deployment
- Check browser console for 500 errors
- Check Cloudflare Workers logs for serialization errors

## Checklist

When creating/modifying server actions:

- [ ] Does the action return Prisma query results?
- [ ] Are there `Date` fields in the returned data?
- [ ] Have you serialized all `Date` objects to ISO strings?
- [ ] Have you updated TypeScript types in consuming components?
- [ ] Have you tested on Cloudflare deployment?

## Related Issues

- Cloudflare Workers Edge Runtime limitations
- Next.js Server Actions serialization requirements
- Prisma DateTime field handling
