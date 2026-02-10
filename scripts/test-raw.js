const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configuration Cloudinary
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testRawUpload() {
  const localPath = path.join(process.cwd(), 'public', 'images1', 'magbele', 'magbele.pdf');
  console.log(`🚀 Test Upload RAW: ${localPath}`);

  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder: 'sitematiere/projects/magbele',
      public_id: 'magbele',
      resource_type: 'raw',
      overwrite: true
    });

    console.log('✅ SUCCESS!');
    console.log(`🔗 URL: ${result.secure_url}`);
  } catch (err) {
    console.error('❌ FAILED:', err);
  }
}

testRawUpload();
