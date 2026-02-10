import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

let prisma: PrismaClient;

if (process.env.NEXT_RUNTIME === 'edge' || process.env.CF_PAGES === '1') {
  // Edge runtime - use Neon adapter
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set for Edge runtime');
  }

  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
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
