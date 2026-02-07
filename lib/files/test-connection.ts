/**
 * Test de connexion Vercel Blob
 * Phase 1 - Setup & Configuration
 */

import { list, put, del } from '@vercel/blob';

export async function testBlobConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Test 1: Vérifier token configuré
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        success: false,
        message: '❌ BLOB_READ_WRITE_TOKEN non configuré',
      };
    }

    // Test 2: Lister fichiers (test lecture)
    const { blobs } = await list({ limit: 1 });
    console.log('✅ Connexion lecture OK -', blobs.length, 'fichiers trouvés');

    // Test 3: Upload fichier test (test écriture)
    const testContent = Buffer.from('Test connexion Vercel Blob - ' + new Date().toISOString());
    const testBlob = await put('test/connection-test.txt', testContent, {
      access: 'public',
      contentType: 'text/plain',
    });

    console.log('✅ Upload test OK - URL:', testBlob.url);

    // Test 4: Supprimer fichier test (test suppression)
    await del(testBlob.url);
    console.log('✅ Suppression test OK');

    return {
      success: true,
      message: '✅ Connexion Vercel Blob opérationnelle (lecture/écriture/suppression)',
    };
  } catch (error) {
    console.error('❌ Erreur connexion Blob:', error);
    return {
      success: false,
      message: `❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }
}

// Exécuter test si appelé directement
if (require.main === module) {
  testBlobConnection().then((result) => {
    console.log('\n' + result.message);
    process.exit(result.success ? 0 : 1);
  });
}
