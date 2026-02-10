const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('Fetching project Sewa...');
  const project = await prisma.project.findFirst({
    where: { name: 'Sewa' },
    include: { documents: true }
  });

  if (!project) {
    console.log('Project Sewa not found');
    return;
  }

  console.log(`Project: ${project.name} (${project.id})`);
  console.log('Documents:');
  project.documents.forEach(doc => {
    console.log(`- [${doc.type}] ${doc.name}: ${doc.url}`);
  });
}

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
