import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const prismaClientSingleton = () => {
    // Use adapter for Edge Runtime compatibility
    if (process.env.DATABASE_URL) {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaNeon(pool);
        return new PrismaClient({ adapter });
    }
    return new PrismaClient();
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
