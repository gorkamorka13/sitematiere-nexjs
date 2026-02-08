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

async function fixMagbelePdf() {
  console.log('🛠️  Tentative de re-upload du PDF Magbele en tant que RAW...\n');

  try {
    // 1. Trouver le fichier local
    const localPath = path.join(process.cwd(), 'public', 'images1', 'magbele', 'magbele.pdf');

    if (!fs.existsSync(localPath)) {
       // On essaie plan.pdf
       const altPath = path.join(process.cwd(), 'public', 'images1', 'magbele', 'plan.pdf');
       if (!fs.existsSync(altPath)) {
         console.error('❌ Fichier local introuvable.');
         return;
       }
    }

    const publicId = 'sitematiere/projects/magbele/magbele'; // On garde le même ID mais change de type

    console.log(`📤 Uploading ${localPath} as RAW...`);
    const result = await cloudinary.uploader.upload(localPath, {
      folder: 'sitematiere/projects/magbele',
      public_id: 'magbele', // public_id for raw includes extension or not? Yes, usually better to include it for raw
      resource_type: 'raw',
      overwrite: true
    });

    console.log('✅ Upload réussi:');
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Resource Type: ${result.resource_type}`);

    // Update DB
    const updateResult = await prisma.file.updateMany({
      where: { name: { contains: 'magbele.pdf', mode: 'insensitive' } },
      data: { blobUrl: result.secure_url }
    });

    console.log(`\n📝 DB Mise à jour (${updateResult.count} records).`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMagbelePdf();
