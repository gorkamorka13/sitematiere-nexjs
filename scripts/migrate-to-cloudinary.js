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

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary credentials manquants dans .env');
  console.error('Requis: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  process.exit(1);
}

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images1');

/**
 * Upload un fichier vers Cloudinary
 */
async function uploadToCloudinary(filePath, folder, publicId) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `sitematiere/${folder}`,
      public_id: publicId,
      resource_type: 'auto', // Détecte automatiquement: image, video, raw (PDF)
      overwrite: false,
    });

    return result.secure_url;
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Migrer les documents (FLAGS, CLIENT_LOGO, PLAN)
 */
async function migrateDocuments() {
  console.log('🚀 Migration des Documents vers Cloudinary...\n');

  const documents = await prisma.document.findMany({
    where: {
      url: {
        startsWith: 'images1/'
      }
    },
    include: {
      project: {
        select: { name: true, country: true }
      }
    }
  });

  console.log(`📋 ${documents.length} documents à migrer\n`);

  let successCount = 0;
  let failCount = 0;

  for (const doc of documents) {
    console.log(`\nTraitement: ${doc.project.name} - ${doc.type}`);
    console.log(`  URL actuelle: ${doc.url}`);

    // Construire le chemin complet du fichier local
    const localPath = path.join(process.cwd(), 'public', doc.url);

    if (!fs.existsSync(localPath)) {
      console.error(`  ❌ Fichier introuvable: ${localPath}`);
      failCount++;
      continue;
    }

    try {
      let folder = '';
      let publicId = '';

      // Déterminer le dossier et l'ID public selon le type
      if (doc.type === 'FLAG') {
        folder = 'flags';
        const country = doc.project.country.toLowerCase()
          .replace(/côte d'ivoire/i, 'rci')
          .replace(/république démocratique du congo/i, 'rdc')
          .replace(/sierra-léone/i, 'sierra-leone')
          .replace(/[^a-z0-9-]/g, '');
        publicId = `flag${country}`;
      } else if (doc.type === 'CLIENT_LOGO') {
        folder = 'clients';
        const projectSlug = doc.project.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        publicId = projectSlug;
      } else if (doc.type === 'PLAN') {
        folder = 'plans';
        const projectSlug = doc.project.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        publicId = `${projectSlug}-plan`;
      } else {
        folder = 'other';
        publicId = doc.id;
      }

      console.log(`  📤 Upload vers: sitematiere/${folder}/${publicId}`);

      const cloudinaryUrl = await uploadToCloudinary(localPath, folder, publicId);

      console.log(`  ✅ Upload réussi: ${cloudinaryUrl}`);

      // Mettre à jour la base de données
      await prisma.document.update({
        where: { id: doc.id },
        data: { url: cloudinaryUrl }
      });

      console.log(`  ✅ Base de données mise à jour`);
      successCount++;

    } catch (error) {
      console.error(`  ❌ Erreur: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`Migration Documents terminée.`);
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Échecs: ${failCount}`);
}

/**
 * Migrer les fichiers (images projets)
 */
async function migrateFiles() {
  console.log('\n🚀 Migration des Files vers Cloudinary...\n');

  const files = await prisma.file.findMany({
    where: {
      blobUrl: {
        contains: 'blob.vercel-storage.com'
      }
    },
    include: {
      project: {
        select: { name: true }
      }
    }
  });

  console.log(`📋 ${files.length} fichiers à migrer\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    console.log(`\nTraitement: ${file.project?.name || 'Sans projet'} - ${file.name}`);

    // Pour les fichiers, on doit les télécharger depuis Blob d'abord
    // Mais comme Blob est saturé, on va skip pour l'instant
    console.log(`  ⏭️  Skipped (Blob inaccessible)`);
    failCount++;
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`Migration Files terminée.`);
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Échecs: ${failCount}`);
}

async function main() {
  try {
    await migrateDocuments();
    // await migrateFiles(); // Décommenter si besoin
  } catch (error) {
    console.error('Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
