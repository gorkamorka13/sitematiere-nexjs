// Script pour corriger les URLs relatives en URLs absolues
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function fixUrls() {
  const files = await prisma.file.findMany({
    where: {
      blobUrl: {
        startsWith: '/api/'
      }
    }
  });

  console.log(`Found ${files.length} files with relative URLs`);

  for (const file of files) {
    const newUrl = `${BASE_URL}${file.blobUrl}`;
    await prisma.file.update({
      where: { id: file.id },
      data: { blobUrl: newUrl }
    });
    console.log(`Updated: ${file.blobUrl} -> ${newUrl}`);
  }

  console.log('Done!');
}

fixUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
