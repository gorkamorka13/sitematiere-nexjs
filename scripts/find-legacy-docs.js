const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findLegacy() {
  console.log('Searching for documents with legacy paths...');

  const legacyDocs = await prisma.document.findMany({
    where: {
      url: {
        contains: 'images/'
      }
    },
    include: {
      project: {
        select: { name: true, country: true }
      }
    }
  });

  if (legacyDocs.length > 0) {
    console.log(`\nFOUND ${legacyDocs.length} DOCUMENTS WITH LEGACY PATHS:\n`);
    legacyDocs.forEach(doc => {
      console.log(`Project: ${doc.project.name} (${doc.project.country})`);
      console.log(`  Type: ${doc.type}`);
      console.log(`  Name: ${doc.name}`);
      console.log(`  URL: ${doc.url}`);
      console.log(`  ID: ${doc.id}\n`);
    });
  } else {
    console.log('No legacy document paths found.');
  }
}

findLegacy()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
