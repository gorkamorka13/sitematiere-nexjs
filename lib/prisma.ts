import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

if (process.env.NEXT_RUNTIME === 'edge' || process.env.CF_PAGES === '1') {
  // Edge runtime - use Neon adapter
  const { PrismaNeon } = require('@prisma/adapter-neon');
  const { Pool } = require('@neondatabase/serverless');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set for Edge runtime');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  prisma = new PrismaClient({
    adapter,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
} else {
  // Node.js runtime
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  prisma = globalForPrisma.prisma;
}

export default prisma;
