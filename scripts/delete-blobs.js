// delete-blobs.js
const { PrismaClient } = require('@prisma/client');
const { del } = require('@vercel/blob');
require('dotenv').config();

const prisma = new PrismaClient();

async function deleteBlobs() {
  console.log('🚀 Démarrage de la suppression définitive automatique...\n');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Erreur: BLOB_READ_WRITE_TOKEN manquant dans .env');
    return;
  }

  try {
    while (true) {
        // Fetch soft-deleted files
        const filesToDelete = await prisma.file.findMany({
            where: { isDeleted: true },
            take: 50 // Keep batch size small but process in loop
        });

        if (filesToDelete.length === 0) {
            console.log(`✅ Aucun fichier en attente de suppression. Tout est propre !`);
            break;
        }

        console.log(`📋 Traitement d'un lot de ${filesToDelete.length} fichiers...`);

        for (const file of filesToDelete) {
            process.stdout.write(`🗑️ Suppression: ${file.name} (ID: ${file.id}) `);

            try {
                // Delete from Vercel Blob
                try {
                    await del(file.blobUrl);
                } catch (blobErr) {
                    process.stdout.write(`Warning Blob: ${blobErr.message} `);
                }

                // Delete from Database
                await prisma.file.delete({
                    where: { id: file.id }
                });

                console.log(`✅ OK`);
            } catch (err) {
                if (err.code === 'P2025') {
                    console.log(`ℹ️ Déjà supprimé de la DB.`);
                } else {
                    console.error(`❌ Erreur: ${err.message}`);
                }
            }
        }

        // Small delay if needed? Nah, just loop.
    }

  } catch (error) {
    console.error("Erreur générale:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBlobs();
