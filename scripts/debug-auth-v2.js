
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('Starting check...');
    try {
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} users.`);
        for (const u of users) {
            console.log(`- ${u.username || '(no-username)'} / ${u.email || '(no-email)'}`);
        }
    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    } finally {
        await prisma.$disconnect();
        console.log('Done.');
    }
}

run();
