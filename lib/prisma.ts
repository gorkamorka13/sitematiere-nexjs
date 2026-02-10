import { PrismaClient } from "@prisma/client";

// Note: We use dynamic imports for Edge-only packages to avoid issues in Node.js
// but since these are Edge-compatible, we can also try static imports if the bundler allows.
// To be safe and compatible with both, we'll use a singleton pattern.

let prisma: PrismaClient;

if (process.env.NEXT_RUNTIME === 'edge' || process.env.CF_PAGES === '1') {
  // We need to import these only in edge runtime
  // Next.js handles this during bundling
  const { PrismaNeon } = require('@prisma/adapter-neon');
  const { Pool } = require('@neondatabase/serverless');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Node.js runtime
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  prisma = globalForPrisma.prisma;
}

export default prisma;
