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

async function migrateFlagsResilient() {
  console.log('🏁 Migration résiliente des drapeaux vers Cloudinary...\n');

  try {
    if (!fs.existsSync(FLAG_DIR)) {
      console.error(`❌ Dossier des drapeaux introuvable: ${FLAG_DIR}`);
      return;
    }

    const filesOnDisk = fs.readdirSync(FLAG_DIR).filter(f => f.toLowerCase().endsWith('.png'));
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
      try {
        const countryRaw = flag.project?.country || 'Inconnu';
        const countryNormalized = countryRaw.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/côte d'ivoire/i, 'rci')
          .replace(/république démocratique du congo/i, 'rdc')
          .replace(/sierra-léone/i, 'sierra-leone')
          .replace(/[^a-z0-9]/g, '');

        let localFile = null;

        // 1. Check direct path
        if (flag.url) {
          const directPath = path.join(process.cwd(), 'public', flag.url);
          if (fs.existsSync(directPath)) {
            localFile = directPath;
          }
        }

        // 2. Fuzzy match if not found
        if (!localFile) {
          const matchingFile = filesOnDisk.find(f => {
            const fNorm = f.toLowerCase().replace(/[^a-z0-9]/g, '').replace('flag', '');
            return fNorm === countryNormalized || countryNormalized.includes(fNorm) || (fNorm.length > 3 && countryNormalized.includes(fNorm));
          });

          if (matchingFile) {
            localFile = path.join(FLAG_DIR, matchingFile);
          }
        }

        // 3. Fallbacks
        if (!localFile) {
          if (countryRaw.includes('Maroc')) localFile = path.join(FLAG_DIR, 'flagmaroc.png');
          else if (countryRaw.includes('Libéria')) localFile = path.join(FLAG_DIR, 'flagliberia.png');
          else if (countryRaw.includes('Sénégal')) localFile = path.join(FLAG_DIR, 'flagsenegal.png');
          else if (countryRaw.includes('Soudan')) localFile = path.join(FLAG_DIR, 'flagsoudan.png');
          else if (countryRaw.includes('Fidji')) localFile = path.join(FLAG_DIR, 'flagfidji.png');
          else if (countryRaw.includes('Haïti')) localFile = path.join(FLAG_DIR, 'flaghaiti.png');
          else if (countryRaw.includes('RDC')) localFile = path.join(FLAG_DIR, 'flagrdc.png');
        }

        if (localFile && fs.existsSync(localFile)) {
          const publicId = `flag_${countryNormalized}`;
          console.log(`  📤 Upload [${countryRaw}] (${path.basename(localFile)})`);

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

          console.log(`    ✅ OK: ${result.secure_url}`);
          successCount++;
        } else {
          console.warn(`  ⚠️  Drapeau non trouvé pour "${countryRaw}" (URL: ${flag.url})`);
          failCount++;
        }
      } catch (loopError) {
        console.error(`  ❌ Erreur sur item ${flag.id}: ${loopError.message}`);
        failCount++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`Migration terminée.`);
    console.log(`✅ Succès : ${successCount}`);
    console.log(`❌ Échecs : ${failCount}`);

  } catch (error) {
    console.error('Erreur générale fatale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateFlagsResilient();
