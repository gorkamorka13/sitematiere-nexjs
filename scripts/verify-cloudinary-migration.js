const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCloudinaryMigration() {
  console.log('🔍 Vérification de la migration Cloudinary...\n');

  try {
    // --- 1. DOCUMENTS (Flags, Logos, Plans) ---
    const cloudinaryDocs = await prisma.document.findMany({
      where: { url: { contains: 'cloudinary.com' } }
    });
    const localDocs = await prisma.document.findMany({
      where: { url: { startsWith: 'images1/' } }
    });
    const blobDocs = await prisma.document.findMany({
      where: { url: { contains: 'blob.vercel-storage.com' } }
    });

    // --- 2. FILES (Project Images) ---
    const cloudinaryFiles = await prisma.file.findMany({
      where: { blobUrl: { contains: 'cloudinary.com' } }
    });
    const blobFiles = await prisma.file.findMany({
      where: { blobUrl: { contains: 'blob.vercel-storage.com' } }
    });
    const localFiles = await prisma.file.findMany({
      where: {
        blobUrl: {
          not: null,
          not: { contains: 'http' }
        }
      }
    });

    console.log('📊 Statistiques de migration :');
    console.log('\n--- Documents (Drapeaux, Logos, Plans) ---');
    console.log(`  ✅ Cloudinary : ${cloudinaryDocs.length}`);
    console.log(`  📁 Local (images1/) : ${localDocs.length}`);
    console.log(`  ☁️  Vercel Blob : ${blobDocs.length}`);

    console.log('\n--- Files (Images Projets) ---');
    console.log(`  ✅ Cloudinary : ${cloudinaryFiles.length}`);
    console.log(`  ☁️  Vercel Blob : ${blobFiles.length}`);
    console.log(`  📁 Local : ${localFiles.length}`);
    console.log('');

    // Afficher quelques exemples Cloudinary
    if (cloudinaryDocs.length > 0) {
      console.log('📸 Exemples de Documents sur Cloudinary :');
      cloudinaryDocs.slice(0, 3).forEach(doc => {
        console.log(`  - ${doc.type}: ${doc.url}`);
      });
    }

    if (cloudinaryFiles.length > 0) {
      console.log('\n📸 Exemples de Files sur Cloudinary :');
      cloudinaryFiles.slice(0, 3).forEach(file => {
        console.log(`  - ${file.name}: ${file.blobUrl}`);
      });
    }

    // Vérifier l'accessibilité
    console.log('\n🌐 Test d\'accessibilité...');
    const testUrl = cloudinaryDocs[0]?.url || cloudinaryFiles[0]?.blobUrl;
    if (testUrl) {
      console.log(`  Testing: ${testUrl}`);
      try {
        const response = await fetch(testUrl);
        if (response.ok) {
          console.log(`  ✅ Accessible (${response.status} ${response.statusText})`);
        } else {
          console.log(`  ❌ Erreur (${response.status} ${response.statusText})`);
        }
      } catch (error) {
        console.log(`  ❌ Erreur: ${error.message}`);
      }
    } else {
      console.log('  ⚠️ Aucun fichier Cloudinary à tester.');
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCloudinaryMigration();
