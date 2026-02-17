import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon';

// Get DATABASE_URL from process.env or from globalThis (for Cloudflare Workers)
const getDatabaseUrl = () => {
  // Try process.env first (Node.js / local development)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Try to get from global scope (Cloudflare Workers injects env differently)
  const globalWithEnv = globalThis as { 
    __env?: { DATABASE_URL?: string }; 
    env?: { DATABASE_URL?: string };
    DATABASE_URL?: string;
  };
  
  if (globalWithEnv.__env?.DATABASE_URL) {
    return globalWithEnv.__env.DATABASE_URL;
  }
  
  if (globalWithEnv.env?.DATABASE_URL) {
    return globalWithEnv.env.DATABASE_URL;
  }
  
  if (globalWithEnv.DATABASE_URL) {
    return globalWithEnv.DATABASE_URL;
  }
  
  return undefined;
};

// Create Prisma client with lazy initialization for Cloudflare Workers
let prismaInstance: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaNeon({ connectionString });
  prismaInstance = new PrismaClient({ adapter });
  
  return prismaInstance;
}

// For Node.js/local development: cache the client globally
if (process.env.NODE_ENV !== 'production') {
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };
  
  if (globalForPrisma.prisma) {
    prismaInstance = globalForPrisma.prisma;
  } else {
    // Initialize lazily on first access in development too
    Object.defineProperty(globalForPrisma, 'prisma', {
      get: () => prismaInstance,
      set: (value) => { prismaInstance = value; },
      configurable: true,
    });
  }
}

// Export a proxy that lazily initializes the client on first use
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    return client[prop as keyof PrismaClient];
  },
});

export default prisma;
