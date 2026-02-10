// Script pour mettre à jour les URLs pour la production
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OLD_URL = 'http://localhost:3000';
const NEW_URL = 'https://sitematiere-nexjs.pages.dev';

async function updateUrlsForProduction() {
  const files = await prisma.file.findMany({
    where: {
      blobUrl: {
        startsWith: OLD_URL
      }
    }
  });

  console.log(`Found ${files.length} files to update for production`);

  for (const file of files) {
    const newUrl = file.blobUrl.replace(OLD_URL, NEW_URL);
    await prisma.file.update({
      where: { id: file.id },
      data: { blobUrl: newUrl }
    });
    console.log(`Updated: ${file.blobUrl.substring(0, 50)}... -> ${newUrl.substring(0, 50)}...`);
  }

  console.log('Done! URLs updated for production.');
}

updateUrlsForProduction()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
