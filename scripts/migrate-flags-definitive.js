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

const MAPPING = {
  'algerie': 'flagalgerie.png',
  'angola': 'flagangola.png',
  'australie': 'flagaustralie.png',
  'bahamas': 'flagbahamas.png',
  'benin': 'flagbenin.png',
  'bnin': 'flagbenin.png',
  'burkina': 'flagburkina.png',
  'burkina-fasso': 'flagburkina.png',
  'colombie': 'flagcolombie.png',
  'congo': 'flagcongo.png',
  'ecosse': 'flagecosse.png',
  'equateur': 'flagequateur.png',
  'ethiopie': 'flagethiopie.png',
  'fidji': 'flagfidji.png',
  'haiti': 'flaghaiti.png',
  'hati': 'flaghaiti.png',
  'indonesie': 'flagindonesie.png',
  'indonsie': 'flagindonesie.png',
  'irak': 'flagirak.png',
  'kenya': 'flagkenya.png',
  'liberia': 'flagliberia.png',
  'libria': 'flagliberia.png',
  'luxembourg': 'flagluxembourg.png',
  'madagascar': 'flagmadagascar.png',
  'mali': 'flagmali.png',
  'maroc': 'flagmaroc.png',
  'niger': 'flagniger.png',
  'panama': 'flagpanama.png',
  'philippines': 'flagphilippines.png',
  'rci': 'flagrci.png',
  'rdc': 'flagrdc.png',
  'rwanda': 'flagrwanda.png',
  'samoa': 'flagsamoa.png',
  'senegal': 'flagsenegal.png',
  'sngal': 'flagsenegal.png',
  'sierra-leone': 'flagsierra-leone.png',
  'soudan': 'flagsoudan.png',
  'suede': 'flagsuede.png',
  'sude': 'flagsuede.png',
  'uk': 'flagUK.png'
};

async function migrateFlagsFinal() {
  console.log('🏁 Migration DEFINITIVE des drapeaux...\n');

  try {
    const flags = await prisma.document.findMany({
      where: {
        type: 'FLAG',
        NOT: { url: { contains: 'cloudinary.com' } }
      },
      include: { project: { select: { country: true } } }
    });

    console.log(`📋 ${flags.length} entrées "FLAG" locales à traiter.\n`);

    let successCount = 0;
    let failCount = 0;

    for (const flag of flags) {
      try {
        const country = (flag.project?.country || '').toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9-]/g, '');

        // Trouver le fichier via le mapping
        let fileName = MAPPING[country];
        if (!fileName) {
          // Essai par extraction du nom de fichier dans l'URL actuelle
          const urlFile = path.basename(flag.url).toLowerCase().replace('.png', '');
          fileName = MAPPING[urlFile] || MAPPING[urlFile.replace('flag', '')];
        }

        if (fileName) {
          const localPath = path.join(FLAG_DIR, fileName);
          if (fs.existsSync(localPath)) {
            const countrySlug = country.replace(/[^a-z0-9]/g, '') || path.parse(fileName).name;
            const publicId = `flag_${countrySlug}`;

            console.log(`  📤 Upload: ${flag.project?.country || '?'} (${fileName})`);

            const result = await cloudinary.uploader.upload(localPath, {
              folder: 'sitematiere/flags',
              public_id: publicId,
              resource_type: 'image',
              overwrite: true
            });

            await prisma.document.update({
              where: { id: flag.id },
              data: { url: result.secure_url }
            });

            console.log(`    ✅ Success: ${result.secure_url}`);
            successCount++;
          } else {
            console.warn(`  ⚠️  Fichier ${fileName} non trouvé sur disque pour ${flag.project?.country}`);
            failCount++;
          }
        } else {
          console.warn(`  ⚠️  Pas de mapping pour le pays: "${flag.project?.country}" (URL: ${flag.url})`);
          failCount++;
        }
      } catch (err) {
        console.error(`  ❌ Erreur item ${flag.id}: ${err.message}`);
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

migrateFlagsFinal();
