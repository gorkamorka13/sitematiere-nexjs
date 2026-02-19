---
name: Cloudflare Workers Serialization
description: Handle JSON serialization issues when deploying Next.js server actions to Cloudflare Workers/Pages
---

# Cloudflare Workers Serialization Skill

## Problem

When deploying Next.js applications to Cloudflare Workers/Pages, server actions that return Drizzle objects (or results from queries) containing non-JSON-serializable types (like `Date`, `BigInt`, etc.) will cause **HTTP 500 errors** with the message:

```
Error: An unexpected response was received from the server.
```

This is because Cloudflare Workers Edge Runtime requires all data returned from server actions to be **JSON-serializable**.

## Common Non-Serializable Types

- `Date` objects (from Drizzle `timestamp` fields)
- `BigInt`
- `undefined` (use `null` instead)
- Functions
- Symbols
- Circular references

## Solution Pattern

### 1. Identify the Problem

Look for server actions that return query results directly:

```typescript
// ❌ BAD - Returns Date objects
export async function getProjectVideos(projectId: string) {
  const videosList = await db.select().from(videos).where(eq(videos.projectId, projectId));
  return { success: true, videos: videosList }; // contains Date objects!
}
```

### 2. Serialize the Data

Convert non-serializable types to JSON-safe equivalents:

```typescript
// ✅ GOOD - Serializes Date to ISO string
export async function getProjectVideos(projectId: string) {
  const videosList = await db.select().from(videos).where(eq(videos.projectId, projectId));

  // Serialize dates to ISO strings
  const serializedVideos = videosList.map(v => ({
    ...v,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt?.toISOString(),
  }));

  return { success: true, videos: serializedVideos };
}
```

### 3. Update TypeScript Types

Create serialized versions of Drizzle types:

```typescript
import { videos } from "@/lib/db/schema";

type Video = typeof videos.$inferSelect;

// Create serialized version
type SerializedVideo = Omit<Video, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt?: string;
};
```

## Quick Reference

### For Single Objects
```typescript
const serialized = {
  ...record,
  createdAt: record.createdAt.toISOString(),
};
```

### For Arrays
```typescript
const serialized = records.map(r => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
}));
```

## Checklist

- [ ] Does the action return database query results?
- [ ] Are there `Date` fields in the returned data?
- [ ] Have you serialized all `Date` objects to ISO strings?
- [ ] Have you tested on Cloudflare deployment?
