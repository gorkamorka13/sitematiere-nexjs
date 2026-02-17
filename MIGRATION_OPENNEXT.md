# Migration Guide: From next-on-pages to OpenNext

## Executive Summary

This document outlines the migration plan for moving the bridge construction management system from the deprecated `@cloudflare/next-on-pages` (v1.13.16) to the modern `@opennextjs/cloudflare` adapter.

**Key Changes:**
- **Deployment Target**: Cloudflare Pages → Cloudflare Workers
- **Runtime**: Edge Runtime → Node.js Runtime
- **Build Output**: `.vercel/output/static` → `.open-next`
- **Scripts**: `toggle-runtime.js` → No longer needed

**Benefits:**
- ✅ Full Next.js feature support
- ✅ Node.js API compatibility (fs, crypto, etc.)
- ✅ Better Prisma ORM support
- ✅ Active maintenance and security updates
- ✅ No more deprecation warnings

---

## Current State Analysis

### Architecture Overview
- **Framework**: Next.js 15.5.12 with App Router
- **Current Adapter**: `@cloudflare/next-on-pages@1.13.16` (deprecated)
- **Runtime Mode**: Edge Runtime with toggle script
- **Database**: PostgreSQL via Prisma + Neon adapter
- **File Storage**: Cloudflare R2
- **Authentication**: NextAuth.js v5 beta

### Files with Edge Runtime
The following 37 files currently use `export const runtime = 'edge'`:

```
app/layout.tsx
app/page.tsx
app/projects/[id]/page.tsx
app/api/auth/[...nextauth]/route.ts
app/api/files/[id]/route.ts
app/api/files/bulk-move/route.ts
app/api/files/delete/route.ts
app/api/files/list/route.ts
app/api/files/serve/[...key]/route.ts
app/api/files/upload/route.ts
app/api/files/rename/route.ts
app/api/files/restore/route.ts
app/api/files/statistics/route.ts
app/api/users/route.ts
app/api/blob-proxy/route.ts
app/api/blob-url/route.ts
app/api/create-user/route.ts
app/api/debug/route.ts
app/api/debug/auth/route.ts
app/api/debug/health/route.ts
app/api/projects/route.ts
app/api/proxy/route.ts
app/(auth)/login/page.tsx
app/slideshow/view/[projectId]/page.tsx
app/export-db/page.tsx
```

### Build Configuration
**Current** (`package.json`):
```json
{
  "cloudflare": "node scripts/toggle-runtime.js cloudflare",
  "build:cloudflare": "node scripts/toggle-runtime.js cloudflare && npx @cloudflare/next-on-pages"
}
```

**Build Output**: `.vercel/output/static`

---

## Migration Phases

### Phase 1: Preparation

#### 1.1 Create Migration Branch
```bash
git checkout -b migration/opennext
git push -u origin migration/opennext
```

#### 1.2 Update Dependencies

**Remove deprecated packages:**
```bash
npm uninstall @cloudflare/next-on-pages
```

**Install OpenNext adapter:**
```bash
npm install -D @opennextjs/cloudflare@latest wrangler@latest
```

**Verify Prisma compatibility:**
Your current Prisma setup with `@prisma/adapter-neon` is compatible with Node.js Workers.

#### 1.3 Create Configuration Files

**`open-next.config.ts`** (create at project root):
```typescript
import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    // Enable incremental static regeneration caching
    incrementalCache: {
      tagCache: true,
      staleWhileRevalidate: true,
    },
  },
};

export default config;
```

**`wrangler.toml`** (create at project root):
```toml
name = "sitematiere"
main = ".open-next/worker.js"
compatibility_date = "2025-09-15"
compatibility_flags = ["nodejs_compat"]

[site]
bucket = ".open-next/assets"

[observability]
enabled = true
head_sampling_rate = 1

# Environment variables (non-sensitive)
[vars]
NEXT_PUBLIC_APP_VERSION = "0.1.77"
NEXT_PUBLIC_CREDIT = "Michel ESPARSA"
NEXT_PUBLIC_R2_PUBLIC_URL = ""
```

**Note**: Sensitive values (DATABASE_URL, NEXTAUTH_SECRET, etc.) should be set via Wrangler secrets, not in this file.

#### 1.4 Update TypeScript Configuration

**`tsconfig.json`** - Exclude OpenNext config:
```json
{
  "exclude": ["node_modules", "open-next.config.ts"]
}
```

---

### Phase 2: Code Modifications

#### 2.1 Remove Edge Runtime Declarations

Remove or comment out `export const runtime = 'edge'` from all 37 files listed above.

**Before:**
```typescript
export const runtime = 'edge';
// export const runtime = 'edge'; // Commenté pour le dev local
```

**After:**
```typescript
// No runtime export needed - defaults to Node.js
```

**Script to automate** (optional):
```bash
# Run from project root
find app -name "*.ts" -o -name "*.tsx" | xargs sed -i '' '/export const runtime/d'
```

#### 2.2 Simplify Prisma Client

**Current** (`lib/prisma.ts`):
Uses complex Proxy pattern for Edge/Node switching.

**New** (`lib/prisma.ts`):
```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaNeon({ connectionString });

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

#### 2.3 Update next.config.ts

**Remove** edge-specific workarounds:
- Remove `serverExternalPackages` related to Edge runtime
- Remove webpack config for `wasm-edge-light-loader`

**Keep** these configurations:
- Image domains
- Environment variables
- Sharp/webpack optimizations for Node.js

#### 2.4 Update API Routes

All API routes will automatically work with Node.js runtime. Key considerations:

**File uploads** (`app/api/files/upload/route.ts`):
- Currently uses `crypto.randomUUID()` - works in Node.js
- Sharp image processing - works in Node.js
- File streaming to R2 - works in Node.js

**Video processing** (`lib/files/blob-client.ts`):
- Uses `child_process.exec` with ffmpeg - works in Node.js Workers
- Verify ffmpeg binary is available in Cloudflare Workers environment

**Authentication** (`app/api/auth/[...nextauth]/route.ts`):
- NextAuth.js v5 - fully compatible with Node.js Workers
- JWT session strategy - no changes needed
- bcrypt-ts password hashing - works in Node.js

---

### Phase 3: Environment Variables

#### 3.1 Development Environment

Create `.dev.vars` for local development:
```bash
# Database
DATABASE_URL="postgres://user:password@host/database?sslmode=require"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:8787"

# Cloudflare R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
NEXT_PUBLIC_R2_PUBLIC_URL="https://your-bucket.r2.dev"

# Other
NODE_ENV="development"
```

#### 3.2 Production Secrets

Set secrets using Wrangler:
```bash
# Core secrets
wrangler secret put DATABASE_URL
wrangler secret put NEXTAUTH_SECRET

# R2 credentials
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

#### 3.3 Public Variables

Public variables (used in browser) go in `wrangler.toml` [vars] section or `.dev.vars`:
- `NEXT_PUBLIC_APP_VERSION`
- `NEXT_PUBLIC_CREDIT`
- `NEXT_PUBLIC_R2_PUBLIC_URL`
- `NEXT_PUBLIC_BUILD_DATE`

---

### Phase 4: Build & Deployment Scripts

#### 4.1 Update package.json

**Replace**:
```json
{
  "cloudflare": "node scripts/toggle-runtime.js cloudflare",
  "build:cloudflare": "node scripts/toggle-runtime.js cloudflare && npx @cloudflare/next-on-pages"
}
```

**With**:
```json
{
  "build:worker": "opennextjs-cloudflare",
  "dev:worker": "wrangler dev",
  "deploy": "wrangler deploy",
  "preview": "npm run build:worker && wrangler dev",
  "cf-typegen": "wrangler types"
}
```

#### 4.2 Remove toggle-runtime.js

Delete `scripts/toggle-runtime.js` - no longer needed.

Update `scripts/increment-version.js` if it references Cloudflare-specific paths.

---

### Phase 5: Testing Strategy

#### 5.1 Local Development Testing

```bash
# Build the worker
npm run build:worker

# Start local dev server
npm run dev:worker
```

**Test checklist:**
- [ ] Homepage loads with projects list
- [ ] Authentication (login/logout)
- [ ] Project creation and editing
- [ ] File uploads (images, videos, PDFs)
- [ ] Image thumbnails generation
- [ ] Video thumbnail generation
- [ ] PDF viewer
- [ ] Map display with pins
- [ ] Slideshow functionality
- [ ] User management (admin only)
- [ ] Database operations (CRUD)
- [ ] Dark mode toggle
- [ ] Responsive design

#### 5.2 Common Issues & Solutions

| Issue | Error Message | Solution |
|-------|--------------|----------|
| Node.js API not available | `fs is not defined` | Add `nodejs_compat` to wrangler.toml |
| Database connection fails | `connection refused` | Verify DATABASE_URL format and SSL settings |
| Static assets 404 | `Cannot GET /_next/static/...` | Check `wrangler.toml` [site] bucket path |
| Build fails | `Cannot find module` | Run `npm install` and verify all dependencies |
| Prisma errors | `Invalid prisma invocation` | Ensure Prisma Client is generated: `npx prisma generate` |
| FFmpeg not found | `spawn ffmpeg ENOENT` | Verify ffmpeg is available in Cloudflare Workers or use alternative |

---

### Phase 6: Deployment

#### 6.1 Staging Deployment

```bash
# Build for staging
npm run build:worker

# Deploy to staging
wrangler deploy --env staging
```

#### 6.2 Production Deployment

```bash
# Build for production
npm run build:worker

# Deploy to production
wrangler deploy

# Or with custom domain
wrangler route add yourdomain.com/* --worker sitematiere
```

#### 6.3 Cloudflare Dashboard Setup

1. Go to Cloudflare Dashboard → Workers & Pages
2. Create new **Worker** (not Pages!)
3. Deploy using Wrangler CLI or upload worker.js
4. Configure custom domain (optional)
5. Set up analytics and logging

---

## Compatibility Matrix

### ✅ Fully Compatible (No Changes Needed)

| Feature | Status | Notes |
|---------|--------|-------|
| React Components | ✅ | Works in Node.js Workers |
| Next.js App Router | ✅ | Full support |
| API Routes | ✅ | Remove `runtime = 'edge'` only |
| Prisma ORM | ✅ | Better support than Edge |
| NextAuth.js v5 | ✅ | Works with JWT strategy |
| Tailwind CSS | ✅ | Build-time only |
| Sharp Image Processing | ✅ | Node.js native module |
| File Uploads to R2 | ✅ | AWS SDK compatible |
| PDF Viewer (react-pdf) | ✅ | Node.js compatible |
| Map Display (Leaflet) | ✅ | Client-side library |
| Zod Validation | ✅ | Works everywhere |

### ⚠️ Requires Attention

| Feature | Status | Action Required |
|---------|--------|-----------------|
| Video Thumbnails (ffmpeg) | ⚠️ | Verify ffmpeg binary availability |
| Database Connection | ⚠️ | Update Prisma client initialization |
| Environment Variables | ⚠️ | Migrate to Wrangler secrets |
| Build Scripts | ⚠️ | Update to OpenNext commands |
| Edge-Specific APIs | ⚠️ | Replace with Node.js equivalents |

### ❌ Not Compatible (Not Used in This Project)

| Feature | Status | Notes |
|---------|--------|-------|
| Vercel Edge Config | ❌ | Not used |
| Vercel Analytics | ❌ | Not used |
| Middleware (Edge) | ❌ | Not used |
| ISR on Vercel | ❌ | Not used |

---

## Breaking Changes Checklist

### Code Changes Required

- [ ] Remove `export const runtime = 'edge'` from 37 files
- [ ] Update `lib/prisma.ts` to remove Proxy pattern
- [ ] Update `next.config.ts` to remove edge workarounds
- [ ] Create `open-next.config.ts`
- [ ] Create `wrangler.toml`
- [ ] Update `package.json` scripts
- [ ] Delete `scripts/toggle-runtime.js`
- [ ] Update `.gitignore` to remove old build directories

### Environment Changes Required

- [ ] Create `.dev.vars` for local development
- [ ] Set Wrangler secrets for production
- [ ] Update Cloudflare Pages → Workers
- [ ] Configure custom domain (if applicable)
- [ ] Set up observability/logging in wrangler.toml

### Testing Required

- [ ] Local development (`npm run dev:worker`)
- [ ] File upload functionality
- [ ] Image processing (Sharp)
- [ ] Video processing (ffmpeg)
- [ ] Database CRUD operations
- [ ] Authentication flow
- [ ] PDF viewer
- [ ] Map integration
- [ ] Responsive design
- [ ] Build process (`npm run build:worker`)
- [ ] Staging deployment
- [ ] Production deployment

---

## Rollback Plan

If issues occur during migration:

1. **Immediate Rollback**:
   ```bash
   git checkout main
   git branch -D migration/opennext
   ```

2. **Database**: No schema changes required - same PostgreSQL database

3. **Files in R2**: Unaffected by migration

4. **DNS**: Keep existing Cloudflare Pages deployment running until confident

5. **Parallel Deployment**: Can run both Pages and Workers simultaneously during testing

---

## Timeline Estimate

| Phase | Duration | Complexity | Dependencies |
|-------|----------|------------|--------------|
| Phase 1: Preparation | 1-2 hours | Low | None |
| Phase 2: Code Changes | 2-3 hours | Medium | Phase 1 |
| Phase 3: Environment | 1 hour | Low | Phase 1 |
| Phase 4: Testing | 2-3 hours | Medium | Phase 2, 3 |
| Phase 5: Deployment | 1 hour | Low | Phase 4 |
| Phase 6: Cleanup | 30 min | Low | Phase 5 |
| **Total** | **~8-11 hours** | **Medium** | Sequential |

---

## Post-Migration Benefits

### Immediate Benefits
1. **No more deprecation warnings** - Clean npm install output
2. **Security updates** - Active maintenance of OpenNext adapter
3. **Better debugging** - Node.js runtime is easier to debug than Edge
4. **Full Next.js features** - All APIs available

### Long-term Benefits
1. **Future-proof** - Official Cloudflare recommendation
2. **Better performance** - v1.2+ reduced bundle size (14MB → 8MB)
3. **Community support** - Growing OpenNext ecosystem
4. **Easier maintenance** - No more runtime toggling

---

## Resources

### Documentation
- [OpenNext Cloudflare Documentation](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

### Community
- [OpenNext Discord](https://discord.gg/opennext)
- [Cloudflare Developers Discord](https://discord.gg/cloudflaredev)

### Migration Tools
- [Diverce](https://github.com/fortmarek/diverce) - Automatic Vercel to Cloudflare migration
- [OpenNext Examples](https://github.com/opennextjs/opennextjs-cloudflare/tree/main/examples)

---

## Next Steps

1. **Review this document** with your team
2. **Create the migration branch**
3. **Set up staging environment** in Cloudflare Workers
4. **Start with Phase 1** (can be done incrementally)
5. **Test thoroughly** before production deployment

**Questions or issues during migration?** Refer to the Common Issues section or consult the OpenNext documentation.

---

*Last updated: 2026-02-17*
*Migration target: @opennextjs/cloudflare v1.3.0+*
*Current version: @cloudflare/next-on-pages v1.13.16*
