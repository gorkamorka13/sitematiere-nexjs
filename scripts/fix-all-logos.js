const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllLogos() {
  const SLRA_URL = 'https://res.cloudinary.com/dklzpatsp/image/upload/v1770502202/sitematiere/clients/slra.jpg';
  const AGEROUTE_RCI_URL = 'https://res.cloudinary.com/dklzpatsp/image/upload/v1770502190/sitematiere/clients/agerouterci.jpg';
  const AGEROUTE_SN_URL = 'https://res.cloudinary.com/dklzpatsp/image/upload/v1770502191/sitematiere/clients/ageroutesenegal.jpg';

  console.log('🔧 Correction globale des logos par pays...\n');

  try {
    // 1. SIERRA LEONE -> SLRA
    const slUpdate = await prisma.document.updateMany({
      where: {
        type: 'CLIENT_LOGO',
        project: { country: { contains: 'Sierra', mode: 'insensitive' } },
        url: { not: { contains: 'cloudinary.com' } }
      },
      data: { url: SLRA_URL }
    });
    console.log(`✅ Sierra Leone : ${slUpdate.count} logos mis à jour (SLRA).`);

    // 2. RCI -> AGEROUTE RCI
    const rciUpdate = await prisma.document.updateMany({
      where: {
        type: 'CLIENT_LOGO',
        project: { country: { in: ['RCI', 'Ivory Coast', 'Côte d\'Ivoire'], mode: 'insensitive' } },
        url: { not: { contains: 'cloudinary.com' } }
      },
      data: { url: AGEROUTE_RCI_URL }
    });
    console.log(`✅ RCI : ${rciUpdate.count} logos mis à jour (Ageroute RCI).`);

    // 3. SÉNÉGAL -> AGEROUTE SN
    const snUpdate = await prisma.document.updateMany({
      where: {
        type: 'CLIENT_LOGO',
        project: { country: { contains: 'Sénégal', mode: 'insensitive' } },
        url: { not: { contains: 'cloudinary.com' } }
      },
      data: { url: AGEROUTE_SN_URL }
    });
    console.log(`✅ Sénégal : ${snUpdate.count} logos mis à jour (Ageroute SN).`);

    // Final Check: List all logos
    console.log('\n📋 État actuel des logos clients :');
    const allLogos = await prisma.document.findMany({
      where: { type: 'CLIENT_LOGO' },
      select: { url: true, project: { select: { name: true, country: true } } }
    });

    allLogos.forEach(l => {
      console.log(`- ${l.project.name} (${l.project.country}): ${l.url}`);
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllLogos();
