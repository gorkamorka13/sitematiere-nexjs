const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeResourceTypes() {
  console.log('📊 Analyse des types de ressources Cloudinary...\n');

  try {
    const files = await prisma.file.findMany({
      where: { blobUrl: { contains: 'cloudinary.com' } },
      select: { blobUrl: true }
    });

    const docs = await prisma.document.findMany({
      where: { url: { contains: 'cloudinary.com' } },
      select: { url: true }
    });

    const allUrls = [
      ...files.map(f => f.blobUrl),
      ...docs.map(d => d.url)
    ];

    const types = {
        image: 0,
        video: 0,
        raw: 0,
        unknown: 0
    };

    allUrls.forEach(url => {
        if (url.includes('/image/upload/')) types.image++;
        else if (url.includes('/video/upload/')) types.video++;
        else if (url.includes('/raw/upload/')) types.raw++;
        else types.unknown++;
    });

    console.log('Répartition des types dans la DB :');
    console.log(` - 🖼️  Images : ${types.image}`);
    console.log(` - 🎥 Vidéos : ${types.video}`);
    console.log(` - 📄 PDF / Raw : ${types.raw}`);
    if (types.unknown > 0) console.log(` - ❓ Inconnus : ${types.unknown}`);

    console.log('\n💡 Conseil Cloudinary UI :');
    console.log('Dans le Media Library, vérifiez le menu à gauche ou le filtre en haut.');
    console.log('Cloudinary sépare souvent l\'affichage des Images, Vidéos et Raw.');

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeResourceTypes();
