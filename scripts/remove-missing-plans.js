const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function removeMissingPlans() {
  console.log('🗑️  Suppression des plans de projets manquants (404)...\n');

  try {
    const plans = await prisma.document.findMany({
      where: {
        type: 'PLAN',
        url: { startsWith: 'images1/' }
      },
      select: {
        id: true,
        url: true,
        name: true,
        project: { select: { name: true } }
      }
    });

    let deleteCount = 0;
    let skipCount = 0;

    for (const plan of plans) {
      const fullPath = path.join(process.cwd(), 'public', plan.url);

      if (!fs.existsSync(fullPath)) {
        console.log(`❌ Suppression: ${plan.project.name} - ${plan.name} (${plan.url})`);
        await prisma.document.delete({
          where: { id: plan.id }
        });
        deleteCount++;
      } else {
        console.log(`✅ Fichier présent, conservation: ${plan.project.name} - ${plan.name}`);
        skipCount++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`Action terminée.`);
    console.log(`🗑️  Records supprimés : ${deleteCount}`);
    console.log(`🛡️  Records conservés : ${skipCount}`);

  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeMissingPlans();
