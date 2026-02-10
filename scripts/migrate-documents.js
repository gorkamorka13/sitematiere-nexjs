const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuration
// Note: User renamed 'public/images' to 'public/images1'
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images1');

async function migrateDocuments() {
  console.log('🚀 Démarrage de la migration des Documents (Flags/Logos/Plans)...');

  try {
    // 1. Récupérer les documents avec des URLs locales (ne commençant pas par http)
    const documents = await prisma.document.findMany({
      where: {
        NOT: {
          url: {
            startsWith: 'http'
          }
        }
      },
      include: {
        project: {
          select: { name: true }
        }
      }
    });

    console.log(`📋 ${documents.length} documents locaux trouvés à migrer.`);

    let successCount = 0;
    let failCount = 0;

    for (const doc of documents) {
      // Nettoyer l'URL stockée pour obtenir un chemin relatif correct
      // Ex stored: "/images/projet/flag.png" -> "projet/flag.png"
      // Ex stored: "images/projet/flag.png" -> "projet/flag.png"
      let cleanPath = doc.url.replace(/^\/?images\//, '').replace(/^\//, '');

      // Construire le chemin complet source
      const sourcePath = path.join(IMAGES_DIR, cleanPath);

      console.log(`\nTraitement du document ID: ${doc.id} (${doc.type})`);
      console.log(`  Projet: ${doc.project.name}`);
      console.log(`  Source estimée: ${sourcePath}`);

      if (!fs.existsSync(sourcePath)) {
        console.error(`  ❌ Fichier introuvable à l'emplacement: ${sourcePath}`);
        // Essayer sans le sous-dossier 'images' si le path était déjà relatif à public
        // Ou essayer avec 'images' si le clean a trop enlevé.
        // On tente une recherche naïve si échec
        failCount++;
        continue;
      }

      try {
        const fileContent = fs.readFileSync(sourcePath);
        const ext = path.extname(sourcePath).toLowerCase();

        // Déterminer le dossier de destination dans le Blob
        let blobFolder = 'documents/other';
        if (doc.type === 'FLAG') blobFolder = 'flags';
        if (doc.type === 'CLIENT_LOGO') blobFolder = 'clients';
        if (doc.type === 'PLAN') blobFolder = 'plans';

        // Nom du fichier sur le blob
        const blobPath = `${blobFolder}/${doc.projectId}-${doc.type.toLowerCase()}${ext}`;

        console.log(`  📤 Upload vers: ${blobPath}`);

        const blob = await put(blobPath, fileContent, {
          access: 'public',
        });

        console.log(`  ✅ Upload réussi: ${blob.url}`);

        // Mettre à jour la BDD
        await prisma.document.update({
          where: { id: doc.id },
          data: { url: blob.url }
        });

        console.log(`  ✅ Base de données mise à jour`);
        successCount++;

      } catch (uploadError) {
        console.error(`  ❌ Erreur upload/update:`, uploadError);
        failCount++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`Migration terminée.`);
    console.log(`Succès: ${successCount}`);
    console.log(`Echecs: ${failCount}`);

  } catch (error) {
    console.error('Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Vérifier token
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('❌ Erreur: BLOB_READ_WRITE_TOKEN non défini');
  process.exit(1);
}

migrateDocuments();
