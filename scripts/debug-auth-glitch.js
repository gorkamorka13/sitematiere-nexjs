
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmin() {
    try {
        const users = await prisma.user.findMany();
        console.log('--- Current Users in Database ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}`);
            console.log(`Username: "${u.username}"`);
            console.log(`Email: "${u.email}"`);
            console.log(`Role: ${u.role}`);
            console.log('----------------------------');
        });

        // Check if 'admin' exists in email but not in username
        const adminByEmail = await prisma.user.findUnique({ where: { email: 'admin' } });
        if (adminByEmail && !adminByEmail.username) {
            console.log('GLITCH CONFIRMED: User "admin" exists in EMAIL field but USERNAME field is empty.');
            console.log('Login logic in lib/auth.ts currently only looks at the USERNAME field.');
        }
    } catch (e) {
        console.error('Error connecting to DB:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdmin();
