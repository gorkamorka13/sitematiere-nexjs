const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeRemainingFiles() {
  console.log('🔍 Analyse des fichiers restants à migrer...\n');

  try {
    // 1. Documents locaux (images1/)
    const localDocs = await prisma.document.findMany({
      where: {
        url: {
          startsWith: 'images1/'
        }
      },
      include: {
        project: {
          select: { name: true }
        }
      }
    });

    console.log(`📁 Documents locaux (images1/): ${localDocs.length}`);

    // Grouper par type
    const docsByType = {};
    localDocs.forEach(doc => {
      docsByType[doc.type] = (docsByType[doc.type] || 0) + 1;
    });

    console.log('  Par type:');
    Object.entries(docsByType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });

    // 2. Fichiers (table File) - images projets
    const files = await prisma.file.findMany({
      include: {
        project: {
          select: { name: true }
        }
      }
    });

    console.log(`\n📸 Fichiers (table File): ${files.length}`);

    // Grouper par type de stockage
    const cloudinaryFiles = files.filter(f => f.blobUrl?.includes('cloudinary.com'));
    const blobFiles = files.filter(f => f.blobUrl?.includes('blob.vercel-storage.com'));
    const localFiles = files.filter(f => f.blobUrl && !f.blobUrl.includes('http'));
    const otherFiles = files.filter(f => !cloudinaryFiles.includes(f) && !blobFiles.includes(f) && !localFiles.includes(f));

    console.log('  Par stockage:');
    console.log(`    - Cloudinary: ${cloudinaryFiles.length}`);
    console.log(`    - Vercel Blob: ${blobFiles.length} ⚠️`);
    console.log(`    - Local: ${localFiles.length}`);
    console.log(`    - Autre: ${otherFiles.length}`);

    // 3. Afficher quelques exemples de fichiers Blob
    if (blobFiles.length > 0) {
      console.log('\n⚠️  Fichiers encore sur Vercel Blob (inaccessibles):');
      blobFiles.slice(0, 5).forEach(f => {
        console.log(`  - ${f.project?.name || 'Sans projet'}: ${f.name}`);
        console.log(`    ${f.blobUrl}`);
      });
      if (blobFiles.length > 5) {
        console.log(`  ... et ${blobFiles.length - 5} autres`);
      }
    }

    // 4. Résumé
    console.log('\n═══════════════════════════════════════');
    console.log('📊 Résumé:');
    console.log(`  Documents à migrer: ${localDocs.length} (mais fichiers manquants)`);
    console.log(`  Fichiers Blob inaccessibles: ${blobFiles.length}`);
    console.log(`  Total restant: ${localDocs.length + blobFiles.length}`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRemainingFiles();
