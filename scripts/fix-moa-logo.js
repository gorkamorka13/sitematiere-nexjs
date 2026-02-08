const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMoaLogo() {
  const SLRA_URL = 'https://res.cloudinary.com/dklzpatsp/image/upload/v1770502202/sitematiere/clients/slra.jpg';

  console.log('🔧 Correction du logo pour le projet Moa...\n');

  try {
    const moa = await prisma.project.findFirst({
      where: { name: 'Moa' }
    });

    if (moa) {
      const updateResult = await prisma.document.updateMany({
        where: {
          projectId: moa.id,
          type: 'CLIENT_LOGO'
        },
        data: { url: SLRA_URL }
      });
      console.log(`✅ Moa mis à jour (${updateResult.count} document(s)). URL: ${SLRA_URL}`);
    } else {
      console.log('⚠️ Projet "Moa" non trouvé.');
    }

    // Fix other Sierra Leone projects that might have broken logos
    const slProjects = await prisma.project.findMany({
      where: {
        country: { contains: 'Sierra', mode: 'insensitive' },
        name: { not: 'Moa' }
      }
    });

    for (const p of slProjects) {
       // Check if they have a local images1 path (which we know is mostly broken for these projects)
       const docs = await prisma.document.findMany({
         where: { projectId: p.id, type: 'CLIENT_LOGO', url: { contains: 'images1/client/' } }
       });

       if (docs.length > 0) {
         await prisma.document.updateMany({
           where: { projectId: p.id, type: 'CLIENT_LOGO' },
           data: { url: SLRA_URL }
         });
         console.log(`✅ Projet ${p.name} mis à jour avec SLRA logo.`);
       }
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMoaLogo();
