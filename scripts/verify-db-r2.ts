import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { R2_PUBLIC_URL } from '../lib/storage/r2-client';

async function main() {
  const baseDir = path.join(process.cwd(), 'public', 'images');
  if (!fs.existsSync(baseDir)) {
    console.error('❌ public/images not found');
    process.exit(1);
  }

  const files = fs.readdirSync(baseDir).filter(f => !fs.statSync(path.join(baseDir, f)).isDirectory());
  if (files.length === 0) {
    console.log('⚠️ No files in public/images');
    process.exit(0);
  }

  // Pick 5 random files
  const sampleFiles = files.sort(() => 0.5 - Math.random()).slice(0, 5);

  console.log('🔍 Verifying 5 sample files in DB...');

  let successCount = 0;

  for (const fileName of sampleFiles) {
    const dbFile = await prisma.file.findFirst({
      where: {
        OR: [
          { blobUrl: { contains: fileName } },
          { name: fileName },
        ],
      },
    });

    if (!dbFile) {
      console.log(`❌ DB Record NOT FOUND for: ${fileName}`);
      continue;
    }

    const isR2 = dbFile.blobPath?.startsWith('migrated/') || dbFile.blobUrl?.includes('r2.cloudflarestorage.com') || (R2_PUBLIC_URL && dbFile.blobUrl?.includes(R2_PUBLIC_URL));

    if (isR2) {
      console.log(`✅ OK: ${fileName} -> ${dbFile.blobUrl}`);
      successCount++;
    } else {
      console.log(`❌ FAIL: ${fileName} -> ${dbFile.blobUrl} (Not pointing to R2/migrated)`);
    }
  }

  console.log(`\nVerification Result: ${successCount}/${sampleFiles.length} passed.`);

  if (successCount === sampleFiles.length) {
    console.log('✨ SUCCESS: DB records updated correctly.');
  } else {
    console.log('⚠️ WARNING: Some DB records might not be updated.');
  }
}

main().catch(console.error);
