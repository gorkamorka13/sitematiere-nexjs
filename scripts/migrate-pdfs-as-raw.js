const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Configuration Cloudinary
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function migratePdfsAsRaw() {
  console.log('🏁 Correction de la migration des PDFs (Conversion image -> raw)...\n');

  try {
    // 1. Identifier les PDFs dans la table File (Project images/files)
    const files = await prisma.file.findMany({
      where: {
        name: { endsWith: '.pdf', mode: 'insensitive' }
      },
      include: { project: { select: { name: true } } }
    });

    console.log(`📋 ${files.length} fichiers PDF trouvés dans la table File.`);

    for (const file of files) {
      if (file.blobUrl && file.blobUrl.includes('/raw/upload/')) {
        console.log(`  ⏭️  Déjà en RAW: ${file.name}`);
        continue;
      }

      // Tenter de trouver le fichier local
      const projectSlug = file.project?.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const localPath = path.join(process.cwd(), 'public', 'images1', projectSlug || '', file.name);

      if (fs.existsSync(localPath)) {
        console.log(`  📤 Re-uploading as RAW: ${file.name} (${file.project?.name})`);
        try {
          const result = await cloudinary.uploader.upload(localPath, {
            folder: `sitematiere/projects/${projectSlug}`,
            public_id: path.parse(file.name).name,
            resource_type: 'raw',
            overwrite: true
          });

          await prisma.file.update({
            where: { id: file.id },
            data: { blobUrl: result.secure_url }
          });
          console.log(`    ✅ Success: ${result.secure_url}`);
        } catch (e) {
          console.error(`    ❌ Erreur upload: ${e.message}`);
        }
      } else {
        console.warn(`  ⚠️  Fichier local introuvable: ${localPath}`);
      }
    }

    // 2. Identifier les PDFs dans la table Document (Plans)
    const docs = await prisma.document.findMany({
      where: {
        type: 'PLAN',
        url: { not: { contains: '/raw/upload/' } }
      },
      include: { project: { select: { name: true } } }
    });

    console.log(`\n📋 ${docs.length} documents PLAN trouvés.`);

    for (const doc of docs) {
       // Déterminer le chemin local
       let localPath = path.join(process.cwd(), 'public', doc.url);
       if (!fs.existsSync(localPath)) {
          // Re-test fuzzy? Non, on a déjà nettoyé les manquants normally.
          console.warn(`  ⚠️  Plan introuvable: ${doc.url}`);
          continue;
       }

       const projectSlug = doc.project?.name.toLowerCase().replace(/[^a-z0-9]/g, '');
       console.log(`  📤 Re-uploading PLAN as RAW: ${doc.name} (${doc.project?.name})`);

       try {
          const result = await cloudinary.uploader.upload(localPath, {
            folder: `sitematiere/plans`,
            public_id: `${projectSlug}-plan`,
            resource_type: 'raw',
            overwrite: true
          });

          await prisma.document.update({
            where: { id: doc.id },
            data: { url: result.secure_url }
          });
          console.log(`    ✅ Success: ${result.secure_url}`);
       } catch (e) {
         console.error(`    ❌ Erreur upload: ${e.message}`);
       }
    }

  } catch (error) {
    console.error('Erreur fatale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migratePdfsAsRaw();
