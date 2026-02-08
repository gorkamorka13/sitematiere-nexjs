const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('Checking Image table...');
  const images = await prisma.image.findMany({
    take: 20
  });

  console.log(`Found ${images.length} images.`);
  images.forEach(img => {
    console.log(`- ID: ${img.id}, URL: ${img.url}, ProjectId: ${img.projectId}`);
  });
}

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
