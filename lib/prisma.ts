import { PrismaClient } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const EdgeRuntime: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any  
declare const WebSocketPair: any;

const prismaClientSingleton = () => {
    // Check if running in Edge Runtime (Cloudflare Workers)
    const isEdgeRuntime = typeof EdgeRuntime !== 'undefined' || typeof WebSocketPair !== 'undefined';
    
    if (isEdgeRuntime && process.env.DATABASE_URL) {
        // Use adapter for Edge Runtime (Cloudflare)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PrismaNeon } = require('@prisma/adapter-neon');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Pool } = require('@neondatabase/serverless');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaNeon(pool);
        return new PrismaClient({ adapter });
    }
    
    // Standard Prisma for Node.js (local development)
    return new PrismaClient();
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
