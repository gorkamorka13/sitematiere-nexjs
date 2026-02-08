const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const docs = await prisma.document.findMany({
    take: 5,
    where: {
      url: { startsWith: 'https://' }
    },
    include: { project: { select: { name: true } } }
  });

  console.log('--- Verification Samples ---');
  docs.forEach(doc => {
    console.log(`[${doc.type}] ${doc.project.name}: ${doc.url}`);
  });

  const remainingLocal = await prisma.document.count({
    where: {
      NOT: { url: { startsWith: 'http' } }
    }
  });

  console.log(`\nRemaining local files: ${remainingLocal}`);
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
