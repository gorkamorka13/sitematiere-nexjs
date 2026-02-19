import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

// Required for neon-serverless to work in standard Node.js environments
if (typeof window === 'undefined') {
  // Only use 'ws' if native WebSocket is not available (Node.js)
  if (!globalThis.WebSocket) {
    try {
      const ws = require('ws');
      neonConfig.webSocketConstructor = ws;
    } catch (e) {
      // If we're in a specialized environment where ws is needed but missing
    }
  }
}

const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL ||
              (globalThis as any).__env?.DATABASE_URL ||
              (globalThis as any).env?.DATABASE_URL ||
              (globalThis as any).DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is not defined. Please check your environment variables.');
  }
  return url;
};

// Singleton pattern to avoid multiple pools in development
interface GlobalDb {
  pool?: Pool;
  db?: ReturnType<typeof drizzle<typeof schema>>;
}

const globalForDb = globalThis as unknown as GlobalDb;

function getDbInstance() {
  if (globalForDb.db) return globalForDb.db;

  const connectionString = getDatabaseUrl();
  console.log('[DB] Connecting to Neon via WebSockets (Support Transactions)...');

  const pool = new Pool({ connectionString });
  const dbInstance = drizzle(pool, { schema });

  // Store in global only in non-production to persist across HMR
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.pool = pool;
    globalForDb.db = dbInstance;
  }

  return dbInstance;
}

// Proxy to defer initialization until first property access and fix binding
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(target, prop) {
    const instance = getDbInstance();
    const value = (instance as any)[prop];

    if (typeof value === 'function' && typeof prop === 'string' && !['then', 'catch', 'finally'].includes(prop)) {
      return value.bind(instance);
    }

    return value;
  },
});

export default db;
