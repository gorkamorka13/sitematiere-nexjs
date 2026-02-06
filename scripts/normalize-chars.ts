import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const charMap: Record<string, string> = {
  // Accents E
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
  // Accents A
  'à': 'a', 'â': 'a', 'ä': 'a', 'À': 'A', 'Â': 'A', 'Ä': 'A',
  // Accents I
  'î': 'i', 'ï': 'i', 'Î': 'I', 'Ï': 'I',
  // Accents O
  'ô': 'o', 'ö': 'o', 'Ô': 'O', 'Ö': 'O',
  // Accents U
  'û': 'u', 'ü': 'u', 'Û': 'U', 'Ü': 'U',
  // C cédille
  'ç': 'c', 'Ç': 'C',
  // Ligatures
  'œ': 'oe', 'Œ': 'OE',
  // Ponctuation spéciale
  '’': "'",
  '–': '-',
  '—': '-',
  '°': ' deg',
  '®': '(R)',
  '€': 'EUR',
};

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
  let totalCharsReplaced = 0;

  for (const project of projects) {
    if (!project.description) continue;

    let updatedDescription = project.description;
    let hasChanges = false;
    let replacedInThisProject = 0;

    // Remplacer chaque caractère selon le mapping
    for (const [special, replacement] of Object.entries(charMap)) {
      if (updatedDescription.includes(special)) {
        const count = (updatedDescription.match(new RegExp(special, 'g')) || []).length;
        updatedDescription = updatedDescription.split(special).join(replacement);
        hasChanges = true;
        replacedInThisProject += count;
      }
    }

    if (hasChanges) {
      console.log(`Projet: ${project.name} (${project.id})`);
      console.log(`- ${replacedInThisProject} caractères à remplacer.`);

      if (!isDryRun) {
        await prisma.project.update({
          where: { id: project.id },
          data: { description: updatedDescription },
        });
      }
      totalUpdated++;
      totalCharsReplaced += replacedInThisProject;
    }
  }

  console.log(`\nTraitement terminé.`);
  console.log(`Nombre de projets identifiés pour normalisation: ${totalUpdated}`);
  console.log(`Nombre total de caractères normalisés: ${totalCharsReplaced}`);

  if (isDryRun && totalUpdated > 0) {
    console.log('\nPour appliquer ces changements, relancez le script avec:');
    console.log('npx tsx scripts/normalize-chars.ts --commit');
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
