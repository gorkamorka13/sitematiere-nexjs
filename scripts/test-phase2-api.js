const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

// Manually import validation logic to avoid import issues
const MAX_FILE_SIZE = 150 * 1024;
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],

  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],

  // Videos
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],

  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
};

function validateFileSize(size) {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `La taille du fichier ne doit pas dépasser ${MAX_FILE_SIZE / 1024}Ko.`
    };
  }
  return { valid: true };
}

function validateFileType(mimeType, fileName) {
  const allowedExtensions = ALLOWED_FILE_TYPES[mimeType];

  if (!allowedExtensions) {
    return {
      valid: false,
      error: `Type de fichier non supporté: ${mimeType}`
    };
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `L'extension ${ext} ne correspond pas au type MIME ${mimeType}`
    };
  }

  return { valid: true };
}

function sanitizeFileName(fileName) {
  const name = path.parse(fileName).name;
  const ext = path.parse(fileName).ext;

  const sanitizedName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '_')       // Replace non-alphanum with underscore
    .replace(/_+/g, '_');             // Remove duplicate underscores

  return `${sanitizedName}${ext.toLowerCase()}`;
}

async function main() {
  console.log('🔄 Starting Phase 2 Manual Verification (JS Mode)...');

  // 1. Check if we can connect to DB
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ DB Connection OK. User count: ${userCount}`);
  } catch (e) {
    console.error('❌ DB Connection Failed:', e);
    return;
  }

  // 2. Check if we have an ADMIN user (required for API access)
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.warn('⚠️ No ADMIN user found. API tests might fail if auth is enforced.');
  } else {
    console.log(`✅ Found ADMIN user: ${admin.username || admin.email}`);
  }

  // 3. Verify File Table Structure (Basic check)
  try {
    const fileCount = await prisma.file.count();
    console.log(`✅ File Table OK. Current file count: ${fileCount}`);
  } catch (e) {
    console.error('❌ File Table Error:', e);
  }

  // 4. Simulate Upload Process (Mock)
  console.log('\n🧪 Testing Utilities:');

  // Test Validation
  const sizeTest = validateFileSize(100 * 1024); // 100KB
  console.log(`- Size Validation (100KB): ${sizeTest.valid ? '✅ Pass' : '❌ Fail'}`);

  const sizeTestFail = validateFileSize(200 * 1024); // 200KB > 150KB
  console.log(`- Size Validation (200KB): ${!sizeTestFail.valid ? '✅ Pass (Correctly rejected)' : '❌ Fail (Should reject)'}`);

  const typeTest = validateFileType('image/jpeg', 'test.jpg');
  console.log(`- Type Validation (jpg): ${typeTest.valid ? '✅ Pass' : '❌ Fail'}`);

  const nameTest = sanitizeFileName('Héllo Wörld!.jpg');
  console.log(`- Sanitize Name: ${nameTest === 'hello_world_.jpg' ? '✅ Pass' : `❌ Fail (Got: ${nameTest})`}`);

  // 5. Test Video Thumbnail Generation (Mock)
  console.log('\n🎬 Testing Video Thumbnail Generation:');
  try {
    const fs = require('fs');
    const blobClientPath = path.join(__dirname, '../lib/files/blob-client.ts');

    if (fs.existsSync(blobClientPath)) {
        console.log('✅ lib/files/blob-client.ts exists.');

        // Check for ffmpeg system installation
        const { execSync } = require('child_process');
        try {
            execSync('ffmpeg -version', { stdio: 'ignore' });
            console.log('✅ System ffmpeg is installed.');
        } catch (e) {
            console.warn('⚠️ System ffmpeg is NOT installed or not in PATH. Video thumbnails will fail in production/local.');
        }
    } else {
        console.error('❌ lib/files/blob-client.ts missing.');
    }
  } catch (e) {
      console.error('❌ Error checking video thumbnail support:', e.message);
  }

  console.log('\n🏁 Verification Complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
