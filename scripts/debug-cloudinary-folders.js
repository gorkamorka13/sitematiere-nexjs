const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCloudinaryPaths() {
  console.log('🔍 Extraction des chemins Cloudinary depuis la DB...\n');

  try {
    const files = await prisma.file.findMany({
      where: { blobUrl: { contains: 'cloudinary.com' } },
      select: { blobUrl: true, name: true }
    });

    const docs = await prisma.document.findMany({
      where: { url: { contains: 'cloudinary.com' } },
      select: { url: true }
    });

    const allUrls = [
      ...files.map(f => f.blobUrl),
      ...docs.map(d => d.url)
    ];

    console.log(`Total URLs Cloudinary : ${allUrls.length}`);

    const folders = new Set();
    allUrls.forEach(url => {
        // Example URL: https://res.cloudinary.com/dklzpatsp/image/upload/v1770501723/sitematiere/projects/allanoquoich/allanoquoich1.jpg
        // We want everything between 'sitematiere/' and the last '/'
        const match = url.match(/sitematiere\/(.+)\/[^\/]+$/);
        if (match) {
            folders.add(match[1]);
        }
    });

    console.log(`\nDossiers uniques trouvés dans les URLs : ${folders.size}`);
    const sortedFolders = Array.from(folders).sort();

    console.log('\nListe complète des dossiers :');
    sortedFolders.forEach(f => console.log(` - ${f}`));

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCloudinaryPaths();
