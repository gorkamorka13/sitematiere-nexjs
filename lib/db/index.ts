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

let dbInstance: ReturnType<typeof drizzle> | undefined;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(connectionString);
  dbInstance = drizzle(sql, { schema });

  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = getDb();
    return database[prop as keyof typeof database];
  },
});

export default db;
