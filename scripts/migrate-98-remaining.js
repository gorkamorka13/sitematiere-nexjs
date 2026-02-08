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

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images1');

async function migrateRemainingFiles() {
  console.log('🚀 Migration des 98 fichiers restants vers Cloudinary...\n');

  try {
    const blobFiles = await prisma.file.findMany({
      where: { blobUrl: { contains: 'blob.vercel-storage.com' } }
    });

    console.log(`📋 ${blobFiles.length} fichiers sur Vercel Blob à traiter.\n`);

    // Indexer les fichiers locaux
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
    if (fs.existsSync(IMAGES_DIR)) walkDir(IMAGES_DIR);

    let successCount = 0;
    let failCount = 0;

    for (const file of blobFiles) {
      const localPath = localFileIndex[file.name.toLowerCase()];
      if (localPath) {
        console.log(`Traitement : ${file.name}`);

        try {
          // Déterminer le dossier dans Cloudinary
          let folder = 'projects/unmapped';
          if (localPath.includes('flag')) folder = 'flags';
          else if (localPath.includes('client')) folder = 'clients';
          else {
            // Extraire le nom du dossier projet
            const parts = localPath.split(path.sep);
            const images1Index = parts.indexOf('images1');
            if (images1Index !== -1 && images1Index < parts.length - 2) {
              folder = `projects/${parts[images1Index + 1]}`;
            }
          }

          const publicId = `${path.parse(file.name).name}_${file.id}`;

          console.log(`  📤 Upload vers : sitematiere/${folder}/${publicId}`);

          const result = await cloudinary.uploader.upload(localPath, {
            folder: `sitematiere/${folder}`,
            public_id: publicId,
            resource_type: 'auto',
            overwrite: true,
          });

          console.log(`  ✅ Upload réussi : ${result.secure_url}`);

          // Mise à jour DB
          await prisma.file.update({
            where: { id: file.id },
            data: { blobUrl: result.secure_url }
          });
          console.log(`  ✅ Base de données mise à jour\n`);
          successCount++;

        } catch (uploadError) {
          console.error(`  ❌ Erreur upload/update : ${uploadError.message}\n`);
          failCount++;
        }
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`Migration terminée.`);
    console.log(`✅ Succès : ${successCount}`);
    console.log(`❌ Échecs : ${failCount}`);

  } catch (error) {
    console.error('Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateRemainingFiles();
