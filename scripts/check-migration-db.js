const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const fileCount = await prisma.file.count();
    const imageCount = await prisma.image.count();
    const documentCount = await prisma.document.count();

    console.log('--- Database Stats ---');
    console.log('File (new table) count:', fileCount);
    console.log('Image (old table) count:', imageCount);
    console.log('Document (old table) count:', documentCount);

    if (fileCount > 0) {
      const firstFiles = await prisma.file.findMany({ take: 5 });
      console.log('\n--- Sample File Entries ---');
      console.log(JSON.stringify(firstFiles, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
