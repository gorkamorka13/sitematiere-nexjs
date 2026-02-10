const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Revert Document URLs from Vercel Blob to local paths
 * This is necessary because Vercel Blob quota has been exceeded
 */
async function revertToLocal() {
  console.log('🔄 Reverting Document URLs to local paths...\n');

  try {
    // Get all documents with Blob URLs
    const documents = await prisma.document.findMany({
      where: {
        url: {
          contains: 'blob.vercel-storage.com'
        }
      },
      include: {
        project: {
          select: { name: true, country: true }
        }
      }
    });

    console.log(`📋 Found ${documents.length} documents with Blob URLs\n`);

    let successCount = 0;
    let failCount = 0;

    for (const doc of documents) {
      console.log(`Processing: ${doc.project.name} - ${doc.type}`);
      console.log(`  Current URL: ${doc.url}`);

      let localPath = '';

      // Determine local path based on document type
      if (doc.type === 'FLAG') {
        // Extract country name from project - match existing flag file naming
        const country = doc.project.country.toLowerCase()
          .replace(/côte d'ivoire/i, 'rci')
          .replace(/république démocratique du congo/i, 'rdc')
          .replace(/sierra-léone/i, 'sierra-leone')
          .replace(/[^a-z0-9-]/g, '');
        localPath = `images1/flag/flag${country}.png`;
      } else if (doc.type === 'CLIENT_LOGO') {
        // Use document name if it exists, otherwise generate from project
        if (doc.name && doc.name !== 'Logo client') {
          const logoName = doc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          localPath = `images1/client/${logoName}.jpg`;
        } else {
          const projectSlug = doc.project.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          localPath = `images1/client/${projectSlug}.jpg`;
        }
      } else if (doc.type === 'PLAN') {
        const projectSlug = doc.project.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        localPath = `images1/${projectSlug}/plan.pdf`;
      } else {
        localPath = doc.url; // Keep as-is for unknown types
      }

      console.log(`  New path: ${localPath}`);

      try {
        await prisma.document.update({
          where: { id: doc.id },
          data: { url: localPath }
        });
        console.log(`  ✅ Updated\n`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error updating: ${error.message}\n`);
        failCount++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`Reversion completed.`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);

  } catch (error) {
    console.error('Error during reversion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertToLocal();
