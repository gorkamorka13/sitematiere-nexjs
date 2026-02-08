const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

/**
 * Scan all files in public/images/
 */
function scanLocalImages() {
  const images = [];
  if (!fs.existsSync(IMAGES_DIR)) return images;

  function walk(dir) {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (/\.(jpg|jpeg|png|gif|webp|pdf|mp4)$/i.test(item.name)) {
        // Extraire le dossier parent (nom du projet ou type)
        const relativePath = path.relative(IMAGES_DIR, fullPath);
        const folderName = path.dirname(relativePath);

        images.push({
          folder: folderName === '.' ? 'unmapped' : folderName,
          fileName: item.name,
          fullPath: fullPath,
          relativePath: `images/${relativePath}`
        });
      }
    }
  }

  walk(IMAGES_DIR);
  return images;
}

async function migrate() {
  console.log('🚀 Reprise de la migration avec le dossier public/images...\n');

  const localImages = scanLocalImages();
  console.log(`📋 ${localImages.length} fichiers trouvés dans public/images\n`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const img of localImages) {
    console.log(`\nTraitement : ${img.folder}/${img.fileName}`);

    try {
      // 1. Vérifier les doublons dans la DB
      const existingInFiles = await prisma.file.findFirst({
        where: {
          name: img.fileName,
          blobUrl: { contains: 'cloudinary.com' }
        }
      });

      const existingInDocs = await prisma.document.findFirst({
        where: {
          OR: [
            { url: { contains: img.fileName } },
            { url: { contains: 'cloudinary.com' } }
          ],
          url: { contains: 'cloudinary.com' }
        }
      });

      // Si le nom du fichier est déjà associé à une URL Cloudinary, on skip
      if (existingInFiles || (existingInDocs && existingInDocs.url.includes(path.parse(img.fileName).name))) {
        console.log(`  ⏭️  Déjà migré (trouvé dans la DB)`);
        skipCount++;
        continue;
      }

      // 2. Déterminer le dossier Cloudinary
      let cloudFolder = 'sitematiere';
      if (['flag', 'client'].includes(img.folder)) {
        cloudFolder += `/${img.folder === 'flag' ? 'flags' : 'clients'}`;
      } else {
        cloudFolder += `/projects/${img.folder}`;
      }

      // ID Public pour éviter les collisions (nom_fichier + hash ou ID si possible, mais ici on va rester cohérent)
      const publicId = path.parse(img.fileName).name;

      console.log(`  📤 Upload vers : ${cloudFolder}/${publicId}`);

      const result = await cloudinary.uploader.upload(img.fullPath, {
        folder: cloudFolder,
        public_id: publicId,
        resource_type: 'auto',
        overwrite: false, // Évite d'écraser si déjà là
      });

      console.log(`  ✅ Upload réussi : ${result.secure_url}`);

      // 3. Mettre à jour la DB
      // Chercher par nom dans File
      const fileRecord = await prisma.file.findFirst({
        where: { name: img.fileName }
      });
      if (fileRecord) {
        await prisma.file.update({
          where: { id: fileRecord.id },
          data: { blobUrl: result.secure_url }
        });
        console.log(`  ✅ File DB mis à jour`);
      }

      // Chercher par nom dans Document (approximatif pour les flags/logos)
      const fileNameNoExt = path.parse(img.fileName).name;
      const docRecords = await prisma.document.findMany({
        where: {
          OR: [
            { url: { contains: img.fileName } },
            { url: { contains: fileNameNoExt } }
          ]
        }
      });

      for (const doc of docRecords) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { url: result.secure_url }
        });
        console.log(`  ✅ Document DB mis à jour (${doc.type})`);
      }

      successCount++;

    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ⏭️  Doublon sur Cloudinary`);
        skipCount++;
      } else {
        console.error(`  ❌ Erreur : ${error.message}`);
        failCount++;
      }
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`Migration terminée.`);
  console.log(`✅ Succès : ${successCount}`);
  console.log(`⏭️  Skip (doublons) : ${skipCount}`);
  console.log(`❌ Échecs : ${failCount}`);
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
