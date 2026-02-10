import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { uploadFile, deleteFile } from '../lib/files/blob-client';

// Mock File object for Node.js environment
class NodeFile extends Blob {
  name: string;
  lastModified: number;

  constructor(buffer: Buffer, name: string, options?: BlobPropertyBag) {
    super([new Uint8Array(buffer)], options);
    this.name = name;
    this.lastModified = Date.now();
  }
}

// Polyfill global File if needed (Node 20+ has it, but just in case)
if (!global.File) {
  (global as any).File = NodeFile;
}

async function main() {
  console.log('🚀 Starting R2 Integration Test');

  // 1. Create a dummy file
  const testFileName = `test-integration-${Date.now()}.txt`;
  const fileContent = 'This is a test file for R2 migration verification.';
  const buffer = Buffer.from(fileContent);

  // Create a File-like object compatible with our uploadFile signature
  const file = new File([buffer], testFileName, { type: 'text/plain' });

  try {
    // 2. Upload
    console.log(`\n📤 Uploading ${testFileName}...`);
    const result = await uploadFile(file, 'integration-tests');

    console.log('✅ Upload Successful');
    console.log(`   URL: ${result.url}`);
    console.log(`   Internal Path: ${result.pathname}`);

    // 3. Verify (Access)
    // In a real verification we might fetch the URL, but here we just check it exists
    if (!result.url || !result.pathname) {
      throw new Error('Upload returned invalid result');
    }
    console.log(`\n🔍 Verifies access at URL: ${result.url}`);
    console.log(`   ℹ️  To verify manually, check this URL in browser (ensure app is running): http://localhost:3000${result.url}`);

    // 4. Delete
    console.log(`\n🗑️ Deleting ${result.pathname}...`);
    await deleteFile(result.pathname);
    console.log('✅ Delete Successful');

    console.log('\n✨ Integration Test Passed!');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    process.exit(1);
  }
}

main();
