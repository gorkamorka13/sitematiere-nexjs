const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProjects() {
    try {
        const projects = await prisma.project.findMany({
            select: {
                name: true,
                country: true
            }
        });
        console.log(JSON.stringify(projects, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProjects();
