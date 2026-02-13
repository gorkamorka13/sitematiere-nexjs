import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '../lib/storage/r2-client';
import { getFileUrl } from '../lib/storage/r2-operations';
import prisma from '../lib/prisma';

interface MigrationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
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

async function migrateLocalFilesToR2(
  sourceDir: string,
  updateDatabase: boolean = false
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`🔍 Scanning directory: ${sourceDir}`);

  const files = getAllFiles(sourceDir);
  console.log(`📁 Found ${files.length} files to migrate\n`);

  for (const filePath of files) {
    const relativePath = path.relative(sourceDir, filePath);
    const fileName = path.basename(filePath);

    // Déterminer la clé R2 (structure: projects/{projectId}/{filename})
    // Pour l'instant, on met tout dans un dossier "migrated"
    const r2Key = `migrated/${relativePath.replace(/\\/g, '/')}`;

    try {
      console.log(`⬆️  Uploading: ${relativePath}`);

      const newUrl = await uploadFileToR2(filePath, r2Key);

      // Mettre à jour la base de données si demandé
      if (updateDatabase) {
        // Chercher le fichier dans la DB par nom
        const oldUrl = `/images/${relativePath.replace(/\\/g, '/')}`;

        const dbFile = await prisma.file.findFirst({
          where: {
            OR: [
              { blobUrl: { contains: fileName } },
              { name: fileName },
            ],
          },
        });

        if (dbFile) {
          await prisma.file.update({
            where: { id: dbFile.id },
            data: {
              blobUrl: newUrl,
              blobPath: r2Key,
            },
          });
          console.log(`   ✅ Updated DB record for: ${fileName}`);
        } else {
          console.log(`   ⚠️  No DB record found for: ${fileName}`);
        }
      }

      result.success++;
      console.log(`   ✅ Success: ${newUrl}\n`);

    } catch (error) {
      result.failed++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({ file: relativePath, error: errorMsg });
      console.error(`   ❌ Failed: ${errorMsg}\n`);
    }
  }

  return result;
}

// Fonction principale
async function main() {
  const baseDir = path.join(process.cwd(), 'public');
  const targetDirs = ['images', 'images1', 'images-backup1'];

  const existingDirs = targetDirs
    .map(d => path.join(baseDir, d))
    .filter(d => fs.existsSync(d));

  if (existingDirs.length === 0) {
    console.error(`❌ None of the target directories found in: ${baseDir}`);
    process.exit(1);
  }

  console.log('🚀 Starting migration from local files to Cloudflare R2\n');
  console.log(`Source directories: ${existingDirs.join(', ')}`);
  console.log(`Bucket: ${R2_BUCKET_NAME}\n`);

  // Demander confirmation
  const args = process.argv.slice(2);
  const updateDb = args.includes('--update-db');
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be uploaded\n');
    let totalFilesCount = 0;
    for (const dir of existingDirs) {
      const files = getAllFiles(dir);
      console.log(`Directory ${path.basename(dir)}: ${files.length} files`);
      totalFilesCount += files.length;
    }
    console.log(`\nTotal files to upload: ${totalFilesCount}`);
    process.exit(0);
  }

  console.log(`Update database: ${updateDb ? 'YES' : 'NO'}`);
  console.log('Starting in 3 seconds... (Ctrl+C to cancel)\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  let totalSuccess = 0;
  let totalFailed = 0;
  const allErrors: Array<{ file: string; error: string }> = [];

  for (const dir of existingDirs) {
    console.log(`\n📂 Migrating directory: ${path.basename(dir)}`);
    const result = await migrateLocalFilesToR2(dir, updateDb);
    totalSuccess += result.success;
    totalFailed += result.failed;
    allErrors.push(...result.errors);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 GLOBAL MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Total Success: ${totalSuccess}`);
  console.log(`❌ Total Failed:  ${totalFailed}`);

  if (allErrors.length > 0) {
    console.log('\n❌ Total Errors:');
    allErrors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }

  await prisma.$disconnect();

  process.exit(totalFailed > 0 ? 1 : 0);
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { migrateLocalFilesToR2 };
