const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSewa() {
  const sewa = await prisma.project.findFirst({
    where: { name: 'Sewa' },
    include: {
      documents: true,
      images: true,
      files: true
    }
  });

  if (!sewa) {
    console.log('Sewa project not found');
    return;
  }

  console.log('\n=== SEWA PROJECT DEBUG ===\n');
  console.log(`Project ID: ${sewa.id}`);
  console.log(`Name: ${sewa.name}`);
  console.log(`Country: ${sewa.country}\n`);

  console.log('DOCUMENTS:');
  sewa.documents.forEach(doc => {
    console.log(`  [${doc.type}] ${doc.name}`);
    console.log(`    URL: ${doc.url}`);
    console.log(`    ID: ${doc.id}\n`);
  });

  console.log('IMAGES (legacy table):');
  if (sewa.images.length === 0) {
    console.log('  (none)\n');
  } else {
    sewa.images.forEach(img => {
      console.log(`  ${img.url}`);
      console.log(`    ID: ${img.id}\n`);
    });
  }

  console.log('FILES (migrated):');
  if (sewa.files.length === 0) {
    console.log('  (none)\n');
  } else {
    sewa.files.forEach(file => {
      console.log(`  [${file.fileType}] ${file.name}`);
      console.log(`    URL: ${file.blobUrl}\n`);
    });
  }
}

debugSewa()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
