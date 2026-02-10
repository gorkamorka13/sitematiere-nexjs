const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

async function compareFolders() {
  console.log('📊 Comparaison des dossiers locaux vs Cloudinary...\n');

  try {
    const localFolders = fs.readdirSync(IMAGES_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`📁 Dossiers locaux dans public/images : ${localFolders.length}`);

    // Récupérer tous les dossiers "projets" mentionnés dans les URLs Cloudinary
    const files = await prisma.file.findMany({
      where: { blobUrl: { contains: 'cloudinary.com' } },
      select: { blobUrl: true }
    });

    const cloudinaryProjects = new Set();
    files.forEach(f => {
      const match = f.blobUrl.match(/sitematiere\/projects\/([^\/]+)\//);
      if (match) cloudinaryProjects.add(match[1]);
    });

    console.log(`☁️  Dossiers "projets" actifs sur Cloudinary : ${cloudinaryProjects.size}`);

    const missingInCloudinary = localFolders.filter(f =>
      !cloudinaryProjects.has(f) && !['flag', 'client', 'pin', 'videos'].includes(f)
    );

    console.log(`\n⚠️  Dossiers locaux non présents sur Cloudinary (car vides ou doublons) : ${missingInCloudinary.length}`);
    if (missingInCloudinary.length > 0) {
      console.log('Exemples :');
      missingInCloudinary.slice(0, 10).forEach(f => console.log(` - ${f}`));
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareFolders();
