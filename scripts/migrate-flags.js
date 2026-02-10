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

async function migrateFlags() {
  console.log('🏁 Migration des 33 drapeaux vers Cloudinary...\n');

  try {
    const flags = await prisma.document.findMany({
      where: {
        type: 'FLAG',
        url: { startsWith: 'images1/flag/' }
      },
      include: {
        project: { select: { name: true, country: true } }
      }
    });

    console.log(`📋 ${flags.length} drapeaux identifiés en DB.\n`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const flag of flags) {
      const localPath = path.join(process.cwd(), 'public', flag.url);

      if (!fs.existsSync(localPath)) {
        console.warn(`  ⚠️  Fichier introuvable localement: ${localPath}`);
        failCount++;
        continue;
      }

      // Générer l'ID public basé sur le pays
      const countryCode = flag.project.country.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlever accents
        .replace(/côte d'ivoire/i, 'rci')
        .replace(/république démocratique du congo/i, 'rdc')
        .replace(/sierra-léone/i, 'sierra-leone')
        .replace(/[^a-z0-9]/g, '');

      const publicId = `flag_${countryCode}`;

      try {
        console.log(`  📤 Upload: ${flag.project.country} -> sitematiere/flags/${publicId}`);

        const result = await cloudinary.uploader.upload(localPath, {
          folder: 'sitematiere/flags',
          public_id: publicId,
          resource_type: 'image',
          overwrite: true
        });

        console.log(`  ✅ URL: ${result.secure_url}`);

        // Mise à jour DB
        await prisma.document.update({
          where: { id: flag.id },
          data: { url: result.secure_url }
        });

        console.log(`  ✅ DB mise à jour.\n`);
        successCount++;
      } catch (uploadError) {
        console.error(`  ❌ Erreur upload: ${uploadError.message}`);
        failCount++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`Migration des drapeaux terminée.`);
    console.log(`✅ Succès : ${successCount}`);
    console.log(`⏭️  Skippés : ${skipCount}`);
    console.log(`❌ Échecs : ${failCount}`);

  } catch (error) {
    console.error('Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateFlags();
