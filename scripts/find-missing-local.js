const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images1');

async function findLocalCounterparts() {
  console.log('🔍 Recherche de contreparties locales pour les fichiers Vercel Blob...\n');

  try {
    const blobFiles = await prisma.file.findMany({
      where: { blobUrl: { contains: 'blob.vercel-storage.com' } }
    });

    console.log(`📋 ${blobFiles.length} fichiers sur Vercel Blob à vérifier.\n`);

    // Scanner TOUS les fichiers locaux récursivement pour avoir un index par nom
    const localFileIndex = {};

    function walkDir(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          walkDir(path.join(dir, file.name));
        } else {
          localFileIndex[file.name.toLowerCase()] = path.join(dir, file.name);
        }
      }
    }

    if (fs.existsSync(IMAGES_DIR)) {
      walkDir(IMAGES_DIR);
    }

    let foundCount = 0;

    for (const file of blobFiles) {
      const localPath = localFileIndex[file.name.toLowerCase()];
      if (localPath) {
        console.log(`📍 Trouvé localement : ${file.name}`);
        console.log(`   Chemin : ${localPath}`);
        foundCount++;
      }
    }

    console.log(`\n📊 Résultat : ${foundCount}/${blobFiles.length} fichiers trouvés localement.`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findLocalCounterparts();
