const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log('Testing Prisma connection...');
    try {
        await prisma.$connect();
        console.log('Successfully connected to Prisma!');
        const userCount = await prisma.user.count();
        console.log('User count:', userCount);
    } catch (err) {
        console.error('Prisma connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
