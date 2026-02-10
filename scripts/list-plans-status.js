const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function listPlans() {
  console.log('📋 Listing des Plans de Projet (PDF) - Chemins locaux\n');

  try {
    const plans = await prisma.document.findMany({
      where: {
        type: 'PLAN',
        url: { startsWith: 'images1/' }
      },
      select: {
        url: true,
        name: true,
        project: { select: { name: true, country: true } }
      },
      orderBy: { project: { name: 'asc' } }
    });

    console.log(`Nombre total de plans en local : ${plans.length}\n`);
    console.log('Projet | Nom du Plan | URL | Statut Fichier');
    console.log('-'.repeat(80));

    for (const plan of plans) {
      const fullPath = path.join(process.cwd(), 'public', plan.url);
      const exists = fs.existsSync(fullPath);
      const status = exists ? '✅ Présent' : '❌ MANQUANT (404)';

      console.log(`${plan.project.name} (${plan.project.country}) | ${plan.name} | ${plan.url} | ${status}`);
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listPlans();
