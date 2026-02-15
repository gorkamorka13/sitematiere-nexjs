/**
 * Test de connexion Cloudflare R2
 * Phase 1 - Setup & Configuration
 */

import { r2Client, R2_BUCKET_NAME } from '../storage/r2-client';
import { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

export async function testR2Connection(): Promise<{ success: boolean; message: string }> {
  try {
    // Test 1: Vérifier credentials configurés
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return {
        success: false,
        message: '❌ R2 credentials non configurés',
      };
    }

    // Test 2: Lister fichiers (test lecture)
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listResult = await (r2Client as any).send(listCommand);
    console.log('✅ Connexion lecture OK -', listResult.KeyCount || 0, 'fichiers trouvés');

    // Test 3: Upload fichier test (test écriture)
    const testContent = Buffer.from('Test connexion Cloudflare R2 - ' + new Date().toISOString());
    const testKey = 'test/connection-test.txt';

    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (r2Client as any).send(putCommand);
    console.log('✅ Upload test OK - Key:', testKey);

    // Test 4: Supprimer fichier test (test suppression)
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (r2Client as any).send(deleteCommand);
    console.log('✅ Suppression test OK');

    return {
      success: true,
      message: '✅ Connexion Cloudflare R2 opérationnelle (lecture/écriture/suppression)',
    };
  } catch (error) {
    console.error('❌ Erreur connexion R2:', error);
    return {
      success: false,
      message: `❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }
}

// Exécuter test si appelé directement
if (require.main === module) {
  testR2Connection().then((result) => {
    console.log('\n' + result.message);
    process.exit(result.success ? 0 : 1);
  });
}
