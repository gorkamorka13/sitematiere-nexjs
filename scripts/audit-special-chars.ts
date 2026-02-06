import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- AUDIT DES CARACTÈRES SPÉCIAUX ---');

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  const specialChars = new Map<string, number>();
  const projectMatches: { name: string, chars: string[] }[] = [];

  // Regex pour détecter les caractères non-ASCII ou spécifiques (accents, etc.)
  // On inclut les caractères accentués courants et les apostrophes spéciales
  const specialRegex = /[^\x00-\x7F]/g;

  for (const project of projects) {
    if (!project.description) continue;

    const matches = project.description.match(specialRegex);
    if (matches) {
      const uniqueMatches = Array.from(new Set(matches));
      projectMatches.push({ name: project.name, chars: uniqueMatches });

      matches.forEach(char => {
        specialChars.set(char, (specialChars.get(char) || 0) + 1);
      });
    }
  }

  console.log('\nStatistiques des caractères spéciaux trouvés :');
  console.log('-------------------------------------------');
  const sortedChars = Array.from(specialChars.entries()).sort((a, b) => b[1] - a[1]);
  sortedChars.forEach(([char, count]) => {
    console.log(`Caractère: "${char}" (Unicode: ${char.charCodeAt(0).toString(16)}) -> ${count} occurrences`);
  });

  console.log('\nExemples de projets touchés :');
  console.log('---------------------------');
  projectMatches.slice(0, 10).forEach(p => {
    console.log(`- ${p.name}: [${p.chars.join(', ')}]`);
  });

  if (projectMatches.length > 10) {
    console.log(`... et ${projectMatches.length - 10} autres projets.`);
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
