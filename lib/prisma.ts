import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon';

let prisma: PrismaClient;

console.log(`[Prisma_Init] Runtime: ${process.env.NEXT_RUNTIME}, CF_PAGES: ${process.env.CF_PAGES}`);

if (process.env.NEXT_RUNTIME === 'edge' || process.env.CF_PAGES === '1') {
  // Edge runtime - use Neon adapter
  console.log('[Prisma_Init] Initializing Edge runtime client with Neon adapter');
  if (!process.env.DATABASE_URL) {
    console.error('[Prisma_Init] CRITICAL: DATABASE_URL is missing in Edge runtime');
    throw new Error('DATABASE_URL is not set for Edge runtime');
  }

  const connectionString = process.env.DATABASE_URL;
  const adapter = new PrismaNeon({ connectionString });

  prisma = new PrismaClient({ adapter });
} else {
  // Node.js runtime
  console.log('[Prisma_Init] Initializing Node.js runtime client');
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  prisma = globalForPrisma.prisma;
}

export default prisma;
