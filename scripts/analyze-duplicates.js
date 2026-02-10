// analyze-duplicates.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  console.log('🚀 Démarrage analyse des doublons...\n');

  try {
    const files = await prisma.file.findMany();
    const images = await prisma.image.findMany();
    const videos = await prisma.video.findMany();
    const documents = await prisma.document.findMany();

    console.log(`📊 Statistiques globales :`);
    console.log(`- Files (Vercel Blob): ${files.length}`);
    console.log(`- Images (Legacy): ${images.length}`);
    console.log(`- Videos (Legacy): ${videos.length}`);
    console.log(`- Documents (Legacy): ${documents.length}\n`);

    // 1. Doublons exacts dans la table File (même blobUrl)
    console.log(`🔍 1. Vérification doublons d'URL dans la table 'File'...`);
    const blobUrlCounts = {};
    files.forEach(f => {
      blobUrlCounts[f.blobUrl] = (blobUrlCounts[f.blobUrl] || 0) + 1;
    });

    const duplicateUrls = Object.entries(blobUrlCounts).filter(([url, count]) => count > 1);

    if (duplicateUrls.length > 0) {
      console.log(`   ⚠️ ${duplicateUrls.length} URLs dupliquées trouvées dans 'File'.`);
      duplicateUrls.slice(0, 5).forEach(([url, count]) => console.log(`      - ${url} (${count} fois)`));
    } else {
      console.log(`   ✅ Aucun doublon d'URL trouvé dans 'File'.`);
    }

    // 2. Doublons de contenu potentiel (Même nom + taille + projet)
    console.log(`\n🔍 2. Vérification doublons de contenu (Nom + Taille + Projet)...`);
    const contentMap = {};
    files.forEach(f => {
      const key = `${f.projectId || 'orphaned'}|${f.name}|${f.size}`;
      if (!contentMap[key]) contentMap[key] = [];
      contentMap[key].push(f);
    });

    const potentialDuplicates = Object.entries(contentMap).filter(([key, list]) => list.length > 1);

    if (potentialDuplicates.length > 0) {
      console.log(`   ⚠️ ${potentialDuplicates.length} groupes de fichiers potentiellement dupliqués.`);
      potentialDuplicates.slice(0, 5).forEach(([key, list]) => {
          const [proj, name, size] = key.split('|');
          console.log(`      - ${name} (${size} bytes) dans projet ${proj}: ${list.length} copies`);
          console.log(`        IDs: ${list.map(f => f.id).join(', ')}`);
      });
    } else {
      console.log(`   ✅ Aucun doublon de contenu apparent.`);
    }

    // 3. Vérification des orphelins (File sans projet)
    console.log(`\n🔍 3. Vérification des fichiers orphelins (sans projet)...`);
    const orphans = files.filter(f => !f.projectId);
    console.log(`   ℹ️ ${orphans.length} fichiers orphelins trouvés.`);

    // 4. Croisement avec les tables legacy
    console.log(`\n🔍 4. Croisement avec les tables Legacy (Image, Video, Document)...`);

    // Check usage of File blobs in Legacy tables
    let usedInLegacy = 0;
    const legacyUrls = new Set([
        ...images.map(i => i.url),
        ...videos.map(v => v.url),
        ...documents.map(d => d.url)
    ]);

    files.forEach(f => {
        if (legacyUrls.has(f.blobUrl)) {
            usedInLegacy++;
        }
    });

    console.log(`   ℹ️ ${usedInLegacy} fichiers de la table 'File' sont référencés dans les tables Legacy.`);
    console.log(`   ℹ️ Cela signifie que ${files.length - usedInLegacy} fichiers sont UNIQUEMENT dans la table 'File' (ou non utilisés).`);

    // Check consistency
    console.log(`\n📋 Recommandations :`);
    if (duplicateUrls.length > 0) {
        console.log(`   - 🔴 CORRUPTION BDD : Il y a des doublons d'URL unique dans la table File. Il faut nettoyer.`);
    }
    if (potentialDuplicates.length > 0) {
        console.log(`   - 🟠 NETTOYAGE : Vous avez uploadé plusieurs fois le même fichier dans le même projet.`);
        console.log(`     Vous pouvez supprimer les doublons les plus récents ou les plus anciens.`);
    }
    console.log(`   - ℹ️ MIGRATION : ${usedInLegacy} fichiers sont encore liés aux anciennes tables.`);
    console.log(`     Assurez-vous que l'application utilise bien la table 'File' avant de supprimer les anciennes tables.`);

  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyze();
