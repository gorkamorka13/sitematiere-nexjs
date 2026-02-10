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

const IMAGES1_DIR = path.join(process.cwd(), 'public', 'images1');

async function migrateEverythingLeftOptimized() {
  console.log('🚀 Migration FINALE OPTIMISÉE...\n');

  try {
    // 1. Lister les fichiers physiques
    const filesOnDisk = [];
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of list) {
        if (item.isDirectory()) walk(path.join(dir, item.name));
        else filesOnDisk.push(path.join(dir, item.name));
      }
    }
    walk(IMAGES1_DIR);
    console.log(`📁 ${filesOnDisk.length} fichiers physiques trouvés.\n`);

    // 2. Fetch documents (sans include pour la vitesse)
    const documents = await prisma.document.findMany({
      where: { url: { startsWith: 'images1/' } }
    });

    console.log(`📋 ${documents.length} documents locaux identifiés.\n`);

    let successCount = 0;
    let failCount = 0;

    for (const doc of documents) {
      try {
        let localPath = path.join(process.cwd(), 'public', doc.url);

        if (!fs.existsSync(localPath)) {
          console.log(`  🔍 Fuzzy mapping: ${doc.url}`);
          const fileName = path.basename(doc.url).toLowerCase();
          const match = filesOnDisk.find(f => path.basename(f).toLowerCase() === fileName);
          if (match) {
            localPath = match;
            console.log(`    ✅ Match: ${match}`);
          }
        }

        if (fs.existsSync(localPath)) {
          // Fetch project info separately only when needed
          const project = await prisma.project.findUnique({
            where: { id: doc.projectId },
            select: { name: true, country: true }
          });

          let folder = 'other';
          let publicId = `${path.parse(localPath).name}_${doc.id}`;

          if (doc.type === 'FLAG') {
            folder = 'flags';
            publicId = `flag_${(project?.country || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          } else if (doc.type === 'CLIENT_LOGO') {
            folder = 'clients';
            publicId = `client_${(project?.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          }

          console.log(`  📤 Upload: ${doc.url} -> sitematiere/${folder}/${publicId}`);

          const result = await cloudinary.uploader.upload(localPath, {
            folder: `sitematiere/${folder}`,
            public_id: publicId,
            resource_type: 'auto',
            overwrite: true
          });

          await prisma.document.update({
            where: { id: doc.id },
            data: { url: result.secure_url }
          });

          console.log(`    ✅ OK: ${result.secure_url}`);
          successCount++;
        } else {
          console.warn(`  ⚠️  Fichier introuvable pour: ${doc.url}`);
          failCount++;
        }
      } catch (err) {
        console.error(`  ❌ Erreur item ${doc.id}: ${err.message}`);
        failCount++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`Migration terminée.`);
    console.log(`✅ Succès : ${successCount}`);
    console.log(`❌ Échecs : ${failCount}`);

  } catch (error) {
    console.error('Erreur fatale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateEverythingLeftOptimized();
