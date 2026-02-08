// Conditional Prisma client - works in both Node.js and Edge Runtime
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

try {
  // Try to detect Edge Runtime
  if (typeof globalThis !== 'undefined' && !(globalThis as {process?: {versions?: {node?: string}}}).process?.versions?.node) {
    // Edge Runtime detected - use Neon adapter
    const { PrismaNeon } = require('@prisma/adapter-neon');
    const { Pool } = require('@neondatabase/serverless');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaNeon(pool);
    prisma = new PrismaClient({ adapter });
  } else {
    throw new Error('Not Edge Runtime');
  }
} catch {
  // Node.js - use standard Prisma
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
  prisma = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
}

export default prisma;
