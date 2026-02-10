const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('Searching for documents related to Sierra Leone or SLRA...');

  const docs = await prisma.document.findMany({
    where: {
      OR: [
        { url: { contains: 'sierra' } },
        { url: { contains: 'slra' } },
        { name: { contains: 'sierra' } },
        { name: { contains: 'slra' } }
      ]
    },
    include: { project: { select: { name: true } } }
  });

  console.log(`Found ${docs.length} records:`);
  docs.forEach(d => {
    console.log(`- [${d.type}] Project: ${d.project.name}, URL: ${d.url}`);
  });
}

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
