const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const files = await prisma.file.findMany({
      take: 5,
      where: { isDeleted: false },
      select: { name: true, blobUrl: true }
    });

    console.log('--- Verification of Vercel Blob URLs ---');
    if (files.length === 0) {
      console.log('No files found in the database.');
    } else {
      files.forEach(f => {
        console.log(`File: ${f.name}`);
        console.log(`URL:  ${f.blobUrl}`);
        console.log(`Is Blob URL? ${f.blobUrl.startsWith('https://') && f.blobUrl.includes('vercel-storage.com')}`);
        console.log('---');
      });
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
