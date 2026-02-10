const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('Searching for FILE records related to Sewa...');
  const project = await prisma.project.findFirst({ where: { name: 'Sewa' } });

  if (!project) {
    console.log('Project Sewa not found');
    return;
  }

  const files = await prisma.file.findMany({
    where: { projectId: project.id }
  });

  console.log(`Found ${files.length} files for Sewa:`);
  files.forEach(f => {
    console.log(`- [${f.fileType}] ${f.name} (URL: ${f.blobUrl})`);
  });
}

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
