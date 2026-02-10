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

/**
 * Scanner tous les fichiers dans public/images1/
 */
function scanLocalImages() {
  const images = [];
  const projectDirs = fs.readdirSync(IMAGES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .filter(dirent => !['flag', 'client', 'pin', 'videos'].includes(dirent.name)); // Skip déjà migrés

  for (const dir of projectDirs) {
    const projectPath = path.join(IMAGES_DIR, dir.name);
    const files = fs.readdirSync(projectPath, { withFileTypes: true })
      .filter(f => f.isFile())
      .filter(f => /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(f.name));

    files.forEach(file => {
      images.push({
        projectFolder: dir.name,
        fileName: file.name,
        fullPath: path.join(projectPath, file.name),
        relativePath: `images1/${dir.name}/${file.name}`
      });
    });
  }

  return images;
}

/**
 * Migrer les images de projets vers Cloudinary
 */
async function migrateProjectImages() {
  console.log('🚀 Migration des images de projets vers Cloudinary...\n');

  const localImages = scanLocalImages();
  console.log(`📋 ${localImages.length} images trouvées localement\n`);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const img of localImages) {
    console.log(`\nTraitement: ${img.projectFolder}/${img.fileName}`);

    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(img.fullPath)) {
        console.log(`  ⏭️  Fichier introuvable`);
        skippedCount++;
        continue;
      }

      // Déterminer le public_id
      const publicId = `${img.projectFolder}/${path.parse(img.fileName).name}`;

      console.log(`  📤 Upload vers: sitematiere/projects/${publicId}`);

      // Upload vers Cloudinary
      const result = await cloudinary.uploader.upload(img.fullPath, {
        folder: 'sitematiere/projects',
        public_id: publicId,
        resource_type: 'auto',
        overwrite: false,
      });

      console.log(`  ✅ Upload réussi: ${result.secure_url}`);

      // Chercher le fichier correspondant en DB par nom
      const file = await prisma.file.findFirst({
        where: {
          name: img.fileName
        }
      });

      if (file) {
        // Mettre à jour l'URL
        await prisma.file.update({
          where: { id: file.id },
          data: { blobUrl: result.secure_url }
        });
        console.log(`  ✅ Base de données mise à jour (File ID: ${file.id})`);
      } else {
        console.log(`  ⚠️  Pas de correspondance en DB`);
      }

      successCount++;

    } catch (error) {
      console.error(`  ❌ Erreur: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`Migration terminée.`);
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Échecs: ${failCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
}

migrateProjectImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
