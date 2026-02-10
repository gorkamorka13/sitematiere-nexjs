const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.document.findMany({
    where: { type: 'CLIENT_LOGO' },
    select: { url: true, project: { select: { name: true, country: true } } }
  });
  docs.forEach(d => console.log(`${d.project.name} (${d.project.country}) -> ${d.url}`));
}

main().finally(() => prisma.$disconnect());
