import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting Phase 2 Manual Verification...');

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
  // This verifies our utility logic works in a Node environment
  const { validateFileSize, validateFileType, sanitizeFileName } = require('../lib/files/validation');

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
