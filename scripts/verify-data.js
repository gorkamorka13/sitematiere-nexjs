const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const projectCount = await prisma.project.count();
        const userCount = await prisma.user.count();
        console.log(`Verification Results:`);
        console.log(`- Projects found: ${projectCount}`);
        console.log(`- Users found: ${userCount}`);
    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
