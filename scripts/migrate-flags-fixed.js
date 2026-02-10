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

const FLAG_DIR = path.join(process.cwd(), 'public', 'images1', 'flag');

async function migrateFlagsImproved() {
  console.log('🏁 Migration améliorée des drapeaux vers Cloudinary...\n');

  try {
    // 1. Lister les fichiers sur le disque pour le mapping fuzzy
    const filesOnDisk = fs.readdirSync(FLAG_DIR).filter(f => f.endsWith('.png'));
    console.log(`📁 ${filesOnDisk.length} fichiers trouvés dans public/images1/flag/`);

    const flags = await prisma.document.findMany({
      where: { type: 'FLAG' },
      include: {
        project: { select: { name: true, country: true } }
      }
    });

    console.log(`📋 ${flags.length} entrées "FLAG" en base de données.\n`);

    let successCount = 0;
    let failCount = 0;

    for (const flag of flags) {
      const countryNormalized = flag.project.country.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/côte d'ivoire/i, 'rci')
        .replace(/république démocratique du congo/i, 'rdc')
        .replace(/sierra-léone/i, 'sierra-leone')
        .replace(/[^a-z0-9]/g, '');

      // Tenter de trouver le fichier correspondant sur le disque
      let localFile = null;

      // Chemin direct (si exact)
      const directPath = path.join(process.cwd(), 'public', flag.url);
      if (fs.existsSync(directPath)) {
        localFile = directPath;
      } else {
        // Tentative par normalisation du nom du pays
        const matchingFile = filesOnDisk.find(f => {
          const fNorm = f.toLowerCase().replace(/[^a-z0-9]/g, '').replace('flag', '');
          return fNorm === countryNormalized || countryNormalized.includes(fNorm) || fNorm.includes(countryNormalized);
        });

        if (matchingFile) {
          localFile = path.join(FLAG_DIR, matchingFile);
          console.log(`  🔍 Mapping trouvé pour "${flag.project.country}": ${matchingFile}`);
        }
      }

      if (!localFile) {
        // Cas spéciaux connus
        if (flag.project.country.includes('Maroc')) localFile = path.join(FLAG_DIR, 'flagmaroc.png');
        else if (flag.project.country.includes('Libéria')) localFile = path.join(FLAG_DIR, 'flagliberia.png');
        else if (flag.project.country.includes('Sénégal')) localFile = path.join(FLAG_DIR, 'flagsenegal.png');
        else if (flag.project.country.includes('Soudan')) localFile = path.join(FLAG_DIR, 'flagsoudan.png');
        else if (flag.project.country.includes('Fidji')) localFile = path.join(FLAG_DIR, 'flagfidji.png');
        else if (flag.project.country.includes('Haïti')) localFile = path.join(FLAG_DIR, 'flaghaiti.png');
      }

      if (localFile && fs.existsSync(localFile)) {
        const publicId = `flag_${countryNormalized}`;
        try {
          console.log(`  📤 Upload: ${flag.project.country} -> sitematiere/flags/${publicId}`);

          const result = await cloudinary.uploader.upload(localFile, {
            folder: 'sitematiere/flags',
            public_id: publicId,
            resource_type: 'image',
            overwrite: true
          });

          await prisma.document.update({
            where: { id: flag.id },
            data: { url: result.secure_url }
          });

          console.log(`  ✅ Succès: ${result.secure_url}\n`);
          successCount++;
        } catch (err) {
          console.error(`  ❌ Erreur upload: ${err.message}\n`);
          failCount++;
        }
      } else {
        console.warn(`  ⚠️  Impossible de trouver un drapeau pour "${flag.project.country}" (URL: ${flag.url})\n`);
        failCount++;
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

migrateFlagsImproved();
