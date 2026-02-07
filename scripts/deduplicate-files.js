// deduplicate-files.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deduplicate() {
  console.log('🚀 Démarrage de la déduplication...\n');

  try {
    const files = await prisma.file.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' } // Keep latest
    });

    console.log(`📋 Total files analyzed: ${files.length}\n`);

    // Group by Project + Name + Size
    const contentMap = {};
    files.forEach(f => {
      const key = `${f.projectId || 'orphaned'}|${f.name}|${f.size}`;
      if (!contentMap[key]) contentMap[key] = [];
      contentMap[key].push(f);
    });

    const potentialDuplicates = Object.entries(contentMap).filter(([key, list]) => list.length > 1);

    if (potentialDuplicates.length === 0) {
        console.log(`✅ Aucun doublon trouvé.`);
        return;
    }

    console.log(`⚠️ ${potentialDuplicates.length} groupes de doublons trouvés.`);

    let totalDeleted = 0;

    for (const [key, list] of potentialDuplicates) {
        // Keep the first one (which is the LATEST due to orderBy above)
        const [keep, ...duplicates] = list;
        const [proj, name, size] = key.split('|');

        console.log(`\n📂 Groupe: ${name} (${size} bytes) - Projet ID: ${proj}`);
        console.log(`   ✅ Gardé: ${keep.id} (Créé le: ${keep.createdAt})`);

        const idsToDelete = duplicates.map(d => d.id);
        console.log(`   🗑️ Suppression logique (soft-delete): ${idsToDelete.length} fichiers.`);

        // Update isDeleted = true
        await prisma.file.updateMany({
            where: { id: { in: idsToDelete } },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: 'system-dedup'
            }
        });

        totalDeleted += idsToDelete.length;
    }

    console.log(`\n🎉 Terminé ! ${totalDeleted} fichiers marqués comme supprimés.`);
    console.log(`ℹ️ Les blobs sont toujours sur Vercel. Vous pouvez les supprimer définitivement plus tard si tout fonctionne.`);

  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deduplicate();
