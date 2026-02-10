const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUrls() {
  console.log('Checking for File records with non-http URLs...');
  const files = await prisma.file.findMany({
    where: {
      NOT: {
        blobUrl: {
          startsWith: 'http'
        }
      }
    }
  });

  if (files.length > 0) {
    console.log(`Found ${files.length} files with local paths:`);
    files.forEach(f => {
      console.log(`- ID: ${f.id}, Name: ${f.name}, URL: ${f.blobUrl}, ProjectId: ${f.projectId}`);
    });
  } else {
    console.log('All File records have http URLs.');
  }

  console.log('Checking for Document records with non-http URLs...');
  const docs = await prisma.document.findMany({
    where: {
      NOT: {
        url: {
          startsWith: 'http'
        }
      }
    }
  });

  if (docs.length > 0) {
      console.log(`Found ${docs.length} documents with local paths:`);
      docs.forEach(d => {
          console.log(`- ID: ${d.id}, Name: ${d.name}, Type: ${d.type}, URL: ${d.url}`);
      });
  } else {
      console.log('All Document records have http URLs.');
  }
}

checkUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
