const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('Fetching project Moyamba...');
  const project = await prisma.project.findFirst({
    where: { name: 'Moyamba' },
    include: { documents: true }
  });

  if (!project) {
    console.log('Project Moyamba not found');
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
