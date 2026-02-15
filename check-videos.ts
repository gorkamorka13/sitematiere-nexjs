import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const videoCount = await prisma.video.count();
    const videos = await prisma.video.findMany({
      include: {
        project: {
          select: { name: true }
        }
      }
    });

    console.log(`Nombre total de vidéos : ${videoCount}`);
    if (videoCount > 0) {
      console.log('Liste des vidéos :');
      videos.forEach(v => {
        console.log(`- [${v.project.name}] ${v.title} (${v.url})`);
      });
    }

    const imageCount = await prisma.image.count();
    console.log(`Nombre total d'images : ${imageCount}`);

  } catch (error) {
    console.error('Erreur lors de la lecture de la base de données :', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
