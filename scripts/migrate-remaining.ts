import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '../lib/storage/r2-client';
import { getFileUrl } from '../lib/storage/r2-operations';
import prisma from '../lib/prisma';

interface MigrationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
}

async function listAllR2Keys(prefix: string): Promise<Set<string>> {
  const keys = new Set<string>();
  let continuationToken: string | undefined;

  console.log('📡 Fetching existing files list from R2...');

  do {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await r2Client.send(command);
    response.Contents?.forEach((item) => {
      if (item.Key) keys.add(item.Key);
    });

    continuationToken = response.NextContinuationToken;
    process.stdout.write(`\r   Found ${keys.size} files so far...`);
  } while (continuationToken);

  console.log(`\n   ✅ Total existing files in R2: ${keys.size}\n`);
  return keys;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.zip': 'application/zip',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

async function uploadFileToR2(filePath: string, r2Key: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = getMimeType(filePath);

  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));

  return getFileUrl(r2Key);
}

async function main() {
  const baseDir = path.join(process.cwd(), 'public');
  const targetDirName = 'images'; // ONLY public/images as requested
  const sourceDir = path.join(baseDir, targetDirName);

  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  console.log('🚀 Starting selective migration for public/images');
  console.log(`Source: ${sourceDir}`);
  console.log(`Bucket: ${R2_BUCKET_NAME}\n`);

  const args = process.argv.slice(2);
  const updateDb = args.includes('--update-db');
  const dryRun = args.includes('--dry-run');

  // 1. Get List of all files in R2 under 'migrated/'
  const existingR2Keys = await listAllR2Keys('migrated/');

  // 2. Scan local files
  console.log(`🔍 Scanning local directory: ${targetDirName}`);
  const files = getAllFiles(sourceDir);
  console.log(`📁 Found ${files.length} local files\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN MODE\n');
  } else {
    console.log(`Update database: ${updateDb ? 'YES' : 'NO'}`);
    console.log('Starting in 3 seconds... (Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const result: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (const filePath of files) {
    const relativePath = path.relative(sourceDir, filePath);
    const fileName = path.basename(filePath);

    // Normalized key format matching previous script
    const r2Key = `migrated/${relativePath.replace(/\\/g, '/')}`;

    const existsInR2 = existingR2Keys.has(r2Key);

    if (existsInR2) {
      result.skipped++;
      if (dryRun) {
        console.log(`   ⏭️  Skipping (already exists): ${relativePath}`);
      }
    } else {
      if (dryRun) {
        console.log(`   ⬆️  Would upload: ${relativePath}`);
        result.success++; // Count as success for dry run stats
      } else {
        try {
          console.log(`   ⬆️  Uploading: ${relativePath}`);
          await uploadFileToR2(filePath, r2Key);
          result.success++;
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown';
          result.errors.push({ file: relativePath, error: errorMsg });
          console.error(`   ❌ Failed: ${errorMsg}`);
          continue; // Skip DB update if upload failed
        }
      }
    }

    // DB Update Logic (Run if not dryRun and upload didn't fail)
    if (updateDb && !dryRun) {
      // We need the URL whether it was just uploaded or pre-existing
      // Since we know the key, we can construct the URL
      const newUrl = getFileUrl(r2Key);

      try {
        const dbFile = await prisma.file.findFirst({
          where: {
            OR: [
              { blobUrl: { contains: fileName } },
              { name: fileName },
            ],
          },
        });

        if (dbFile) {
          // Update the record to point to R2
          await prisma.file.update({
            where: { id: dbFile.id },
            data: {
              blobUrl: newUrl,
              blobPath: r2Key,
            },
          });
          // console.log(`      ✅ Updated DB record`); // Optional: reduce noise
        }
      } catch (err) {
        console.error(`      ⚠️ DB Update failed: ${err}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Uploaded/To Upload: ${result.success}`);
  console.log(`⏭️  Skipped (Existing): ${result.skipped}`);
  console.log(`❌ Failed:             ${result.failed}`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(e => console.log(` - ${e.file}: ${e.error}`));
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
