import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.length === 0;

  if (isDryRun) {
    console.log('--- MODE SIMULATION (DRY RUN) ---');
    console.log('Aucune modification ne sera apportée à la base de données.');
    console.log('Lancez avec --commit pour appliquer les changements.\n');
  } else {
    console.log('--- MODE RÉEL (COMMIT) ---');
    console.log('Application des changements en cours...\n');
  }

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  let totalUpdated = 0;

  for (const project of projects) {
    if (!project.description) continue;

    // Chercher la séquence littérale \n (antislash suivi de n)
    if (project.description.includes('\\n')) {
      const updatedDescription = project.description.replace(/\\n/g, '\n');

      console.log(`Projet: ${project.name} (${project.id})`);
      console.log('Ancienne description (extrait):', project.description.substring(0, 50).replace(/\n/g, '\\n'), '...');
      console.log('Nouvelle description (extrait):', updatedDescription.substring(0, 50).replace(/\n/g, '\\n'), '...');
      console.log('-----------------------------------');

      if (!isDryRun) {
        await prisma.project.update({
          where: { id: project.id },
          data: { description: updatedDescription },
        });
      }
      totalUpdated++;
    }
  }

  console.log(`\nTraitement terminé.`);
  console.log(`Nombre de projets identifiés pour mise à jour: ${totalUpdated}`);

  if (isDryRun && totalUpdated > 0) {
    console.log('\nPour appliquer ces changements, relancez le script avec:');
    console.log('npx tsx scripts/cleanup-descriptions.ts --commit');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
