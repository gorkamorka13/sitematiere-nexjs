// verify-clean.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const deletedCount = await prisma.file.count({ where: { isDeleted: true } });
    const totalCount = await prisma.file.count();

    console.log(`\n📊 Status de la base de données:`);
    console.log(`   - Fichiers marqués supprimés: ${deletedCount}`);
    console.log(`   - Fichiers totaux: ${totalCount}`);

    if (deletedCount === 0) {
        console.log(`\n🎉 TERMINÉ: Il n'y a plus aucun fichier marqué comme 'supprimé'. La base est propre.`);
    } else {
        console.log(`\n⏳ EN COURS: Il reste ${deletedCount} fichiers à supprimer.`);
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
