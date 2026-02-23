---
name: Cloudflare Performance & Query Optimization
description: Avoid N+1 query patterns and respect query limits on Cloudflare Workers and Neon databases.
---

# Cloudflare Performance & Query Optimization Skill

## Problem

Cloudflare Workers (Edge Runtime) and Neon databases have strict limits on the number of concurrent or total queries allowed per session (often **limit: 50**).

The **N+1 query pattern** is the most common cause of "Application error: a server-side exception has occurred" because it executes one query to get a list and then one additional query *per item* in that list.

## Pattern 1: The Join (Best for 1-to-1 or Many-to-1)

Instead of fetching owners or parents in a loop, join the tables in the initial query.

### ❌ BAD (N+1 Queries)
```typescript
const allProjects = await db.select().from(projects);
const projectsWithOwners = await Promise.all(
  allProjects.map(async (p) => {
    const [owner] = await db.select().from(users).where(eq(users.id, p.ownerId));
    return { ...p, owner };
  })
);
```

### ✅ GOOD (Single Query)
```typescript
const results = await db
  .select({
    project: projects,
    owner: users
  })
  .from(projects)
  .leftJoin(users, eq(projects.ownerId, users.id));

const projectsWithOwners = results.map(r => ({
  ...r.project,
  owner: r.owner
}));
```

## Pattern 2: Batch Fetching (Best for 1-to-Many)

When you need to fetch many children (images, documents, etc.) for a list of parents, use `inArray` to fetch everything in one go.

### ❌ BAD (3N + 1 Queries)
```typescript
const projects = await db.select().from(projects);
const fullData = await Promise.all(projects.map(async p => {
  const imgs = await db.select().from(images).where(eq(images.projectId, p.id));
  const vids = await db.select().from(videos).where(eq(videos.projectId, p.id));
  return { ...p, images: imgs, videos: vids };
}));
```

### ✅ GOOD (Only 3 Queries)
```typescript
const projects = await db.select().from(projects);
const projectIds = projects.map(p => p.id);

const [allImages, allVideos] = await Promise.all([
  db.select().from(images).where(inArray(images.projectId, projectIds)),
  db.select().from(videos).where(inArray(videos.projectId, projectIds)),
]);

const fullData = projects.map(p => ({
  ...p,
  images: allImages.filter(img => img.projectId === p.id),
  videos: allVideos.filter(vid => vid.projectId === p.id),
}));
```

## Checklist for Cloudflare Pages

- [ ] Does the page display a list of items?
- [ ] Are we fetching related data in a `.map()` or loop?
- [ ] Can we use a `leftJoin` to combine queries?
- [ ] If fetching children, are we using `inArray` to batch the queries?
- [ ] Total query count for the page should be < 5-10, never close to 50.
