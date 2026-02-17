import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon';
import { headers } from "next/headers";

// Cache to store PrismaClient per request to avoid "Cannot perform I/O" error
// while also avoiding "Hung worker" by not recreating it on every property access.
// headers() returns a stable proxy object for the current request.
// WeakMap allows for automatic garbage collection at the end of the request.
const requestCache = new WeakMap<object, PrismaClient>();

const createEdgeClient = (): PrismaClient => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set for Edge runtime');
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
};

// Use a Proxy to handle the runtime differences transparently
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    // Determine runtime
    const isEdge = process.env.NEXT_RUNTIME === 'edge' || process.env.CF_PAGES === '1';

    if (!isEdge) {
      // Node.js runtime singleton
      const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient();
      }
      const client = globalForPrisma.prisma;
      const value = client[prop as keyof PrismaClient];
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
    }

    // Edge/Cloudflare runtime
    let headersObj: object | null = null;
    try {
      // In Next.js, headers() is a reliable anchor for the current request in Server context
      headersObj = headers();
    } catch {
      // Outside of request context (e.g. build time)
    }

    let client: PrismaClient;

    if (headersObj) {
      const cached = requestCache.get(headersObj);
      if (cached) {
        client = cached;
      } else {
        client = createEdgeClient();
        requestCache.set(headersObj, client);
      }
    } else {
      // Fallback for context-less Edge execution (rare, e.g. build or background)
      const globalForPrisma = globalThis as unknown as { prismaEdgeFallback: PrismaClient | undefined };
      if (!globalForPrisma.prismaEdgeFallback) {
        globalForPrisma.prismaEdgeFallback = createEdgeClient();
      }
      client = globalForPrisma.prismaEdgeFallback;
    }

    const value = client[prop as keyof PrismaClient];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  }
});

export default prisma;
