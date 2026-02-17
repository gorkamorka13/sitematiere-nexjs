import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon';

const createEdgeClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set for Edge runtime');
  }
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
};

// Use a Proxy to handle the Edge vs Node.js runtime differences transparently
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    // Determine runtime
    const isEdge = process.env.NEXT_RUNTIME === 'edge' || process.env.CF_PAGES === '1';

    let client: PrismaClient;

    if (isEdge) {
      // In Edge/Cloudflare, we MUST create a fresh client to ensure the I/O context
      // is correct for the current request, avoiding "Cannot perform I/O on behalf
      // of a different request".
      client = createEdgeClient();
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
      return (value as (...args: any[]) => any).bind(client);
    }
    return value;
  }
});

export default prisma;
