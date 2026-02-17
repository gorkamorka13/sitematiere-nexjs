import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon';

// Get DATABASE_URL from process.env or from globalThis (for Cloudflare Workers)
const getDatabaseUrl = () => {
  // Try process.env first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Try to get from global scope (Cloudflare Workers injects env differently)
  const globalEnv = (globalThis as { __env?: { DATABASE_URL?: string }; env?: { DATABASE_URL?: string } }).__env || (globalThis as { env?: { DATABASE_URL?: string } }).env;
  if (globalEnv?.DATABASE_URL) {
    return globalEnv.DATABASE_URL;
  }
  
  return undefined;
};

const connectionString = getDatabaseUrl();

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('URL')));
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
