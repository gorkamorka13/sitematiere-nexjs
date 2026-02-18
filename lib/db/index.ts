import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const getDatabaseUrl = (): string | undefined => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
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

// For Cloudflare Workers, we create a new connection per request
// to avoid connection pooling issues in serverless environments
export function createDb() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Mask connection string for logging
  const maskedUrl = connectionString.replace(/:[^:@]+@/, ':****@');
  console.log(`[DB] Creating connection to: ${maskedUrl.substring(0, 50)}...`);
  console.log(`[DB] CF_PAGES: ${process.env.CF_PAGES}`);
  console.log(`[DB] NEXT_RUNTIME: ${process.env.NEXT_RUNTIME}`);

  const sql = neon(connectionString, {
    fetchOptions: {
      cache: 'no-store',
    },
  });
  
  return drizzle(sql, { schema });
}

// Maintain backward compatibility with existing code
// In serverless environments, each request gets its own connection
let dbInstance: ReturnType<typeof drizzle> | undefined;

function getDb() {
  // In Cloudflare Workers (CF_PAGES), always create fresh connection
  if (process.env.CF_PAGES) {
    return createDb();
  }
  
  // In Node.js environments, use singleton pattern
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = createDb();
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = getDb();
    return database[prop as keyof typeof database];
  },
});

export default db;
