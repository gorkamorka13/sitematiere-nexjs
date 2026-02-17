import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon';

// Use a Proxy to handle the runtime differences transparently
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const isEdge = process.env.NEXT_RUNTIME === 'edge' || process.env.CF_PAGES === '1';

    let client: PrismaClient;

    if (isEdge) {
      // For Edge/Cloudflare, we ideally want one client per request.
      // However, without a global request object, we use a global singleton
      // but we MUST be careful. If we hit the I/O isolation error,
      // we might need to recreate it.
      // For now, let's try a singleton that is lazily initialized.
      const globalForPrisma = globalThis as unknown as { prismaEdge: PrismaClient | undefined };
      if (!globalForPrisma.prismaEdge) {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL is not set for Edge runtime');
        }
        const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
        globalForPrisma.prismaEdge = new PrismaClient({ adapter });
      }
      client = globalForPrisma.prismaEdge;
    } else {
      // In Node.js, we use a global singleton to avoid exhausting connections
      const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient();
      }
      client = globalForPrisma.prisma;
    }

    const value = client[prop as keyof PrismaClient];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  }
});

export default prisma;
