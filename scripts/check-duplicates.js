const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('Checking for duplicate projects...');
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, country: true }
  });

  const nameCounts = {};
  projects.forEach(p => {
    const key = `${p.name} (${p.country})`;
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  });

  const duplicates = Object.entries(nameCounts).filter(([_, count]) => count > 1);

  if (duplicates.length > 0) {
    console.log('Found duplicates:', duplicates);

    for (const [key, _] of duplicates) {
        // Find all projects with this name/country
        // Note: key format is "Name (Country)"
        const name = key.split(' (')[0];
        const country = key.split(' (')[1].slice(0, -1);

        const dups = await prisma.project.findMany({
            where: { name, country },
            include: { documents: true }
        });

        dups.forEach(d => {
            console.log(`Project ID: ${d.id}`);
            console.log(`  Name: ${d.name}`);
            console.log(`  Country: ${d.country}`);
            d.documents.forEach(doc => {
                 console.log(`    - Document: ${doc.type} ${doc.name} (URL: ${doc.url})`);
            });
        });
    }

  } else {
    console.log('No duplicate projects found.');
  }
}

checkDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
